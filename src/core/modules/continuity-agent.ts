import type {
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  CharacterHistory,
  ContinuityIssue,
  ContinuityReport,
  ChronologyLedger,
  OpenLoopEntry,
  OpenLoopsLedger,
  SettlementBundle,
  WorldRulesConfig,
} from "../types.js";

interface ContinuityInput {
  readonly chapterNumber: number;
  readonly draft: ChapterDraft;
  readonly plan: ChapterPlan;
  readonly analysis: ChapterAnalysisBundle;
  readonly settlement: SettlementBundle;
  readonly previousChronology: ChronologyLedger;
  readonly previousOpenLoops: OpenLoopsLedger;
  readonly previousCharacterHistory: ReadonlyArray<CharacterHistory>;
  readonly worldRules: WorldRulesConfig;
}

const GENERIC_FORCE_SIGNAL = /制度|规则|环境|现实|安全感|危险|资源|局势/u;
const KEYWORD_SPLIT = /[，。！？；、“”‘’\s:：,.;!?()（）\-]+/u;

function extractKeywords(text: string): ReadonlyArray<string> {
  return Array.from(
    new Set(
      text
        .split(KEYWORD_SPLIT)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length >= 2),
    ),
  ).slice(0, 8);
}

function collectSceneNumbers(plan: ChapterPlan, analysis: ChapterAnalysisBundle, settlement: SettlementBundle): {
  readonly planned: ReadonlyArray<number>;
  readonly analyzed: ReadonlyArray<number>;
  readonly settled: ReadonlyArray<number>;
} {
  return {
    planned: plan.sceneBlueprint.map((scene) => scene.sceneNumber),
    analyzed: analysis.scenes.map((scene) => scene.sceneNumber),
    settled: settlement.chapterStateDelta.chronologyInsertions.map((event) => event.sceneNumber).filter((value): value is number => value !== null),
  };
}

function buildChapterSignals(input: ContinuityInput): string {
  return [
    input.draft.content,
    input.settlement.chapterSummary.summary,
    ...input.settlement.chapterSummary.keyEvents,
    ...input.settlement.chapterStateDelta.stateHighlights,
    ...input.settlement.chapterStateDelta.chronologyInsertions.flatMap((event) => [event.summary, event.consequence]),
  ].join("\n");
}

function shouldTrackCharacter(name: string): boolean {
  return name.trim().length > 0 && !GENERIC_FORCE_SIGNAL.test(name);
}

function createIssue(issue: ContinuityIssue): ContinuityIssue {
  return issue;
}

function detectSceneCoverageIssues(input: ContinuityInput): ReadonlyArray<ContinuityIssue> {
  const { planned, analyzed, settled } = collectSceneNumbers(input.plan, input.analysis, input.settlement);
  const issues: ContinuityIssue[] = [];
  const analyzedSet = new Set(analyzed);
  const settledSet = new Set(settled);

  for (const sceneNumber of planned) {
    if (!analyzedSet.has(sceneNumber)) {
      issues.push(
        createIssue({
          code: "scene_coverage_conflict",
          severity: "high",
          scope: "scene",
          sceneNumber,
          refs: [`scene-${sceneNumber}`],
          message: `计划中的场景 ${sceneNumber} 没有在本章分析结果里出现。`,
          recommendation: "回查 writer 或 revise 输出，确认这个场景是否被漏写、合并或被 scene marker 吞掉。",
        }),
      );
      continue;
    }

    if (!settledSet.has(sceneNumber)) {
      issues.push(
        createIssue({
          code: "scene_coverage_conflict",
          severity: "high",
          scope: "scene",
          sceneNumber,
          refs: [`scene-${sceneNumber}`],
          message: `计划中的场景 ${sceneNumber} 没有被结算进 chronology。`,
          recommendation: "检查 settlement 对该场景的事件抽取，确保每个计划场景都产出可落账事件。",
        }),
      );
    }
  }

  return issues;
}

