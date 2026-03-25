import type { ChapterDraft, ChapterPlan, CharacterHistory, ThemeHistory } from "../types.js";

function titleFromPlan(plan: ChapterPlan): string {
  const titles = [
    "门后的余温",
    "代价开始说话",
    "灰烬里的回声",
    "火种的第二次呼吸",
    "沉默比真相更烫",
  ];
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
  return `${leadName}没有办法假装上一章什么都没发生。${plan.chapterMission}，这句话在她脑子里盘旋了整整一路，像一枚烫过的钉子，扎得她连呼吸都不敢放松。`;
}

function buildThemeParagraph(themeHistory: ThemeHistory, leadName: string): string {
  const latest = themeHistory.timeline[themeHistory.timeline.length - 1];
  if (!latest) {
    return `${leadName}知道事情不会只停留在表面。真正逼近她的，从来不是单一事件，而是事件背后那道迟早要选边站的价值裂缝。`;
  }

  return `${leadName}隐约明白，这一章真正压上来的不是单纯的危险，而是“${latest.theme}”与“${latest.antiTheme}”之间的碰撞。她越想把事情处理得干净，代价就越像影子一样贴得更近。`;
}

function sceneToParagraphs(
  scene: ChapterPlan["sceneBlueprint"][number],
  leadName: string,
  supportName: string | null,
): string[] {
  const partner = supportName ?? "另一个人";

  return [
    `${scene.objective}。${leadName}先注意到的不是答案，而是空气里细微的不对劲。她知道局面已经被推到了新的拐点前，只要再往前半步，之前勉强维持的平衡就会彻底失效。`,
    `${scene.tension}。${partner}没有立刻替她做决定，只是把问题原样推回来，逼她亲口承认自己想要什么、又准备失去什么。`,
    `${scene.reveal}。那一刻${leadName}终于意识到，事情比她以为的更早开始，也比她愿意承认的更深。`,
    `“你现在还想往前走吗？”${partner}低声问。${leadName}没有马上回答，因为${scene.endingBeat}。`,
  ];
}

function buildEndingParagraph(plan: ChapterPlan, leadName: string): string {
  return `${leadName}知道自己还没准备好，但章节最后留给她的从来不是“等准备好了再说”。${plan.readerGoal}。至于${plan.gateNote}，那更像一行事后才会被看懂的提示。`;
}

function buildSummary(plan: ChapterPlan): string {
  return `本章草稿围绕“${plan.chapterMission}”展开，通过 ${plan.sceneBlueprint.length} 个场景，把风险、关系和主题压力同时向前推进。`;
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
      buildThemeParagraph(themeHistory, leadName),
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
