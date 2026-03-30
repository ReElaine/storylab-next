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
  RelationshipLedger,
  RevealsLedger,
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
  readonly previousRelationships?: RelationshipLedger;
  readonly previousReveals?: RevealsLedger;
  readonly previousCharacterHistory: ReadonlyArray<CharacterHistory>;
  readonly worldRules: WorldRulesConfig;
}

const GENERIC_FORCE_SIGNAL = /制度|规则|环境|现实|安全感|危险|资源|局势/u;
const KEYWORD_SPLIT = /[，。！？；、“”‘’\s:：,.;!?()（）\-]+/u;
const OPEN_LOOP_SIGNAL = /后续|下章|以后|必须|记恨|打压|断供|危险|报复|安排|后果|隐患|威胁|追查/u;
const REVEAL_SIGNAL = /真相|秘密|原来|其实|终于知道|终于明白|揭开|说破|暴露|看穿/u;
const STATE_TRANSITION_SIGNAL = /开始|终于|第一次|不再|转而|转向|意识到|明白|改口|松动|升级|推进/u;
const HARD_BLOCKING_CODES = new Set<ContinuityIssue["code"]>([
  "character_state_conflict",
  "relationship_conflict",
  "open_loop_conflict",
  "reveal_conflict",
]);

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

function keywordOverlap(left: string, right: string): number {
  const rightKeywords = new Set(extractKeywords(right));
  return extractKeywords(left).filter((keyword) => rightKeywords.has(keyword)).length;
}

function normalizeCompactText(text: string): string {
  return text.replace(KEYWORD_SPLIT, "").trim();
}

function sharedBigramCount(left: string, right: string): number {
  const normalizedLeft = normalizeCompactText(left);
  const normalizedRight = normalizeCompactText(right);
  if (normalizedLeft.length < 2 || normalizedRight.length < 2) {
    return 0;
  }

  const rightBigrams = new Set<string>();
  for (let index = 0; index < normalizedRight.length - 1; index += 1) {
    rightBigrams.add(normalizedRight.slice(index, index + 2));
  }

  let overlap = 0;
  const counted = new Set<string>();
  for (let index = 0; index < normalizedLeft.length - 1; index += 1) {
    const bigram = normalizedLeft.slice(index, index + 2);
    if (counted.has(bigram)) {
      continue;
    }
    counted.add(bigram);
    if (rightBigrams.has(bigram)) {
      overlap += 1;
    }
  }

  return overlap;
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
  const chapterSignals = buildChapterSignals(input);
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

    const driftDimensions: string[] = [];
    const compareDimensions = [
      { label: "欲望", previous: previous.latestState.desire, current: current.desire },
      { label: "恐惧", previous: previous.latestState.fear, current: current.fear },
      { label: "误判", previous: previous.latestState.misbelief, current: current.misbelief },
    ];

    for (const dimension of compareDimensions) {
      if (dimension.previous.trim().length === 0 || dimension.current.trim().length === 0) {
        continue;
      }
      if (keywordOverlap(dimension.previous, dimension.current) > 0) {
        continue;
      }

      const previousMentioned = extractKeywords(dimension.previous).some((keyword) => chapterSignals.includes(keyword));
      const currentMentioned = extractKeywords(dimension.current).some((keyword) => chapterSignals.includes(keyword));
      if (previousMentioned && currentMentioned) {
        continue;
      }

      driftDimensions.push(dimension.label);
    }

    if (driftDimensions.length >= 2) {
      issues.push(
        createIssue({
          code: "character_state_conflict",
          severity: STATE_TRANSITION_SIGNAL.test(chapterSignals) ? "medium" : "high",
          scope: "state",
          sceneNumber: null,
          refs: [name],
          message: `角色「${name}」的${driftDimensions.join(" / ")}在本章出现了突兀漂移，当前状态和上一章运行态缺少连续桥接。`,
          recommendation: "要么在正文里补出状态转变过程，要么把当前角色状态收回到与上一章更连续的表达。",
        }),
      );
    }

    if (
      previous.latestState.arcProgress.trim().length > 0
      && current.arcProgress.trim().length > 0
      && keywordOverlap(previous.latestState.arcProgress, current.arcProgress) === 0
      && !STATE_TRANSITION_SIGNAL.test(current.arcProgress)
      && !STATE_TRANSITION_SIGNAL.test(chapterSignals)
    ) {
      issues.push(
        createIssue({
          code: "character_state_conflict",
          severity: "medium",
          scope: "state",
          sceneNumber: null,
          refs: [name],
          message: `角色「${name}」的弧线描述从“${previous.latestState.arcProgress}”突然跳到“${current.arcProgress}”，中间缺少过渡。`,
          recommendation: "给出弧线推进的中间台阶，或在本章正文里明确写出导致弧线转向的事件与代价。",
        }),
      );
    }
  }

  return issues;
}

