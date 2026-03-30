import type {
  ChapterAnalysisBundle,
  ChapterDraft,
  ChapterPlan,
  ChapterStateDelta,
  ChapterSummaryRecord,
  ChronologyEvent,
  ChronologyLedger,
  OpenLoopEntry,
  OpenLoopsLedger,
  RelationshipLedger,
  RelationshipLedgerEntry,
  RevealEntry,
  RevealsLedger,
  SceneBlueprintItem,
  SettlementBundle,
} from "../types.js";
import { parseSceneDocument } from "../utils/scene-text.js";

interface SettlementInput {
  readonly chapterNumber: number;
  readonly draft: ChapterDraft;
  readonly plan: ChapterPlan;
  readonly analysis: ChapterAnalysisBundle;
  readonly previousChronology: ChronologyLedger;
  readonly previousOpenLoops: OpenLoopsLedger;
  readonly previousRelationships?: RelationshipLedger;
}

const OPEN_LOOP_SIGNAL = /会|将|后续|下月|以后|下一章|必须|不得不|记恨|打压|断供|危险|真相|秘密|悬念|报复|安排|盯上|后果|隐患|威胁|追查/u;
const CLOSE_SIGNAL = /解决|兑现|结束|了结|揭晓|落定|拿回|达成|关闭/u;
const REVEAL_SIGNAL = /真相|秘密|原来|其实|终于知道|终于明白|揭开|说破|暴露|看穿/u;
const EVENT_SIGNAL = /夺回|反抗|出手|抢走|拿回|宣布|安排|记恨|断供|打压|发现|得知|接受|拒绝|逼迫|离开|反击|爆发|命令/u;
const CONSEQUENCE_SIGNAL = /后续|下月|以后|下一章|记恨|打压|断供|危险|报复|安排|盯上|后果|隐患|威胁|践踏|失去/u;
const META_NARRATIVE_SIGNAL = /本章|场景|真正推动这个场景|剧情动作|价值站队|立场压向|revision brief|gate|scene/iu;
const IMMEDIATE_ACTION_SIGNAL = /揣入|捏住|撞得|挤了过来|看也没看|不躲不闪|侧面一偏/u;
const RELATIONSHIP_HOSTILE_SIGNAL = /对立|结仇|记恨|打压|围剿|眼中钉|撕破脸|敌视|仇|报复/u;
const RELATIONSHIP_ALLIED_SIGNAL = /联手|结盟|信任|合作|协作|靠近|站到一起|同路|缓和|和解/u;
const RELATIONSHIP_STRAINED_SIGNAL = /试探|警惕|怀疑|拉开|重新划线|高压协作|疏离|僵住/u;

function uniqueStrings(values: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function trimSentence(text: string, maxLength = 96): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function trimClause(text: string, maxLength = 56): string {
  return trimSentence(text, maxLength);
}

function normalizeLedgerPhrase(text: string): string {
  return text
    .replace(/^还是/u, "")
    .replace(/，?林凡必须决定是继续低头$/u, "")
    .replace(/^只要反抗，?/u, "")
    .replace(/^\s*而/u, "")
    .replace(/，?而变成必须做出的选择$/u, "")
    .replace(/，?只要反抗$/u, "")
    .replace(/，?一旦决定落地$/u, "")
    .trim();
}

function stripSceneMarker(text: string): string {
  return text.replace(/^【场景\s*\d+\s*\/\s*POV[:：][^\n】]+】\s*/u, "").trim();
}

function isMetadataParagraph(text: string): boolean {
  return (
    /^#\s+/u.test(text)
    || /^---$/u.test(text)
    || /^基于规划章节[:：]/u.test(text)
    || /^摘要[:：]/u.test(text)
  );
}

function splitIntoSentences(text: string): ReadonlyArray<string> {
  return text
    .split(/(?<=[。！？!?])\s+|\n+/u)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function splitIntoClauses(text: string): ReadonlyArray<string> {
  return text
    .split(/[，；：]/u)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 4);
}

function extractKeywords(text: string): ReadonlyArray<string> {
  return uniqueStrings(
    text
      .split(/[，。！？；、“”\s:：,.;!?()（）\-]+/u)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length >= 2),
  ).slice(0, 8);
}

