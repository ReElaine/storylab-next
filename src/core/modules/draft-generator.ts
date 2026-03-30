import type { ChapterDraft, ChapterPlan, CharacterHistory, SceneBlueprintItem, ThemeHistory } from "../types.js";

function titleFromPlan(plan: ChapterPlan): string {
  const titles = ["余温未退", "代价开口", "回声压低", "第二次呼吸", "沉默之后"];
  return titles[(plan.targetChapterNumber - 1) % titles.length] ?? "未命名章节";
}

function pickLeadCharacter(characterHistory: ReadonlyArray<CharacterHistory>): CharacterHistory | null {
  return characterHistory.find((entry) => entry.latestState.presentInChapter) ?? characterHistory[0] ?? null;
}

function pickSupportCharacter(
  characterHistory: ReadonlyArray<CharacterHistory>,
  leadName: string | null,
): CharacterHistory | null {
  return characterHistory.find((entry) => entry.name !== leadName) ?? null;
}

function buildOpeningParagraph(plan: ChapterPlan, leadName: string): string {
  return `${leadName}知道自己已经没法再把头低回去了。${plan.chapterMission}，这个念头像一根烧热的钉子，顺着脊背一路钉进胸口。`;
}

function buildThemeParagraph(plan: ChapterPlan, themeHistory: ThemeHistory, leadName: string): string {
  const latest = themeHistory.timeline.at(-1);
  const themeHint = latest ? `${latest.theme}，而不是${latest.antiTheme}` : plan.thematicQuestion;
  return `${leadName}很清楚，眼前压上来的不只是一桩小事，而是 ${themeHint}。每往前走一步，就更难假装自己不用付代价。`;
}

function pickSupportName(scene: SceneBlueprintItem, supportName: string | null): string {
  if (supportName && scene.opposingForce.includes(supportName)) {
    return supportName;
  }
  if (scene.opposingForce.trim().length > 0 && !/规则|制度|环境|现实|命运|压力/u.test(scene.opposingForce)) {
    return scene.opposingForce;
  }
  return supportName ?? "对方";
}

function inferConflictFocus(scene: SceneBlueprintItem): string {
  const text = `${scene.conflict} ${scene.cost} ${scene.newInformation.join(" ")}`;
  if (/身份|资格|门槛|标签/u.test(text)) return "资格";
  if (/资源|配额|供给|线索|证据|机会/u.test(text)) return "资源";
  if (/规则|规矩|制度/u.test(text)) return "规则";
  if (/抢|夺|拿走|扣下/u.test(text)) return "抢夺";
  if (/代价|后果|报复/u.test(text)) return "代价";
  return "处境";
}

function inferConsequenceBeat(scene: SceneBlueprintItem): string {
  const text = `${scene.cost} ${scene.result}`;
  if (/断供|资源|配额|供给|机会/u.test(text)) return "到手的资源会被一点点掐断";
  if (/危险|任务|处分|处置|风险/u.test(text)) return "后面等着的不会是安生日子";
  if (/记恨|打压|报复|盯上/u.test(text)) return "从这一刻起，会有人专门盯着往下摁";
  return "这一步争回来的东西，后面都会变成更重的账";
}

function buildDialoguePressure(scene: SceneBlueprintItem, supportName: string): string {
  if (scene.styleDirective.includes("羞辱")) {
    return `“你也配碰这点东西？”${supportName}开口时留不下半点余地，像是专挑最难堪的地方往下踩。`;
  }
  if (scene.styleDirective.includes("隐患") || /规则|规矩|制度/u.test(scene.conflict)) {
    return `“规矩就是规矩。”${supportName}声音不高，却像冷水一样兜头浇下来。`;
  }
  if (scene.styleDirective.includes("爆发") || /反击|对抗/u.test(scene.conflict)) {
    return `“你还真敢伸手？”${supportName}盯着${scene.pov}，声音里已经带了火。`;
  }
  return `“到此为止。”${supportName}盯着${scene.pov}，话没说满，压迫却已经先落了下来。`;
}

function buildEstablishingScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  const unfairnessHint = inferConflictFocus(scene);
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${leadName}站在队伍最末，看着好东西一件件从自己眼前流走。轮到${leadName}时，落到手里的只剩最差的一份，轻得像是在提醒${leadName}：这里的${unfairnessHint}从来不是替弱者准备的。`,
    buildDialoguePressure(scene, supportName),
    `${leadName}没有立刻抬头，只把那点可怜的份额攥紧。${leadName}忍着没出声，眼睛却死死盯住手里的东西，像只要一松手，这点东西也会被人拿走。火不是没有，只是${leadName}知道这把火现在烧出来，先烧到的只会是自己。`,
    `${scene.turn}。${scene.newInformation.join("，") || "所有人都看得出来，这里的规则从来不打算给弱者留余地"}。`,
  ];
}

function buildEscalationScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${supportName}偏偏挑在人最多的时候伸手，像是生怕别人看不见${leadName}被踩在脚下。那只手一探出来，抢的不只是眼前这一点东西，也是${leadName}仅剩的体面。`,
    buildDialoguePressure(scene, supportName),
    `${leadName}盯着那只手，喉咙里像压着一块滚热的石头。只要再低一次头，今天丢掉的就不只是这点东西，而是以后每一次抬头的资格。`,
    `${scene.turn}。周围那些看热闹的目光一点点压上来，把${leadName}逼到角落里，逼得${leadName}不是继续忍下去，就是顶回去。`,
    `${scene.result}。${scene.relationshipChange}。`,
  ];
}

function buildClimaxScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${supportName}的手已经伸到${leadName}眼前，几乎要碰到${leadName}拼命才留住的东西。周围的笑声像针，一根根往背上扎。`,
    buildDialoguePressure(scene, supportName),
    `${leadName}没再解释。心里那根绷到极限的线，终于断了。`,
    `${leadName}先动手，动作比念头更快。扣腕，发力，硬生生把东西夺回来。对方不肯罢休，场面立刻撞向最硬的一处。${leadName}这一出手，等于当众把“你不配”这句话撕了回去。`,
    `${scene.result}。可那点短暂的痛快刚冒头，寒意就已经跟了上来：${scene.cost}。`,
    `${leadName}这一拳打出去，争的不只是眼前这点东西，也是以后还肯不肯继续被人踩着过活。${scene.relationshipChange}。`,
  ];
}

function buildConsequenceScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  const consequenceBeat = inferConsequenceBeat(scene);
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${leadName}把刚抢回来的东西攥在掌心，冷意还没散，场子里的风就先冷了下来。${supportName}一开口，所有人都知道，真正的后果现在才开始。`,
    buildDialoguePressure(scene, supportName),
    `${scene.turn}。这不是一句空话，而是当场落下来的处置：${scene.cost}。${consequenceBeat}。`,
    `${leadName}想争，可对方留给${leadName}的不是解释空间，而是硬邦邦的结果。${scene.result}。`,
    `${scene.relationshipChange}。那点刚刚赢回来的快意一下子被压成了更长的阴影，${leadName}终于看明白，眼前这口气能争回来，后面的日子却会更难熬。`,
  ];
}

function buildGenericScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${leadName}很清楚，眼前这一步其实是在替后面的路探深浅。${scene.goal}。`,
    `${supportName}不给${leadName}轻松落地的机会。${scene.conflict}。`,
    `${scene.decision}。`,
    `${scene.turn}。${scene.result}。`,
    `${scene.cost}。${scene.thematicTension}。`,
  ];
}

function sceneToParagraphs(
  scene: SceneBlueprintItem,
  leadName: string,
  supportName: string | null,
): string[] {
  const partner = pickSupportName(scene, supportName);
  const label = `${scene.goal} ${scene.styleDirective} ${scene.thematicTension} ${scene.cost}`;

  if (scene.sceneNumber === 1 || /建立|压抑|分发|处境/u.test(label)) {
    return buildEstablishingScene(scene, leadName, partner);
  }
  if (scene.sceneNumber === 2 || /抢夺|羞辱|升级|逼迫/u.test(label)) {
    return buildEscalationScene(scene, leadName, partner);
  }
  if (scene.sceneNumber === 3 || /爆发|反击|最强冲突|夺回/u.test(label)) {
    return buildClimaxScene(scene, leadName, partner);
  }
  if (scene.sceneNumber === 4 || /代价|隐患|后果|打压/u.test(label)) {
    return buildConsequenceScene(scene, leadName, partner);
  }

  return buildGenericScene(scene, leadName, partner);
}

function buildEndingParagraph(plan: ChapterPlan, leadName: string): string {
  return `${leadName}知道这一步还远远不是翻身，只是把路从死水里撬开了一道缝。${plan.gateNote}`;
}

function buildSummary(plan: ChapterPlan): string {
  return `本章工作稿围绕“${plan.chapterMission}”展开，通过 ${plan.sceneBlueprint.length} 个场景推进冲突、选择与代价。`;
}

export class DraftGenerator {
  generate(
    plan: ChapterPlan,
    characterHistory: ReadonlyArray<CharacterHistory>,
    themeHistory: ThemeHistory,
  ): ChapterDraft {
    const title = titleFromPlan(plan);
    const lead = pickLeadCharacter(characterHistory);
    const support = pickSupportCharacter(characterHistory, lead?.name ?? null);
    const leadName = lead?.name ?? "主角";
    const supportName = support?.name ?? "对方";

    const paragraphs: string[] = [
      buildOpeningParagraph(plan, leadName),
      buildThemeParagraph(plan, themeHistory, leadName),
      ...plan.sceneBlueprint.flatMap((scene) => sceneToParagraphs(scene, leadName, supportName)),
      buildEndingParagraph(plan, leadName),
    ];

    return {
      chapterNumber: plan.targetChapterNumber,
      title,
      content: paragraphs.join("\n\n"),
      summary: buildSummary(plan),
      basedOnPlan: plan.targetChapterNumber,
    };
  }
}
