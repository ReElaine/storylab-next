import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BookRecord, CharacterSeed, HumanGate, StyleGuide, ThemeSeed, WorldRulesConfig } from "../types.js";

export async function createDemoWorkspace(workspaceDir: string): Promise<string> {
  const bookId = "ember-fall";
  const bookDir = join(workspaceDir, "books", bookId);
  const storyDir = join(bookDir, "story");
  const chaptersDir = join(bookDir, "chapters");

  await Promise.all([
    mkdir(join(storyDir, "characters"), { recursive: true }),
    mkdir(join(storyDir, "themes"), { recursive: true }),
    mkdir(join(storyDir, "style"), { recursive: true }),
    mkdir(join(storyDir, "canon"), { recursive: true }),
    mkdir(join(storyDir, "human-gates"), { recursive: true }),
    mkdir(chaptersDir, { recursive: true }),
  ]);

  const book: BookRecord = {
    id: bookId,
    title: "余烬坠落",
    authorVision: "A pressure-heavy urban fantasy where every victory costs intimacy.",
    targetReaders: ["成长型剧情读者", "人物驱动读者", "情绪推进读者"],
    targetLength: 120,
    language: "zh",
  };

  const characters: ReadonlyArray<CharacterSeed> = [
    {
      name: "林炽",
      role: "protagonist",
      baselineDesire: "证明自己配得上继承母亲留下的火种",
      baselineFear: "一旦失控就会伤到身边的人",
      baselineMisbelief: "只有独自承受代价才算真正强大",
      voiceNotes: "说话克制，遇到压力会省略主语，像在压住情绪",
      relationshipMap: [{ target: "沈砚", status: "互相试探的盟友" }],
    },
    {
      name: "沈砚",
      role: "foil",
      baselineDesire: "找到失踪调查员留下的真相",
      baselineFear: "再次信错人",
      baselineMisbelief: "掌控信息就等于掌控局面",
      voiceNotes: "对白锋利，习惯追问，不轻易给完整答案",
      relationshipMap: [{ target: "林炽", status: "观察中的合作对象" }],
    },
  ];

  const themes: ReadonlyArray<ThemeSeed> = [
    {
      theme: "代价与亲密",
      antiTheme: "力量可以无损获得",
      valueConflict: "控制自己 vs 接受他人介入",
      keywords: ["代价", "失控", "靠近", "相信", "火种"],
      antiKeywords: ["轻易", "毫发无损", "理所当然"],
    },
  ];

  const styleGuide: StyleGuide = {
    narrativeVoice: "近距离第三人称，压迫感强，少解释，多让动作和环境渗出情绪",
    dialogueRule: "对白必须区分人物策略，不允许所有角色说话一个腔调",
    sentenceRhythm: "短句推进冲突，中句承接信息，长句只用于情绪波峰前后",
    descriptionDensity: "动作场景低描写密度，情绪停顿时提高感官描写",
    paragraphStrategy: "一段只承担一个推进功能，避免平均长度段落",
  };

  const gates: ReadonlyArray<HumanGate> = [
    { key: "opening", label: "开书确认", triggerChapter: 1, purpose: "确认卖点、主角欲望和世界入口足够清晰" },
    { key: "early-arc", label: "前三章检查", triggerChapter: 3, purpose: "确认钩子兑现速度、人物关系和主题方向" },
    { key: "midpoint", label: "中盘转折检查", triggerChapter: 30, purpose: "确认中盘转折前的筹码已经到位" },
    { key: "finale", label: "结尾收束检查", triggerChapter: 100, purpose: "确认主题兑现与结局收束" },
  ];

  const worldRules: WorldRulesConfig = {
    rules: [
      {
        ruleId: "no-modern-firearms",
        description: "旧城区火种线不应突然出现现代热武器解决冲突。",
        severity: "high",
        forbiddenPhrases: ["手枪", "步枪", "冲锋枪"],
        appliesWhenAnyPhrases: [],
        requiredPhrases: [],
      },
      {
        ruleId: "fire-seed-has-cost",
        description: "涉及火种觉醒的章节，必须明确写出疼痛、失控或代价信号。",
        severity: "medium",
        forbiddenPhrases: [],
        appliesWhenAnyPhrases: ["火种", "余烬", "火"],
        requiredPhrases: ["疼", "失控", "代价", "烫"],
      },
    ],
  };

  const chapter = [
    "# 第1章 灰烬里的门",
    "",
    "林炽在旧城区的走廊尽头停下脚步。墙皮像被热气反复舔过，卷起来，一层层掉在地上。",
    "",
    "她本来只是想确认母亲留下的钥匙还能不能打开那扇铁门，可钥匙刚插进去，门后就传来一声像有人压着喉咙的闷咳。",
    "",
    "“你一个人来？”门后的人问。",
    "",
    "林炽没有立刻回答。她决定先不报出自己的名字，只把掌心贴在生锈的门板上，感受另一侧传来的热度。那热度不对，像火，但更像某种快要醒来的东西。",
    "",
    "门开了一条缝，沈砚站在暗处，袖口上沾着没擦干净的灰。他看了她一眼，目光先落在钥匙，再落在她指节被烫出的红痕上。",
    "",
    "“你要找的不是门。”沈砚说，“你要找的是代价。”",
    "",
    "林炽心里一沉，却还是把门推开了。她想知道母亲到底把什么留给了自己，即使这会让她失控。",
    "",
    "门后的房间没有窗，只有一盏快灭的旧灯。灯下摆着一只裂开的铜盆，盆底躺着一团像余烬一样跳动的火。",
    "",
    "林炽刚靠近，那团火就顺着空气猛地窜起，像认出了她。她听见耳边有人低声说：别碰，可她还是伸了手。",
    "",
    "指尖触到火的瞬间，墙上的影子全部活了过来。",
    "",
    "沈砚一步冲上来拽住她，却只来得及把她往后拖半步。那团火已经钻进了她的手腕，像一枚烙进去的印记。",
    "",
    "林炽疼得几乎跪下去。她知道自己做了决定，也知道代价已经开始。",
    "",
    "可真正让她发冷的，不是疼，而是那团火在她体内亮起时，她竟然听见了母亲多年前失踪那一夜的门铃声。",
    "",
    "那声音意味着一件她从来不敢承认的事：母亲可能不是失踪，而是被这团火带走了。",
  ].join("\n");

  await Promise.all([
    writeFile(join(bookDir, "book.json"), JSON.stringify(book, null, 2), "utf-8"),
    writeFile(join(storyDir, "characters", "cast.json"), JSON.stringify(characters, null, 2), "utf-8"),
    writeFile(join(storyDir, "themes", "theme-manifest.json"), JSON.stringify(themes, null, 2), "utf-8"),
    writeFile(join(storyDir, "style", "style-guide.json"), JSON.stringify(styleGuide, null, 2), "utf-8"),
    writeFile(join(storyDir, "canon", "world-rules.json"), JSON.stringify(worldRules, null, 2), "utf-8"),
    writeFile(join(storyDir, "human-gates", "gates.json"), JSON.stringify(gates, null, 2), "utf-8"),
    writeFile(join(chaptersDir, "0001_灰烬里的门.md"), chapter, "utf-8"),
  ]);

  return workspaceDir;
}