function pickLoopType(text: string): OpenLoopEntry["type"] {
  if (/承诺|必须|约定/u.test(text)) return "promise";
  if (/债|亏欠/u.test(text)) return "debt";
  if (/威胁|危险|打压|记恨|断供|报复|盯上/u.test(text)) return "threat";
  if (/秘密|真相|谜|未知/u.test(text)) return "mystery";
  if (/问题|是否|能否|为什么/u.test(text)) return "question";
  return "foreshadow";
}

function pickUrgency(text: string): OpenLoopEntry["urgency"] {
  if (/立刻|马上|必须|危险|断供|记恨|报复|安排/u.test(text)) return "high";
  if (/很快|尽快|下一章|后续|下月/u.test(text)) return "medium";
  return "low";
}

function scoreCanonicalCandidate(text: string, kind: "event" | "consequence"): number {
  const normalized = normalizeLedgerPhrase(text);
  let score = 0;

  if (kind === "event" && EVENT_SIGNAL.test(normalized)) score += 4;
  if (kind === "consequence" && CONSEQUENCE_SIGNAL.test(normalized)) score += 4;
  if (/抢走|夺回|反击|断供|安排|打压|记恨|灵石|危险/u.test(normalized)) score += 4;
  if (kind === "event" && /默许|偏帮|抢走|羞辱/u.test(normalized)) score += 3;
  if (/意识到|明白|知道|看见|感到/u.test(normalized)) score -= 2;
  if (/必须决定|继续低头/u.test(normalized)) score -= 3;
  if (kind === "consequence" && IMMEDIATE_ACTION_SIGNAL.test(normalized) && !CONSEQUENCE_SIGNAL.test(normalized)) score -= 4;
  if (/偏帮有背景的弟子/u.test(normalized)) score -= 4;
  if (normalized.length >= 8 && normalized.length <= 40) score += 2;

  return score;
}

function extractDraftParagraphs(content: string): ReadonlyArray<string> {
  return content
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.replace(/\s+/gu, " ").trim())
    .filter((paragraph) => paragraph.length > 0)
    .filter((paragraph) => !isMetadataParagraph(paragraph));
}

function scoreParagraphForScene(
  paragraph: string,
  scene: ChapterAnalysisBundle["scenes"][number],
  planScene: SceneBlueprintItem | undefined,
): number {
  const keywords = buildSceneKeywords(scene, planScene);
  let score = 0;

  score += keywords.filter((keyword) => paragraph.includes(keyword)).length * 2;
  score += extractKeywords(scene.pov).filter((keyword) => paragraph.includes(keyword)).length * 2;

  if (planScene) {
    score += extractKeywords(
      [
        planScene.drivingCharacter,
        planScene.opposingForce,
        ...planScene.newInformation,
      ].join(" "),
    ).filter((keyword) => paragraph.includes(keyword)).length * 2;
  }

  if (EVENT_SIGNAL.test(paragraph)) {
    score += 2;
  }
  if (OPEN_LOOP_SIGNAL.test(paragraph)) {
    score += 1;
  }
  if (META_NARRATIVE_SIGNAL.test(paragraph)) {
    score -= 6;
  }

  return score;
}

function assignParagraphsToScenes(
  paragraphs: ReadonlyArray<string>,
  scenes: ReadonlyArray<ChapterAnalysisBundle["scenes"][number]>,
  planScenes: ReadonlyArray<SceneBlueprintItem>,
): ReadonlyArray<string> {
  if (scenes.length === 0 || paragraphs.length === 0) {
    return [];
  }

  const buckets = Array.from({ length: scenes.length }, () => [] as string[]);
  let sceneIndex = 0;

  for (const paragraph of paragraphs) {
    while (sceneIndex < scenes.length - 1) {
      const currentScene = scenes[sceneIndex];
      const nextScene = scenes[sceneIndex + 1];
      const currentPlan = planScenes.find((item) => item.sceneNumber === currentScene.sceneNumber);
      const nextPlan = planScenes.find((item) => item.sceneNumber === nextScene.sceneNumber);
      const currentScore = scoreParagraphForScene(paragraph, currentScene, currentPlan);
      const nextScore = scoreParagraphForScene(paragraph, nextScene, nextPlan);
      const currentHasContent = buckets[sceneIndex].length > 0;

      if (currentHasContent && nextScore >= currentScore + 2) {
        sceneIndex += 1;
        continue;
      }

      break;
    }

    buckets[sceneIndex].push(paragraph);
  }

  return buckets.map((bucket) => bucket.join("\n").trim());
}

