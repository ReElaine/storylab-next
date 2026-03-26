import type { ChapterDraft, ChapterPlan, CharacterHistory, SceneBlueprintItem, ThemeHistory } from "../types.js";

function titleFromPlan(plan: ChapterPlan): string {
  const titles = ["门后的余温", "代价开始说话", "灰烬里的回声", "火种的第二次呼吸", "沉默比真相更热"];
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
  return `${leadName}没法再把头低回去了。${plan.chapterMission}，这念头像烧红的铁钉，顺着脊背一路钉进胸口。`;
}

function buildThemeParagraph(plan: ChapterPlan, themeHistory: ThemeHistory, leadName: string): string {
  const latest = themeHistory.timeline.at(-1);
  const themeHint = latest ? `${latest.theme}，而不是 ${latest.antiTheme}` : plan.thematicQuestion;
  return `${leadName}心里清楚，眼前压上来的不只是一次小小的争执，而是 ${themeHint}。她每往前走一步，就更难假装自己还能不付代价。`;
}

function pickSupportName(scene: SceneBlueprintItem, supportName: string | null): string {
  if (scene.opposingForce.includes("陈师兄")) return "陈师兄";
  if (scene.opposingForce.includes("赵执事")) return "赵执事";
  return supportName ?? scene.opposingForce;
}

function inferConflictFocus(scene: SceneBlueprintItem): string {
  const text = `${scene.conflict} ${scene.cost} ${scene.newInformation.join(" ")}`;
  if (/杂灵根|资质/u.test(text)) return "资质";
  if (/灵石|资源/u.test(text)) return "资源";
  if (/规矩|门规/u.test(text)) return "规矩";
  if (/抢|夺/u.test(text)) return "抢夺";
  if (/代价|后果/u.test(text)) return "代价";
  return "规矩";
}

function inferConsequenceBeat(scene: SceneBlueprintItem): string {
  const text = `${scene.cost} ${scene.result}`;
  if (/断供|资源|配额/u.test(text)) return "到手的资源会被一点点掐断";
  if (/危险|矿|任务/u.test(text)) return "后面等着她的不会是安生日子";
  if (/记恨|打压/u.test(text)) return "从这一刻起，有人会专门盯着她往下摁";
  return "她接下来要付的账，只会比现在更重";
}

function buildDialoguePressure(scene: SceneBlueprintItem, supportName: string): string {
  if (supportName === "陈师兄") {
    return `“废物，拿稳了，别掉地上。”${supportName}嘴角一撇，话里全是踩人的熟练劲。`;
  }
  if (supportName === "赵执事") {
    return `“规矩就是规矩。”${supportName}声音不高，却像冰水一样兜头浇下来。`;
  }
  if (scene.styleDirective.includes("羞辱")) {
    return `“你也配碰这点东西？”${supportName}张口就压了下来，话里一点余地都不留。`;
  }
  if (scene.styleDirective.includes("爽点")) {
    return `“你还真敢伸手？”${supportName}盯着她，声音里已经带了火。`;
  }
  if (scene.styleDirective.includes("隐患")) {
    return `“规矩就是规矩。”${supportName}开口时声音不高，却一下子把场子压冷了。`;
  }
  return `“到此为止？”${supportName}盯着她，话没说满，压迫却已经落了下来。`;
}

function buildEstablishingScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  const unfairnessHint = inferConflictFocus(scene);
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${leadName}站在队伍最末，眼看着好东西一件件从自己眼前流走。轮到她时，落到手里的只剩最差的一份，轻得像是在提醒她，这地方的${unfairnessHint}从来不是替她这种人准备的。`,
    `${buildDialoguePressure(scene, supportName)}`,
    `${leadName}没有立刻抬头，只把那点可怜的份额攥紧。她忍着没出声，眼睛却死死盯住自己的灵石，像是只要一松手，这点东西都会被人拿走。她不是没火，只是知道这把火现在烧出来，先烧到的只会是自己。再多说一句，赵执事就能顺手把这点东西也收回去，再扣她一个“不敬执事”的名头。`,
    `${scene.turn}。那一点发闷的情绪卡在胸口，像钝刀子来回磨。${scene.newInformation.join("；") || "所有人都看得出来，这地方的规矩从来不是给弱者留的"}。`,
  ];
}

function buildEscalationScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${supportName}偏偏挑在人最多的时候伸手，像是生怕别人看不见${leadName}被踩在脚下。那只手一探出来，抢的不只是灵石，也是她仅剩那点体面。`,
    `${buildDialoguePressure(scene, supportName)}`,
    `${leadName}盯着那只手，喉咙里像压着一块滚烫的石头。她知道自己只要再低一次头，今天丢掉的就不只是手里这点东西，而是以后每一次抬头的资格。`,
    `${scene.turn}。周围那些看热闹的目光一点点压上来，把她往墙角里逼，逼得她不是忍下去，就是顶回去。`,
    `${scene.result}。${scene.relationshipChange}。`,
  ];
}

function buildClimaxScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${supportName}的手已经伸到了 ${leadName}眼前，指尖几乎要碰到那点她拼命才留住的东西。周围的嗤笑声像针，一根根往背上扎。`,
    `${buildDialoguePressure(scene, supportName)}`,
    `${leadName}没再解释。她心里那根绷到极限的线，终于断了。`,
    `她先动手，动作比念头更快。扣腕，发力，硬生生把东西夺回来。对方不肯罢休，场面立刻撞向最硬的一处。她这一出手，就等于当众把“废物”两个字撕了回去。`,
    `${scene.result}。可那点短暂的爽快刚冒头，寒意就已经跟了上来：${scene.cost}。`,
    `她这一拳打出去，争的不只是三块灵石，也是以后还肯不肯继续被人踩着过活。${scene.relationshipChange}。`,
  ];
}

function buildConsequenceScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  const consequenceBeat = inferConsequenceBeat(scene);
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${leadName}把刚夺回来的东西攥在掌心，冰凉的触感还没捂热，场子里的风就先冷了下来。${supportName}一开口，所有人都知道，真正的后果现在才开始。`,
    `${buildDialoguePressure(scene, supportName)}`,
    `${scene.turn}。这不是一句空话，而是当场落下来的处置：${scene.cost}。${consequenceBeat}。`,
    `${leadName}想争，可对方给她留下的不是解释空间，而是硬邦邦的结果。${scene.result}。`,
    `${scene.relationshipChange}。那点刚刚赢回来的快意一下子被压成了更长的阴影，她终于看明白，眼前这口气能争回来，后面的日子却会更难熬。`,
  ];
}

function buildGenericScene(scene: SceneBlueprintItem, leadName: string, supportName: string): string[] {
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `${leadName}很清楚，眼前这一小步其实是在替后面的路探深浅。${scene.goal}。`,
    `${supportName}不给她轻松落地的机会。${scene.conflict}。`,
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

  if (scene.sceneNumber === 1 || /建立|压抑|分发/u.test(label)) {
    return buildEstablishingScene(scene, leadName, partner);
  }
  if (scene.sceneNumber === 2 || /抢夺|羞辱|升级/u.test(label)) {
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
  return `${leadName}知道这一步还远远不是翻身，只是把路从死水里撬开了一条缝。${plan.gateNote}`;
}

function buildSummary(plan: ChapterPlan): string {
  return `本章草稿围绕“${plan.chapterMission}”展开，通过 ${plan.sceneBlueprint.length} 个场景推进冲突、选择与代价。`;
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
