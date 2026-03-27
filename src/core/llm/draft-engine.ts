import type {
  ChapterDraft,
  ChapterPlan,
  CharacterHistory,
  SceneBlueprintItem,
  StyleProfile,
  ThemeHistory,
} from "../types.js";
import { DraftGenerator } from "../modules/draft-generator.js";
import { createChatCompletionWithRetry, createOpenAIClient, resolveOpenAIConfig } from "./openai-shared.js";

export interface WriterGenerationInput {
  readonly plan: ChapterPlan;
  readonly characterHistory: ReadonlyArray<CharacterHistory>;
  readonly themeHistory: ThemeHistory;
}

export interface WriterAgent {
  readonly name: string;
  generate(input: WriterGenerationInput): Promise<ChapterDraft>;
}

export type DraftGenerationInput = WriterGenerationInput;
export type DraftWriter = WriterAgent;

export class HeuristicWriterAgent implements WriterAgent {
  readonly name = "heuristic";
  private readonly generator = new DraftGenerator();

  async generate(input: WriterGenerationInput): Promise<ChapterDraft> {
    return this.generator.generate(input.plan, input.characterHistory, input.themeHistory);
  }
}

function trimLine(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function compactCharacterDossiers(characterHistory: ReadonlyArray<CharacterHistory>): string {
  return characterHistory
    .filter((entry) => entry.latestState.presentInChapter)
    .map((entry) => {
      const latest = entry.latestState;
      const timeline = entry.timeline.slice(-2).map((item) => trimLine(
        `第${item.chapterNumber}章：欲望=${item.desire}；恐惧=${item.fear}；最近选择=${item.recentDecision}；代价=${item.decisionCost}；弧线=${item.arcProgress}`,
      ));

      return [
        `- ${entry.name}`,
        `  当前欲望：${latest.desire}`,
        `  当前恐惧：${latest.fear}`,
        `  当前误判：${latest.misbelief}`,
        `  最近决定：${latest.recentDecision}`,
        `  已付代价：${latest.decisionCost}`,
        `  关系变化：${latest.relationshipShift.join("；") || "暂无显著变化"}`,
        `  弧线进度：${latest.arcProgress}`,
        ...(timeline.length > 0 ? [`  最近轨迹：${timeline.join(" | ")}`] : []),
      ].join("\n");
    })
    .join("\n");
}

function compactThemeHistory(themeHistory: ThemeHistory): string {
  const latest = themeHistory.timeline.slice(-3);
  if (latest.length === 0) {
    return "- 暂无历史主题记录";
  }

  return latest
    .map((entry) => (
      `- 第${entry.chapterNumber}章：主题=${entry.theme}；反主题=${entry.antiTheme}；主题信号=${entry.themeSignalCount}；反主题信号=${entry.antiSignalCount}；解释=${trimLine(entry.interpretation)}`
    ))
    .join("\n");
}

function renderStyleProfile(style: StyleProfile): string {
  return [
    `- 叙述风格：${style.narrationStyle}`,
    `- 对白风格：${style.dialogueStyle}`,
    `- 节奏：${style.pacingProfile}`,
    `- 描写密度：${style.descriptionDensity}`,
    `- 语气约束：${style.toneConstraints.join("；")}`,
  ].join("\n");
}

function renderSceneBlueprint(scene: SceneBlueprintItem): string {
  return [
    `【场景 ${scene.sceneNumber} / POV：${scene.pov}】`,
    `- 场景目标：${scene.goal}`,
    `- 冲突：${scene.conflict}`,
    `- 推动角色：${scene.drivingCharacter}`,
    `- 阻碍力量：${scene.opposingForce}`,
    `- 必须发生的选择：${scene.decision}`,
    `- 必须显形的代价：${scene.cost}`,
    `- 转折：${scene.turn}`,
    `- 结果：${scene.result}`,
    `- 新信息：${scene.newInformation.join("；")}`,
    `- 情绪变化：${scene.emotionalShift}`,
    `- 关系变化：${scene.relationshipChange}`,
    `- 主题张力：${scene.thematicTension}`,
    `- 价值对立：${scene.valuePositionA} vs ${scene.valuePositionB}`,
    `- 本场景立场：${scene.sceneStance}`,
    `- 风格提示：${scene.styleDirective}`,
  ].join("\n");
}

function buildWriterPrompt(input: WriterGenerationInput): string {
  const styleProfile = renderStyleProfile(input.plan.styleProfile);
  const sceneBlueprint = input.plan.sceneBlueprint.map(renderSceneBlueprint).join("\n\n");
  const characters = compactCharacterDossiers(input.characterHistory);
  const themes = compactThemeHistory(input.themeHistory);

  return [
    "你现在不是在解释计划，而是在写一章真正可读的中文网文正文。",
    "你要把结构化计划隐藏在正文内部，让读者只看到人物、动作、对白、压迫、反击和代价。",
    "",
    "写作总目标：",
    `- 章节任务：${input.plan.chapterMission}`,
    `- 读者体验目标：${input.plan.readerGoal}`,
    `- 主题意图：${input.plan.themeIntent}`,
    `- 主题问题：${input.plan.thematicQuestion}`,
    `- Gate 提醒：${input.plan.gateNote}`,
    "",
    "人物当前状态：",
    characters,
    "",
    "最近主题轨迹：",
    themes,
    "",
    "风格约束：",
    styleProfile,
    "",
    "场景蓝图（必须按顺序写完，每个场景都要落实选择、冲突、转折、结果与代价）：",
    sceneBlueprint,
    "",
    "硬性要求：",
    "1. 直接输出小说正文，不要解释计划，不要复述字段名。",
    "2. 保留场景锚点，使用格式：`【场景 N / POV：角色名】`。",
    "3. 每个场景都必须是可读正文，不允许把 goal/conflict/decision 原样翻译成说明句。",
    "4. 主题只能通过行为、选择、对白、后果体现，禁止直接讲道理。",
    "5. 爽点必须靠动作和现场反馈成立，代价必须在本章内落地，不能只口头预告。",
    "6. 对白必须区分角色口吻：压迫者、挑衅者、反击者不能同声同气。",
    "7. 少设定讲解，少抽象感慨，优先写现场、动作、身体反应、围观反应。",
    "8. Scene 3 必须是最强冲突点，Scene 4 必须把代价钉死，不能停在纯爽上。",
    "9. 不要新增场景数量，不要改 POV，不要跳过任何场景。",
    "",
    "输出格式必须严格如下：",
    "TITLE: <章节标题>",
    "CONTENT:",
    "<从第一段正文开始，到最后一个场景结束；不要输出额外说明>",
  ].join("\n");
}

function parseLlmWriterOutput(raw: string, fallbackChapterNumber: number): ChapterDraft {
  const titleMatch = raw.match(/TITLE:\s*(.+)/u);
  const contentMatch = raw.match(/CONTENT:\s*([\s\S]+)/u);
  const title = (titleMatch?.[1]?.trim() || `第${fallbackChapterNumber}章`)
    .replace(new RegExp(`^第\\s*${fallbackChapterNumber}\\s*章[:：\\s_-]*`, "u"), "")
    .replace(/^第[一二三四五六七八九十百千0-9]+章[:：\s_-]*/u, "")
    .trim() || `第${fallbackChapterNumber}章`;
  const content = contentMatch?.[1]?.trim() || raw.trim();

  return {
    chapterNumber: fallbackChapterNumber,
    title,
    content,
    summary: `由 LLM 根据章节规划直接生成的第 ${fallbackChapterNumber} 章工作稿。`,
    basedOnPlan: fallbackChapterNumber,
  };
}

export class OpenAIWriterAgent implements WriterAgent {
  readonly name = "openai";
  private readonly client;
  private readonly model: string;

  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.client = createOpenAIClient(config);
    this.model = config.model;
  }

  async generate(input: WriterGenerationInput): Promise<ChapterDraft> {
    const response = await createChatCompletionWithRetry(this.client, {
      model: this.model,
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content: [
            "你是 Storylab 的中文小说 writer。",
            "你的职责是把章节计划写成真正可读的网文正文，而不是输出提纲、评审、解释或字段翻译。",
            "你必须遵守场景顺序与关键约束，但要让结构隐藏在叙事内部。",
          ].join(" "),
        },
        {
          role: "user",
          content: buildWriterPrompt(input),
        },
      ],
    }, {
      label: "writer",
      maxAttempts: 3,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    if (!raw.trim()) {
      throw new Error("LLM returned empty writer output");
    }

    return parseLlmWriterOutput(raw, input.plan.targetChapterNumber);
  }
}

export function createWriterAgentFromEnv(): WriterAgent {
  const provider = process.env.STORYLAB_WRITER_PROVIDER?.trim().toLowerCase()
    ?? process.env.STORYLAB_DRAFT_PROVIDER?.trim().toLowerCase()
    ?? "heuristic";
  if (provider === "openai") {
    const config = resolveOpenAIConfig("STORYLAB_WRITER") ?? resolveOpenAIConfig("STORYLAB_DRAFT");
    if (!config) {
      throw new Error(
        "启用 STORYLAB_WRITER_PROVIDER=openai 时，必须提供 STORYLAB_WRITER_OPENAI_API_KEY 或 STORYLAB_OPENAI_API_KEY，以及对应的 MODEL。",
      );
    }

    return new OpenAIWriterAgent(config);
  }

  return new HeuristicWriterAgent();
}

export const HeuristicDraftWriter = HeuristicWriterAgent;
export const OpenAIDraftWriter = OpenAIWriterAgent;
export const createDraftWriterFromEnv = createWriterAgentFromEnv;