function buildSceneEvidenceMap(input: SettlementInput): ReadonlyMap<number, string> {
  const fromDraft = parseSceneDocument(input.draft.content);
  const map = new Map<number, string>();

  for (const scene of fromDraft.scenes) {
    map.set(scene.sceneNumber, stripSceneMarker(scene.content));
  }

  if (fromDraft.scenes.length === 0 && input.analysis.scenes.length > 0) {
    const draftParagraphs = extractDraftParagraphs(input.draft.content);
    const chunkedEvidence = assignParagraphsToScenes(draftParagraphs, input.analysis.scenes, input.plan.sceneBlueprint);

    input.analysis.scenes.forEach((scene, index) => {
      const chunk = chunkedEvidence[index];
      if (chunk && chunk.length > 0) {
        map.set(scene.sceneNumber, chunk);
      }
    });
  }

  for (const scene of input.analysis.scenes) {
    if (!map.has(scene.sceneNumber)) {
      map.set(scene.sceneNumber, scene.sourceParagraphs.join("\n").trim());
    }
  }

  return map;
}

function buildSceneKeywords(scene: ChapterAnalysisBundle["scenes"][number], planScene: SceneBlueprintItem | undefined): ReadonlyArray<string> {
  return extractKeywords([
    scene.goal,
    scene.conflict,
    scene.turn,
    scene.result,
    ...(scene.newInformation ?? []),
    planScene?.decision ?? "",
    planScene?.cost ?? "",
    planScene?.result ?? "",
    planScene?.thematicTension ?? "",
  ].join(" "));
}

function buildSceneActors(
  scene: ChapterAnalysisBundle["scenes"][number],
  planScene: SceneBlueprintItem | undefined,
  characterStates: ReadonlyArray<ChapterAnalysisBundle["characterStates"][number]>,
): ReadonlyArray<string> {
  const sceneText = [
    planScene?.drivingCharacter ?? "",
    planScene?.opposingForce ?? "",
    planScene?.relationshipChange ?? "",
    planScene?.decision ?? "",
    planScene?.cost ?? "",
    ...(planScene?.newInformation ?? []),
  ].join(" ");

  return uniqueStrings([
    scene.pov,
    planScene?.drivingCharacter ?? "",
    ...characterStates
      .map((character) => character.name)
      .filter((name) => sceneText.includes(name)),
  ]);
}

function scoreSentence(sentence: string, keywords: ReadonlyArray<string>, actors: ReadonlyArray<string>, kind: "event" | "consequence"): number {
  let score = 0;
  const overlap = keywords.filter((keyword) => sentence.includes(keyword)).length;
  score += overlap * 2;
  score += actors.filter((actor) => sentence.includes(actor)).length * 2;
  if (kind === "event" && EVENT_SIGNAL.test(sentence)) score += 4;
  if (kind === "consequence" && OPEN_LOOP_SIGNAL.test(sentence)) score += 4;
  if (kind === "event" && /会|将|后续|以后|下一章/u.test(sentence)) score -= 3;
  if (/“|”|「|」/u.test(sentence)) score -= kind === "event" ? 4 : 2;
  if (/^“/u.test(sentence)) score -= 3;
  if (sentence.length >= 10 && sentence.length <= 60) score += 2;
  if (/推进当前悬念|场景结束时获得有限推进|场景以内压推进|场景中段出现逆转/u.test(sentence)) score -= 6;
  if (META_NARRATIVE_SIGNAL.test(sentence)) score -= 6;
  return score;
}

