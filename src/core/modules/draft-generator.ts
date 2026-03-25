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
  return `${leadName}没有办法假装上一章什么都没发生。${plan.chapterMission}，这句话像一枚烫过的钉子，一路钉在她的胸口。`;
}

function buildThemeParagraph(themeHistory: ThemeHistory, leadName: string): string {
  const latest = themeHistory.timeline[themeHistory.timeline.length - 1];
  if (!latest) {
    return `${leadName}知道，真正逼近她的从来不只是事件本身，而是事件背后那道迟早要她选边站的价值裂缝。`;
  }

  return `${leadName}隐约明白，这一章真正压上来的不是单纯的危险，而是“${latest.theme}”与“${latest.antiTheme}”之间的碰撞。她越想把事情处理得干净，代价就越像影子一样贴近。`;
}

function sceneToParagraphs(
  scene: SceneBlueprintItem,
  leadName: string,
  supportName: string | null,
): string[] {
  const partner = supportName ?? "另一个人";

  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】${scene.goal}。${leadName}先注意到的不是答案，而是空气里一丝不对劲的停顿。`,
    `冲突很快露出轮廓：${scene.conflict}。${partner}没有替她做决定，只是把问题原样推回来，逼她承认自己真正想要什么，又准备失去什么。`,
    `转折发生在她意识到：${scene.turn}。这一刻让她没法再把自己当成旁观者。`,
    `结果是 ${scene.result}。新的信息开始浮出：${scene.newInformation.join("；") || "没有新的信息被整理出来"}。情绪也从 ${scene.emotionalShift}。`,
  ];
}

function buildEndingParagraph(plan: ChapterPlan, leadName: string): string {
  return `${leadName}知道自己还没准备好，但章节最后留给她的从来不是“等准备好了再说”。${plan.readerGoal}${plan.gateNote}`;
}

function buildSummary(plan: ChapterPlan): string {
  return `本章草稿围绕“${plan.chapterMission}”展开，通过 ${plan.sceneBlueprint.length} 个场景，把冲突、关系与主题压力同时往前推进。`;
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