function detectTimelineIssues(input: ContinuityInput): ReadonlyArray<ContinuityIssue> {
  const issues: ContinuityIssue[] = [];
  const previousMaxChapter = input.previousChronology.events.reduce((max, event) => Math.max(max, event.chapterNumber), 0);

  if (previousMaxChapter > input.chapterNumber) {
    issues.push(
      createIssue({
        code: "timeline_conflict",
        severity: "high",
        scope: "chapter",
        sceneNumber: null,
        refs: ["chronology"],
        message: `已有 chronology 的最大章节号是 ${previousMaxChapter}，但当前要持久化的是第 ${input.chapterNumber} 章。`,
        recommendation: "确认是否对旧章节进行了重写；若是，请先做重建或回滚，再决定是否覆盖账本。",
      }),
    );
  }

  const insertionSceneNumbers = input.settlement.chapterStateDelta.chronologyInsertions
    .map((event) => event.sceneNumber)
    .filter((value): value is number => value !== null);

  const duplicateSceneNumbers = insertionSceneNumbers.filter((value, index, all) => all.indexOf(value) !== index);
  if (duplicateSceneNumbers.length > 0) {
    issues.push(
      createIssue({
        code: "timeline_conflict",
        severity: "high",
        scope: "chapter",
        sceneNumber: null,
        refs: duplicateSceneNumbers.map((value) => `scene-${value}`),
        message: `同一章的 chronology 插入里出现了重复场景号：${Array.from(new Set(duplicateSceneNumbers)).join(", ")}。`,
        recommendation: "检查 settlement 是否对同一 scene 生成了多条冲突事件，保持每个 scene 只对应一个 canonical event。",
      }),
    );
  }

  const sorted = insertionSceneNumbers.slice().sort((left, right) => left - right);
  const isAscending = insertionSceneNumbers.every((value, index) => value === sorted[index]);
  if (!isAscending) {
    issues.push(
      createIssue({
        code: "timeline_conflict",
        severity: "medium",
        scope: "chapter",
        sceneNumber: null,
        refs: insertionSceneNumbers.map((value) => `scene-${value}`),
        message: "本章 chronology 里的 scene 顺序与章节自然顺序不一致。",
        recommendation: "确保 settlement 写入 chronology 时保持按 sceneNumber 升序落账。",
      }),
    );
  }

  return issues;
}

function detectCharacterIssues(input: ContinuityInput): ReadonlyArray<ContinuityIssue> {
  const issues: ContinuityIssue[] = [];
  const currentStates = new Map(
    input.analysis.characterStates
      .filter((character) => character.presentInChapter)
      .map((character) => [character.name, character] as const),
  );
  const trackedCharacters = new Map(input.previousCharacterHistory.map((character) => [character.name, character] as const));

  const referencedCharacters = new Set<string>();
  for (const scene of input.plan.sceneBlueprint) {
    if (shouldTrackCharacter(scene.drivingCharacter)) {
      referencedCharacters.add(scene.drivingCharacter);
    }
    if (shouldTrackCharacter(scene.opposingForce)) {
      referencedCharacters.add(scene.opposingForce);
    }
  }

  for (const name of referencedCharacters) {
    if (trackedCharacters.has(name) && !currentStates.has(name)) {
      issues.push(
        createIssue({
          code: "character_state_conflict",
          severity: "medium",
          scope: "state",
          sceneNumber: null,
          refs: [name],
          message: `章节计划引用了已跟踪角色「${name}」，但本章 analysis 没有产出它的当前状态。`,
          recommendation: "检查 analysis 或 settlement，确保已进入账本的角色在出场时不会从跨章状态里掉线。",
        }),
      );
    }
  }

  for (const [name, previous] of trackedCharacters.entries()) {
    if (!currentStates.has(name) && input.draft.content.includes(name)) {
      issues.push(
        createIssue({
          code: "character_state_conflict",
          severity: "medium",
          scope: "state",
          sceneNumber: null,
          refs: [name],
          message: `正文提到了已跟踪角色「${name}」，但本章 analysis 没有产出它的当前状态。`,
          recommendation: "检查 analysis 或 settlement，确保实际出场角色不会从跨章状态账本里掉线。",
        }),
      );
      continue;
    }

    const current = currentStates.get(name);
    if (!current) {
      continue;
    }

    if (previous.latestState.decisionCost.length > 0 && current.decisionCost.length === 0) {
      issues.push(
        createIssue({
          code: "character_state_conflict",
          severity: "medium",
          scope: "state",
          sceneNumber: null,
          refs: [name],
          message: `角色「${name}」上一章已经背上明确代价，但本章当前状态没有给出新的代价落点。`,
          recommendation: "确认这是不是合理缓冲；若不是，下一章计划应继续承接该角色的旧代价或注明为何消失。",
        }),
      );
    }
  }

  return issues;
}

function scoreLoopCoverage(loop: OpenLoopEntry, chapterSignals: string): number {
  let score = 0;
  for (const keyword of extractKeywords(loop.description)) {
    if (chapterSignals.includes(keyword)) {
      score += 2;
    }
  }
  for (const entity of loop.relatedEntities) {
    if (entity.length > 0 && chapterSignals.includes(entity)) {
      score += 2;
    }
  }
  if (chapterSignals.includes(loop.owner)) {
    score += 1;
  }
  return score;
}