function pickBestSentence(
  evidence: string,
  keywords: ReadonlyArray<string>,
  actors: ReadonlyArray<string>,
  kind: "event" | "consequence",
): string | null {
  const sentences = splitIntoSentences(evidence);
  if (sentences.length === 0) {
    return null;
  }

  const ranked = sentences
    .map((sentence) => ({ sentence, score: scoreSentence(sentence, keywords, actors, kind) }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  if (!best || best.score < 4) {
    return null;
  }

  return trimSentence(best.sentence);
}

function chooseCanonicalEventText(
  kind: "event" | "consequence",
  proseCandidate: string | null,
  fallbackCandidates: ReadonlyArray<string>,
): string {
  const ranked = uniqueStrings([
    ...fallbackCandidates,
    ...(proseCandidate ? [proseCandidate] : []),
  ])
    .map((candidate) => ({
      candidate,
      normalized: normalizeLedgerPhrase(candidate),
      score: scoreCanonicalCandidate(candidate, kind),
    }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  return trimSentence(best?.normalized || fallbackCandidates[0] || proseCandidate || "", kind === "event" ? 48 : 56);
}

function compactLedgerSentence(
  sentence: string,
  keywords: ReadonlyArray<string>,
  actors: ReadonlyArray<string>,
  kind: "event" | "consequence",
): string {
  const clauses = splitIntoClauses(sentence);
  if (clauses.length === 0) {
    return trimClause(sentence);
  }

  const ranked = clauses
    .map((clause) => ({ clause, score: scoreSentence(clause, keywords, actors, kind) }))
    .sort((left, right) => right.score - left.score);

  const picked: string[] = [];
  for (const item of ranked) {
    if (item.score <= 0) {
      continue;
    }
    if (picked.length === 0) {
      picked.push(item.clause);
      continue;
    }
    if (!picked.some((existing) => existing.includes(item.clause) || item.clause.includes(existing))) {
      picked.push(item.clause);
    }
    if (picked.length >= 2) {
      break;
    }
  }

  if (picked.length === 0) {
    return trimClause(sentence);
  }

  if (kind === "consequence" && actors.length > 0 && !picked.some((clause) => actors.some((actor) => clause.includes(actor)))) {
    const actorClause = ranked.find((item) => item.score > 0 && actors.some((actor) => item.clause.includes(actor)));
    if (actorClause && !picked.some((existing) => existing.includes(actorClause.clause) || actorClause.clause.includes(existing))) {
      picked.unshift(actorClause.clause);
    }
  }

  const ordered = picked
    .slice()
    .sort((left, right) => sentence.indexOf(left) - sentence.indexOf(right));

  return trimClause(ordered.join("，"), kind === "event" ? 48 : 56);
}

function buildChronologyInsertions(
  input: SettlementInput,
  sceneEvidenceMap: ReadonlyMap<number, string>,
): ReadonlyArray<ChronologyEvent> {
  return input.analysis.scenes.map((scene) => {
    const planScene = input.plan.sceneBlueprint.find((item) => item.sceneNumber === scene.sceneNumber);
    const evidence = sceneEvidenceMap.get(scene.sceneNumber) ?? scene.sourceParagraphs.join("\n");
    const actors = buildSceneActors(scene, planScene, input.analysis.characterStates.filter((character) => character.presentInChapter));
    const keywords = buildSceneKeywords(scene, planScene);

    const proseSummary = pickBestSentence(evidence, keywords, actors, "event");
    const proseConsequence = pickBestSentence(evidence, buildSceneKeywords(scene, planScene), actors, "consequence");

    const summary = chooseCanonicalEventText("event", proseSummary, [
      planScene?.conflict ?? "",
      planScene?.turn ?? "",
      planScene?.decision ?? "",
      planScene?.result ?? "",
      scene.result,
      scene.goal,
    ]);
    const consequence = chooseCanonicalEventText("consequence", proseConsequence, [
      planScene?.cost ?? "",
      planScene?.result ?? "",
      planScene?.newInformation[0] ?? "",
      scene.result,
      scene.emotionalShift,
    ]);

    return {
      eventId: `ch${String(input.chapterNumber).padStart(4, "0")}-scene-${scene.sceneNumber}`,
      chapterNumber: input.chapterNumber,
      sceneNumber: scene.sceneNumber,
      sceneId: scene.sceneId,
      actors,
      summary: compactLedgerSentence(normalizeLedgerPhrase(summary), keywords, actors, "event"),
      consequence: compactLedgerSentence(normalizeLedgerPhrase(consequence), keywords, actors, "consequence"),
    } satisfies ChronologyEvent;
  });
}

function buildKeyEvents(events: ReadonlyArray<ChronologyEvent>): ReadonlyArray<string> {
  return events.map((event) => trimSentence(`${event.summary} -> ${event.consequence}`, 72));
}

function buildChapterNarrativeSummary(
  input: SettlementInput,
  chronologyInsertions: ReadonlyArray<ChronologyEvent>,
): string {
  const firstEvent = chronologyInsertions[0];
  const lastEvent = chronologyInsertions.at(-1);

  if (!firstEvent || !lastEvent) {
    return trimSentence(input.plan.chapterMission, 108);
  }

  return trimSentence(
    `${firstEvent.summary}，${lastEvent.consequence}`,
    108,
  );
}

function matchLoop(loop: OpenLoopEntry, chapterSignals: string): { matched: boolean; shouldClose: boolean } {
  const keywords = extractKeywords(loop.description);
  const matched = keywords.some((keyword) => keyword.length >= 2 && chapterSignals.includes(keyword));
  if (!matched) {
    return { matched: false, shouldClose: false };
  }

  return {
    matched: true,
    shouldClose: CLOSE_SIGNAL.test(chapterSignals) && keywords.length > 0,
  };
}

function buildChapterSignals(input: SettlementInput, chronologyInsertions: ReadonlyArray<ChronologyEvent>): string {
  return [
    input.draft.content,
    input.analysis.readerReport.summary,
    ...input.analysis.readerReport.risks,
    ...input.analysis.characterStates.map((state) => state.decisionCost),
    ...chronologyInsertions.flatMap((event) => [event.summary, event.consequence]),
    ...input.plan.sceneBlueprint.flatMap((scene) => [scene.decision, scene.cost, scene.result, ...scene.newInformation]),
  ]
    .join("\n")
    .replace(/\s+/gu, " ")
    .trim();
}

function collectLoopSources(
  input: SettlementInput,
  chronologyInsertions: ReadonlyArray<ChronologyEvent>,
): ReadonlyArray<string> {
  const draftSentences = splitIntoSentences(input.draft.content).filter((sentence) => !/“|”|「|」/u.test(sentence));
  const chronologyConsequences = chronologyInsertions.map((event) => event.consequence);
  const characterCosts = input.analysis.characterStates
    .filter((state) => state.presentInChapter)
    .map((state) => state.decisionCost);
  const planCosts = input.plan.sceneBlueprint.flatMap((scene) => [
    scene.cost,
    ...scene.newInformation,
    OPEN_LOOP_SIGNAL.test(scene.result) ? scene.result : "",
  ]);

  const characterNames = input.analysis.characterStates.map((state) => state.name);

  const ranked = uniqueStrings([
    ...input.analysis.readerReport.risks,
    ...characterCosts,
    ...planCosts,
    ...chronologyConsequences,
    ...draftSentences.filter((sentence) => OPEN_LOOP_SIGNAL.test(sentence)),
  ])
    .filter((text) => OPEN_LOOP_SIGNAL.test(text))
    .filter((text) => !/推进当前悬念|场景结束时获得有限推进|场景以内压推进|场景中段出现逆转/u.test(text))
    .filter((text) => !/一旦决定落地/u.test(text))
    .filter((text) => !META_NARRATIVE_SIGNAL.test(text))
      .map((text) => {
        let score = 0;
        if (/记恨|断供|报复|危险|安排|真相|秘密/u.test(text)) score += 4;
        if (/后续|以后|下月|下一章|会|将/u.test(text)) score += 3;
        if (characterNames.some((name) => text.includes(name))) score += 2;
        if (/偏帮有背景的弟子/u.test(text)) score -= 5;
        if (/只要反抗/u.test(text)) score -= 2;
        if (text.length >= 12 && text.length <= 72) score += 2;
        return { text, score };
      })
      .sort((left, right) => right.score - left.score)
      .reduce<Array<{ text: string; keywords: ReadonlyArray<string> }>>((selected, item) => {
        if (selected.length >= 2) {
          return selected;
        }

        const keywords = extractKeywords(item.text);
        if (/偏帮有背景的弟子/u.test(item.text) && selected.length >= 1) {
          return selected;
        }
        const overlapsExisting = selected.some((existing) => {
          const overlap = keywords.filter((keyword) => existing.keywords.includes(keyword)).length;
          return overlap >= Math.min(2, keywords.length) && overlap > 0;
      });
      if (overlapsExisting) {
        return selected;
      }

      selected.push({ text: item.text, keywords });
      return selected;
    }, [])
    .map((item) => item.text);

  return ranked;
}

function createNewLoopCandidates(
  input: SettlementInput,
  existingLoops: ReadonlyArray<OpenLoopEntry>,
  chronologyInsertions: ReadonlyArray<ChronologyEvent>,
): ReadonlyArray<OpenLoopEntry> {
  const sources = collectLoopSources(input, chronologyInsertions).filter((source, index, all) => (
    !all.some((other, otherIndex) => otherIndex !== index && other.includes(source))
  ));
  const existingDescriptions = existingLoops.map((loop) => loop.description);
  const nextIndexBase = existingLoops.filter((loop) => loop.introducedInChapter === input.chapterNumber).length;

  return sources
    .filter((source) => !existingDescriptions.some((description) => description.includes(source) || source.includes(description)))
    .map((source, index) => {
      const relatedEntities = uniqueStrings(
        input.analysis.characterStates
          .filter((character) => source.includes(character.name))
          .map((character) => character.name),
      );
      const sourceKeywords = extractKeywords(source);
      const matchingEvent = chronologyInsertions
        .map((event) => {
          let score = 0;
          if (event.summary.includes(source) || source.includes(event.summary)) score += 5;
          if (event.consequence.includes(source) || source.includes(event.consequence)) score += 5;
          score += relatedEntities.filter((entity) => event.actors.includes(entity)).length;
          score += sourceKeywords.filter((keyword) => (
            event.summary.includes(keyword) || event.consequence.includes(keyword)
          )).length;
          return { event, score };
        })
        .sort((left, right) => right.score - left.score)[0]?.event;
      const owner = relatedEntities[0] ?? matchingEvent?.actors[0] ?? input.analysis.scenes[0]?.pov ?? "章节系统";

      return {
        loopId: `loop-ch${String(input.chapterNumber).padStart(4, "0")}-${String(nextIndexBase + index + 1).padStart(2, "0")}`,
        type: pickLoopType(source),
        introducedInChapter: input.chapterNumber,
        owner,
        description: compactLedgerSentence(source, sourceKeywords, relatedEntities, "consequence"),
        expectedPayoffWindow: pickUrgency(source) === "high" ? "soon" : "mid",
        urgency: pickUrgency(source),
        status: "open",
        payoffConstraints: [
          "后续章节必须继续承接这条未兑现事项",
        ],
        relatedEntities,
        evidenceRefs: matchingEvent ? [`scene-${matchingEvent.sceneNumber}`] : input.analysis.scenes.map((scene) => `scene-${scene.sceneNumber}`),
        lastUpdatedChapter: input.chapterNumber,
      } satisfies OpenLoopEntry;
    });
}

function inferRevealStrength(text: string, shouldClose: boolean): RevealEntry["revealStrength"] {
  if (shouldClose || /原来|其实|终于知道|终于明白|说破|揭开/u.test(text)) {
    return "explicit";
  }
  if (/真相|秘密|暴露|看穿/u.test(text)) {
    return "partial";
  }
  return "hinted";
}

function buildRevealSentence(
  evidence: string,
  keywords: ReadonlyArray<string>,
  entities: ReadonlyArray<string>,
  fallback: string,
): string {
  const candidate = pickBestSentence(evidence, keywords, entities, "consequence");
  if (candidate && REVEAL_SIGNAL.test(candidate)) {
    return trimSentence(normalizeLedgerPhrase(candidate), 72);
  }
  return trimSentence(normalizeLedgerPhrase(fallback), 72);
}

function buildReveals(
  input: SettlementInput,
  chronologyInsertions: ReadonlyArray<ChronologyEvent>,
  chapterSignals: string,
  sceneEvidenceMap: ReadonlyMap<number, string>,
  loopStatusMap: ReadonlyMap<string, "open" | "advanced" | "closed">,
): RevealsLedger {
  const entries: RevealEntry[] = [];

  for (const loop of input.previousOpenLoops.loops) {
    if (loop.status === "closed") {
      continue;
    }
    if (!["mystery", "question", "promise"].includes(loop.type)) {
      continue;
    }

    const loopKeywords = extractKeywords(loop.description);
    const hasLoopSignal = loopKeywords.some((keyword) => chapterSignals.includes(keyword))
      || loop.relatedEntities.some((entity) => entity.length > 0 && chapterSignals.includes(entity));
    if (!hasLoopSignal || !REVEAL_SIGNAL.test(chapterSignals)) {
      continue;
    }

    const matchingEvent = chronologyInsertions
      .map((event) => {
        let score = 0;
        score += loopKeywords.filter((keyword) => event.summary.includes(keyword) || event.consequence.includes(keyword)).length * 2;
        score += loop.relatedEntities.filter((entity) => event.actors.includes(entity)).length * 2;
        if (REVEAL_SIGNAL.test(event.summary)) score += 3;
        if (REVEAL_SIGNAL.test(event.consequence)) score += 4;
        return { event, score };
      })
      .sort((left, right) => right.score - left.score)[0]?.event;

    const sceneNumber = matchingEvent?.sceneNumber ?? null;
    const evidence = sceneNumber !== null ? (sceneEvidenceMap.get(sceneNumber) ?? chapterSignals) : chapterSignals;
    const action = loopStatusMap.get(loop.loopId) ?? loop.status;
    const revealStrength = inferRevealStrength(evidence, action === "closed");
    const revealedTruth = buildRevealSentence(
      evidence,
      loopKeywords,
      loop.relatedEntities,
      matchingEvent?.consequence ?? matchingEvent?.summary ?? loop.description,
    );

    entries.push({
      revealId: `reveal-ch${String(input.chapterNumber).padStart(4, "0")}-${String(entries.length + 1).padStart(2, "0")}`,
      chapterNumber: input.chapterNumber,
      sceneNumber,
      sceneId: matchingEvent?.sceneId,
      sourceLoopId: loop.loopId,
      category: loop.type as RevealEntry["category"],
      subject: loop.description,
      revealedTruth,
      revealStrength,
      knownByReader: true,
      knownByCharacters: matchingEvent?.actors ?? loop.relatedEntities,
      evidenceRefs: sceneNumber !== null ? [`scene-${sceneNumber}`] : loop.evidenceRefs,
    } satisfies RevealEntry);
  }

  return { entries };
}

function buildRelationshipId(left: string, right: string): string {
  return [left, right].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")).join("::");
}

function inferRelationshipPolarity(text: string): RelationshipLedgerEntry["polarity"] {
  if (RELATIONSHIP_HOSTILE_SIGNAL.test(text)) {
    return "hostile";
  }
  if (RELATIONSHIP_ALLIED_SIGNAL.test(text)) {
    return "allied";
  }
  if (RELATIONSHIP_STRAINED_SIGNAL.test(text)) {
    return "strained";
  }
  return "neutral";
}

function inferRelationshipTension(
  text: string,
  polarity: RelationshipLedgerEntry["polarity"],
): RelationshipLedgerEntry["tension"] {
  if (RELATIONSHIP_HOSTILE_SIGNAL.test(text) || /高压|围剿|断供|报复/u.test(text)) {
    return "high";
  }
  if (polarity === "strained" || RELATIONSHIP_STRAINED_SIGNAL.test(text)) {
    return "medium";
  }
  if (polarity === "allied" && /结盟|和解|联手/u.test(text)) {
    return "low";
  }
  return polarity === "neutral" ? "low" : "medium";
}

function findRelationshipEvidenceRefs(
  left: string,
  right: string,
  sceneEvidenceMap: ReadonlyMap<number, string>,
): ReadonlyArray<string> {
  const refs: string[] = [];
  for (const [sceneNumber, evidence] of sceneEvidenceMap.entries()) {
    if (evidence.includes(left) && evidence.includes(right)) {
      refs.push(`scene-${sceneNumber}`);
    }
  }

  return refs.length > 0 ? refs.slice(0, 2) : [];
}

function buildRelationships(
  input: SettlementInput,
  sceneEvidenceMap: ReadonlyMap<number, string>,
): RelationshipLedger {
  const knownNames = uniqueStrings([
    ...input.analysis.characterStates
      .filter((state) => state.presentInChapter)
      .map((state) => state.name),
    ...input.plan.sceneBlueprint.flatMap((scene) => [scene.pov, scene.drivingCharacter, scene.opposingForce]),
  ]);
  const nextEntries = new Map(
    (input.previousRelationships?.entries ?? []).map((entry) => [entry.relationshipId, entry] as const),
  );

  for (const state of input.analysis.characterStates.filter((entry) => entry.presentInChapter)) {
    for (const shift of state.relationshipShift) {
      const targets = knownNames.filter((name) => name !== state.name && shift.includes(name));
      for (const target of targets) {
        const characters = [state.name, target].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")) as [string, string];
        const relationshipId = buildRelationshipId(characters[0], characters[1]);
        const normalizedChange = trimSentence(normalizeLedgerPhrase(shift), 72);
        const previousEntry = nextEntries.get(relationshipId);
        const polarity = inferRelationshipPolarity(shift);
        const tension = inferRelationshipTension(shift, polarity);
        const evidenceRefs = findRelationshipEvidenceRefs(state.name, target, sceneEvidenceMap);

        nextEntries.set(relationshipId, {
          relationshipId,
          characters,
          status: normalizedChange,
          polarity,
          tension,
          lastChange: normalizedChange,
          lastUpdatedChapter: input.chapterNumber,
          evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : (previousEntry?.evidenceRefs ?? []),
        } satisfies RelationshipLedgerEntry);
      }
    }
  }

  return {
    entries: Array.from(nextEntries.values()).sort((left, right) => (
      left.lastUpdatedChapter - right.lastUpdatedChapter || left.relationshipId.localeCompare(right.relationshipId, "zh-Hans-CN")
    )),
  };
}

function summarizeChangedCharacters(input: SettlementInput): ChapterSummaryRecord["changedCharacters"] {
  return input.analysis.characterStates
    .filter((state) => state.presentInChapter)
    .map((state) => ({
      name: state.name,
      summary: trimSentence(`${state.name}在本章的推进是：${state.arcProgress}`),
      recentDecision: state.recentDecision,
      decisionCost: state.decisionCost,
    }));
}

export class SettlementAgent {
  settle(input: SettlementInput): SettlementBundle {
    const sceneEvidenceMap = buildSceneEvidenceMap(input);
    const chronologyInsertions = buildChronologyInsertions(input, sceneEvidenceMap);
    const nextChronology: ChronologyLedger = {
      events: [...input.previousChronology.events, ...chronologyInsertions],
    };

    const chapterSignals = buildChapterSignals(input, chronologyInsertions);
    const loopUpdates: Array<ChapterStateDelta["updatedLoops"][number]> = [];
    const updatedExistingLoops = input.previousOpenLoops.loops.map((loop) => {
      const match = matchLoop(loop, chapterSignals);
      if (!match.matched || loop.status === "closed") {
        return loop;
      }

      const action = match.shouldClose ? "closed" : "advanced";
      loopUpdates.push({
        loopId: loop.loopId,
        action,
        description: loop.description,
        evidence: trimSentence(chapterSignals, 72),
      });

      return {
        ...loop,
        status: action,
        lastUpdatedChapter: input.chapterNumber,
      } satisfies OpenLoopEntry;
    });

    const newLoops = createNewLoopCandidates(input, updatedExistingLoops, chronologyInsertions);
    loopUpdates.push(
      ...newLoops.map((loop) => ({
        loopId: loop.loopId,
        action: "opened" as const,
        description: loop.description,
        evidence: loop.evidenceRefs.join(", "),
      })),
    );

    const nextOpenLoops: OpenLoopsLedger = {
      loops: [...updatedExistingLoops, ...newLoops],
    };
    const loopStatusMap = new Map(nextOpenLoops.loops.map((loop) => [loop.loopId, loop.status] as const));
    const reveals = buildReveals(input, chronologyInsertions, chapterSignals, sceneEvidenceMap, loopStatusMap);
    const relationships = buildRelationships(input, sceneEvidenceMap);

    const openedLoopIds = loopUpdates.filter((loop) => loop.action === "opened").map((loop) => loop.loopId);
    const advancedLoopIds = loopUpdates.filter((loop) => loop.action === "advanced").map((loop) => loop.loopId);
    const closedLoopIds = loopUpdates.filter((loop) => loop.action === "closed").map((loop) => loop.loopId);
    const changedCharacters = summarizeChangedCharacters(input);

    const finalEvent = chronologyInsertions.at(-1);
    const chapterSummary: ChapterSummaryRecord = {
      chapterNumber: input.chapterNumber,
      title: input.draft.title,
      summary: buildChapterNarrativeSummary(input, chronologyInsertions),
      keyEvents: buildKeyEvents(chronologyInsertions),
      changedCharacters,
      openedLoopIds,
      advancedLoopIds,
      closedLoopIds,
    };

    const chapterStateDelta: ChapterStateDelta = {
      chapterNumber: input.chapterNumber,
      title: input.draft.title,
      changedCharacters: input.analysis.characterStates
        .filter((state) => state.presentInChapter)
        .map((state) => ({
          name: state.name,
          currentDecision: state.recentDecision,
          decisionCost: state.decisionCost,
          arcProgress: state.arcProgress,
          summary: trimSentence(`${state.name}做出“${state.recentDecision}”，代价是“${state.decisionCost}”`, 96),
        })),
      chronologyInsertions,
      updatedLoops: loopUpdates,
      stateHighlights: uniqueStrings([
        ...input.analysis.characterStates
          .filter((state) => state.presentInChapter)
          .map((state) => `${state.name}: ${state.arcProgress}`),
        ...loopUpdates.map((loop) => `${loop.action}:${loop.description}`),
      ]).slice(0, 8),
    };

    return {
      chapterSummary,
      chapterStateDelta,
      chronology: nextChronology,
      openLoops: nextOpenLoops,
      reveals,
      relationships,
    };
  }
}
