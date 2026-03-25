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

function buildThemeParagraph(plan: ChapterPlan, themeHistory: ThemeHistory, leadName: string): string {
  const latest = themeHistory.timeline[themeHistory.timeline.length - 1];
  const themeHint = latest ? `${latest.theme}与${latest.antiTheme}` : plan.thematicQuestion;
  return `${leadName}很清楚，这一章真正压上来的不只是事件本身，而是 ${themeHint} 的正面碰撞。她每向前一步，就更难假装自己还能不付代价。`;
}

function sceneToParagraphs(
  scene: SceneBlueprintItem,
  leadName: string,
  supportName: string | null,
): string[] {
  const partner = supportName ?? scene.opposingForce;

  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】驱动场景的人是 ${scene.drivingCharacter}。他/她此刻的目标是：${scene.goal}。叙述必须遵守：${scene.styleDirective}。`,
    `阻碍来自 ${scene.opposingForce}。真正推动本场景的不是事情发生了，而是 ${scene.drivingCharacter} 必须做出决定：${scene.decision}。`,
    `${partner}不会让这个决定轻松落地，因为冲突是：${scene.conflict}。一旦做出选择，代价就会立刻出现：${scene.cost}。`,
    `这一场真正的位移发生在：${scene.turn}。结果是 ${scene.result}。关系变化体现为：${scene.relationshipChange}。`,
    `本场景承载的主题冲突是 ${scene.thematicTension}。价值对立两端分别是“${scene.valuePositionA}”与“${scene.valuePositionB}”，而场景当前站向 ${scene.sceneStance}。`,
    `新的信息浮出：${scene.newInformation.join("；") || "暂无"}。情绪变化是 ${scene.emotionalShift}。这些内容必须通过动作、对话和后果体现，而不是仅靠旁白解释。`,
  ];
}

function buildEndingParagraph(plan: ChapterPlan, leadName: string): string {
  return `${leadName}知道自己还没准备好，但章节最后留给她的从来不是“等准备好了再说”。${plan.readerGoal} 风格上继续保持：${plan.styleProfile.toneConstraints.join("，")}。${plan.gateNote}`;
}

function buildSummary(plan: ChapterPlan): string {
  return `本章草稿围绕“${plan.chapterMission}”展开，通过 ${plan.sceneBlueprint.length} 个场景，把角色决策、主题冲突和风格约束同时推进。`;
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