function detectOpenLoopIssues(input: ContinuityInput): ReadonlyArray<ContinuityIssue> {
  const issues: ContinuityIssue[] = [];
  const chapterSignals = buildChapterSignals(input);
  const newlyTouchedLoopIds = new Set(input.settlement.chapterStateDelta.updatedLoops.map((loop) => loop.loopId));

  for (const loop of input.previousOpenLoops.loops) {
    if (loop.status === "closed") {
      continue;
    }
    if (loop.introducedInChapter >= input.chapterNumber) {
      continue;
    }

    const coverageScore = scoreLoopCoverage(loop, chapterSignals);
    const touchedBySettlement = newlyTouchedLoopIds.has(loop.loopId);

    if (touchedBySettlement || coverageScore >= 3) {
      continue;
    }

    const severity: ContinuityIssue["severity"] =
      loop.urgency === "high" && loop.expectedPayoffWindow === "soon" ? "high" : "medium";

    issues.push(
      createIssue({
        code: "open_loop_conflict",
        severity,
        scope: "state",
        sceneNumber: null,
        refs: [loop.loopId, ...loop.evidenceRefs],
        message: `旧的 open loop「${loop.description}」在本章没有被明显承接。`,
        recommendation: "确认这条线是否应该延后；如果仍是当前压力点，plan-next 和 writer 应把它显式带进本章。",
      }),
    );
  }

  return issues;
}

function detectWorldRuleIssues(input: ContinuityInput): ReadonlyArray<ContinuityIssue> {
  const issues: ContinuityIssue[] = [];
  if (input.worldRules.rules.length === 0) {
    return issues;
  }

  const chapterSignals = buildChapterSignals(input);

  for (const rule of input.worldRules.rules) {
    const forbiddenHit = rule.forbiddenPhrases.find((phrase) => phrase.length > 0 && chapterSignals.includes(phrase));
    if (forbiddenHit) {
      issues.push(
        createIssue({
          code: "world_rule_conflict",
          severity: rule.severity,
          scope: "chapter",
          sceneNumber: null,
          refs: [rule.ruleId, forbiddenHit],
          message: `章节命中了 world rule「${rule.description}」的禁用表达：${forbiddenHit}。`,
          recommendation: "回查正文、plan 与 revise 输出，删除该表达或补足符合世界规则的替代表达。",
        }),
      );
      continue;
    }

    const applies = rule.appliesWhenAnyPhrases.length === 0
      || rule.appliesWhenAnyPhrases.some((phrase) => phrase.length > 0 && chapterSignals.includes(phrase));
    if (!applies || rule.requiredPhrases.length === 0) {
      continue;
    }

    const requiredHit = rule.requiredPhrases.some((phrase) => phrase.length > 0 && chapterSignals.includes(phrase));
    if (!requiredHit) {
      issues.push(
        createIssue({
          code: "world_rule_conflict",
          severity: rule.severity,
          scope: "chapter",
          sceneNumber: null,
          refs: [rule.ruleId],
          message: `章节触发了 world rule「${rule.description}」的适用条件，但没有出现必须承接的规则信号。`,
          recommendation: `至少承接这些规则信号中的一项：${rule.requiredPhrases.join(" / ")}。`,
        }),
      );
    }
  }

  return issues;
}

export class ContinuityAgent {
  audit(input: ContinuityInput): ContinuityReport {
    const issues = [
      ...detectTimelineIssues(input),
      ...detectSceneCoverageIssues(input),
      ...detectCharacterIssues(input),
      ...detectOpenLoopIssues(input),
      ...detectWorldRuleIssues(input),
    ].sort((left, right) => {
      const weight = (severity: ContinuityIssue["severity"]): number => {
        if (severity === "high") return 3;
        if (severity === "medium") return 2;
        return 1;
      };
      return weight(right.severity) - weight(left.severity);
    });

    const blocking = issues.some((issue) => issue.severity === "high");
    const summary = issues.length === 0
      ? "未发现会阻止本章并入全书账本的连续性冲突。"
      : blocking
        ? `发现 ${issues.length} 条连续性问题，其中包含需要阻止 canonical persist 的高优先级问题。`
        : `发现 ${issues.length} 条连续性问题，当前仍可持久化，但建议在后续章节或 revise 中继续消化。`;

    return {
      chapterNumber: input.chapterNumber,
      blocking,
      summary,
      issues,
      checkedCounts: {
        previousChronologyEvents: input.previousChronology.events.length,
        previousOpenLoops: input.previousOpenLoops.loops.length,
        trackedCharacters: input.previousCharacterHistory.length,
        chronologyInsertions: input.settlement.chapterStateDelta.chronologyInsertions.length,
        worldRules: input.worldRules.rules.length,
      },
      skippedChecks: input.worldRules.rules.length === 0 ? ["world_rules"] : [],
    };
  }
}