function detectRelationshipIssues(input: ContinuityInput): ReadonlyArray<ContinuityIssue> {
  const issues: ContinuityIssue[] = [];
  const chapterSignals = buildChapterSignals(input);
  const previousEntries = input.previousRelationships?.entries ?? [];
  const currentEntries = new Map(
    (input.settlement.relationships?.entries ?? [])
      .filter((entry) => entry.lastUpdatedChapter === input.chapterNumber)
      .map((entry) => [entry.relationshipId, entry] as const),
  );

  for (const previous of previousEntries) {
    const current = currentEntries.get(previous.relationshipId);
    if (!current) {
      continue;
    }

    if (previous.polarity === current.polarity) {
      continue;
    }
    if (previous.polarity === "neutral" || current.polarity === "neutral") {
      continue;
    }

    const bothCharactersMentioned = previous.characters.every((name) => chapterSignals.includes(name));
    if (!bothCharactersMentioned) {
      continue;
    }

    const transitionSignals = [current.lastChange, current.status, chapterSignals].some((text) => STATE_TRANSITION_SIGNAL.test(text));
    const severity: ContinuityIssue["severity"] = transitionSignals ? "medium" : "high";

    issues.push(
      createIssue({
        code: "relationship_conflict",
        severity,
        scope: "state",
        sceneNumber: null,
        refs: [previous.relationshipId, ...current.evidenceRefs],
        message: `关系「${previous.characters.join(" / ")}」从“${previous.lastChange}”突然跳到“${current.lastChange}”，缺少足够过渡。`,
        recommendation: "在正文里补出关系变化的桥接事件，或把当前关系状态收回到与上一章更连续的版本。",
      }),
    );
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

  const activeLoops = input.settlement.openLoops.loops.filter((loop) => loop.status !== "closed");
  for (let index = 0; index < activeLoops.length; index += 1) {
    const left = activeLoops[index];
    for (let compareIndex = index + 1; compareIndex < activeLoops.length; compareIndex += 1) {
      const right = activeLoops[compareIndex];
      const rightKeywords = extractKeywords(right.description);
      const sharedKeywordCount = extractKeywords(left.description).filter((keyword) => rightKeywords.includes(keyword)).length;
      const sharedPhraseCount = sharedBigramCount(left.description, right.description);
      const sharedEntities = left.relatedEntities.filter((entity) => right.relatedEntities.includes(entity)).length;
      if (sharedKeywordCount < 2 && sharedPhraseCount < 4 && sharedEntities === 0) {
        continue;
      }

      issues.push(
        createIssue({
          code: "open_loop_conflict",
          severity: "medium",
          scope: "state",
          sceneNumber: null,
          refs: [left.loopId, right.loopId],
          message: `open loop「${left.description}」和「${right.description}」高度重叠，当前账本看起来重复开线了。`,
          recommendation: "优先合并为一条既有 loop 的 advanced 状态，而不是继续新开同义压力线。",
        }),
      );
    }
  }

  const openedUpdates = input.settlement.chapterStateDelta.updatedLoops.filter((loop) => loop.action === "opened");
  for (const opened of openedUpdates) {
    const openedKeywords = extractKeywords(opened.description);
    const similarPrevious = input.previousOpenLoops.loops.find((loop) => {
      if (loop.status === "closed") {
        return false;
      }
      const sharedKeywordCount = extractKeywords(loop.description).filter((keyword) => openedKeywords.includes(keyword)).length;
      const sharedPhraseCount = sharedBigramCount(loop.description, opened.description);
      return sharedKeywordCount >= 2 || sharedPhraseCount >= 4;
    });

    if (similarPrevious) {
      issues.push(
        createIssue({
          code: "open_loop_conflict",
          severity: similarPrevious.urgency === "high" ? "high" : "medium",
          scope: "state",
          sceneNumber: null,
          refs: [similarPrevious.loopId, opened.loopId],
          message: `本章新开的 loop「${opened.description}」与旧 loop「${similarPrevious.description}」高度相似，更像重复开线而不是推进旧线。`,
          recommendation: "把这条更新记到旧 loop 的 advanced / closed，而不是再开一个新 loopId。",
        }),
      );
    }
  }

  const closedUpdates = input.settlement.chapterStateDelta.updatedLoops.filter((loop) => loop.action === "closed");
  for (const closed of closedUpdates) {
    const stillSignalsFuture = extractKeywords(closed.description).some((keyword) => chapterSignals.includes(keyword))
      && OPEN_LOOP_SIGNAL.test(chapterSignals);
    if (!stillSignalsFuture) {
      continue;
    }

    issues.push(
      createIssue({
        code: "open_loop_conflict",
        severity: "medium",
        scope: "state",
        sceneNumber: null,
        refs: [closed.loopId],
        message: `loop「${closed.description}」被记成已关闭，但正文和 settlement 信号仍然在强调后续压力，像是“名义关闭、实际未关闭”。`,
        recommendation: "确认这条线是真的收束了；如果后续压力还在，应改成 advanced 或拆分为更明确的新后果线。",
      }),
    );
  }

  return issues;
}

function detectRevealIssues(input: ContinuityInput): ReadonlyArray<ContinuityIssue> {
  const issues: ContinuityIssue[] = [];
  const chapterSignals = buildChapterSignals(input);
  const touchedLoopIds = new Set(input.settlement.chapterStateDelta.updatedLoops.map((loop) => loop.loopId));
  const currentRevealLoopIds = new Set(
    (input.settlement.reveals?.entries ?? [])
      .map((entry) => entry.sourceLoopId)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const previousRevealEntries = input.previousReveals?.entries ?? [];

  for (const loop of input.previousOpenLoops.loops) {
    if (loop.status === "closed") {
      continue;
    }
    if (!["mystery", "question", "promise"].includes(loop.type)) {
      continue;
    }
    if (loop.introducedInChapter >= input.chapterNumber) {
      continue;
    }

    const keywords = extractKeywords(loop.description);
    const entities = loop.relatedEntities.filter((entity) => entity.length > 0);
    const hasLoopSignal = keywords.some((keyword) => chapterSignals.includes(keyword))
      || entities.some((entity) => chapterSignals.includes(entity));
    const hasRevealSignal = REVEAL_SIGNAL.test(chapterSignals);

    if (!(hasLoopSignal && hasRevealSignal)) {
      continue;
    }

    if (touchedLoopIds.has(loop.loopId) || currentRevealLoopIds.has(loop.loopId)) {
      continue;
    }

    issues.push(
      createIssue({
        code: "reveal_conflict",
        severity: loop.expectedPayoffWindow === "soon" ? "high" : "medium",
        scope: "state",
        sceneNumber: null,
        refs: [loop.loopId, ...loop.evidenceRefs],
        message: `章节看起来已经触及旧谜题/承诺「${loop.description}」，但 settlement 没有把这条线记成 advanced 或 closed。`,
        recommendation: "如果本章真的推进或揭示了这条线，请在 settlement 中更新 loop 状态；如果没有，请弱化正文里的揭示口吻。",
      }),
    );
  }

  for (const entry of input.settlement.reveals?.entries ?? []) {
    if (!entry.sourceLoopId) {
      continue;
    }

    const previousEntries = previousRevealEntries.filter((previous) => previous.sourceLoopId === entry.sourceLoopId);
    if (previousEntries.length === 0) {
      continue;
    }

    const conflictingPrevious = previousEntries.find((previous) => (
      keywordOverlap(previous.revealedTruth, entry.revealedTruth) === 0
      && keywordOverlap(previous.subject, entry.subject) > 0
    ));

    if (!conflictingPrevious) {
      continue;
    }

    issues.push(
      createIssue({
        code: "reveal_conflict",
        severity: entry.revealStrength === "explicit" || conflictingPrevious.revealStrength === "explicit" ? "high" : "medium",
        scope: "state",
        sceneNumber: entry.sceneNumber,
        refs: [entry.revealId, conflictingPrevious.revealId, entry.sourceLoopId],
        message: `同一条旧谜题/承诺「${entry.subject}」在不同章节里对应了不一致的揭示内容。`,
        recommendation: "确认哪个版本才是 canonical 真相；如本章只是补充信息，请把揭示语句改成兼容旧结论的表达。",
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
      ...detectRelationshipIssues(input),
      ...detectOpenLoopIssues(input),
      ...detectRevealIssues(input),
      ...detectWorldRuleIssues(input),
    ].sort((left, right) => {
      const weight = (severity: ContinuityIssue["severity"]): number => {
        if (severity === "high") return 3;
        if (severity === "medium") return 2;
        return 1;
      };
      return weight(right.severity) - weight(left.severity);
    });

    const blocking = issues.some((issue) => issue.severity === "high"
      || (issue.severity === "medium" && HARD_BLOCKING_CODES.has(issue.code)));
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
        previousReveals: input.previousReveals?.entries.length ?? 0,
        previousRelationships: input.previousRelationships?.entries.length ?? 0,
        trackedCharacters: input.previousCharacterHistory.length,
        chronologyInsertions: input.settlement.chapterStateDelta.chronologyInsertions.length,
        worldRules: input.worldRules.rules.length,
      },
      skippedChecks: input.worldRules.rules.length === 0 ? ["world_rules"] : [],
    };
  }
}
