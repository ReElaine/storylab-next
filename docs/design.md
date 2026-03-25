# storylab-next 详细设计

## 设计目标

这个项目要解决的不是“能不能写一章”，而是“怎样建立一套更适合高质量小说生产的独立架构”。

当前设计目标：

1. 强化读者体验评审
2. 强化人物动态状态
3. 引入场景级规划
4. 引入主题追踪与主题冲突
5. 引入更明确的风格控制
6. 引入人工介入点
7. 建立跨章累计状态
8. 让这些中间层真实影响正文生成与修订

## 当前架构层次

### CLI 层

- `init-demo`
- `run`
- `plan-next`
- `draft-from-plan`
- `draft-cycle`
- `revise-cycle`

### Pipeline 层

- `StorylabRunner.run()`
- `StorylabRunner.planNext()`
- `StorylabRunner.draftFromPlan()`
- `StorylabRunner.draftCycle()`
- `StorylabRunner.reviseCycle()`

### Store 层

负责：

- 读取书籍与章节
- 读取角色、主题、风格、gate 配置
- 管理 `story/` 目录输出
- 管理 `drafts/` 目录输出
- 读取与回写跨章累计状态

### Module 层

- `ScenePlanner`
- `CharacterEngine`
- `ThemeTracker`
- `StyleEngine`
- `ReaderExperienceCritic`
- `HumanReviewGatekeeper`
- `HistoryBuilder`
- `ChapterPlanner`
- `DraftGenerator`
- `SceneAuditor`

### Engine 层

分析：

- `HeuristicAnalysisEngine`
- `OpenAIAnalysisEngine`

规划：

- `HeuristicPlanningEngine`
- `OpenAIPlanningEngine`

起草：

- `HeuristicDraftWriter`
- `OpenAIDraftWriter`

修订：

- `HeuristicReviseEngine`
- `OpenAIReviseEngine`

## 数据结构

单章：

- `ScenePlanItem`
- `CharacterState`
- `ThemeReport`
- `StyleReport`
- `ReaderExperienceReport`
- `GateDecision`

跨章：

- `CharacterHistory`
- `ThemeHistory`
- `StoryMemory`

规划：

- `ChapterPlan`
- `SceneBlueprintItem`

修订：

- `BlockingGateStatus`
- `RevisionComparisonReport`
- `SceneRevisionExplanation`

## Character / Theme / Style 如何进入 generation pipeline

这部分是当前架构的核心，不再只是“报告层”。

### 1. Character 约束

每个 `sceneBlueprint` 现在至少包含：

- `drivingCharacter`
- `opposingForce`
- `decision`
- `cost`
- `relationshipChange`

这意味着 draft 和 revise 都必须回答：

- 谁在推动这个场景
- 谁在阻碍
- 角色做了什么决定
- 这个决定的代价是什么
- 关系怎样发生位移

Character Engine 不再只是“人物设定一致性检查”，而是开始决定 scene 如何被改写。

### 2. Theme 约束

每个 `sceneBlueprint` 现在至少包含：

- `thematicTension`
- `valuePositionA`
- `valuePositionB`
- `sceneStance`

这意味着 scene 不再只承担剧情推进，也必须承担价值冲突推进。

Theme Tracker 不再只是章后总结，而是会参与：

- planning 时的冲突设计
- draft 时的行为约束
- revise 时的局部重写方向

### 3. Style 约束

`ChapterPlan` 现在包含：

- `styleProfile`

每个 `sceneBlueprint` 还包含：

- `styleDirective`

这意味着 draft / revise 不再只是“参考一下风格说明”，而是必须消费结构化风格约束。

当前 style profile 重点约束：

- narration style
- dialogue style
- pacing profile
- description density
- tone constraints

## 章节规划设计

`planNext(bookId, targetChapterNumber)` 会读取累计状态，生成：

- chapter mission
- reader goal
- scene blueprint
- character intent
- theme intent
- thematic question
- style profile
- gate note

输出文件：

- `story/planning/chapter-XXXX.chapter-plan.json`

这个设计的意义，是把“过去发生了什么”和“下一章该怎么写”接起来。

## 起草设计

`draftFromPlan(bookId, targetChapterNumber)` 会读取：

- `chapter-plan.json`
- `character-history.json`
- `theme-history.json`

然后通过 `draft engine` 生成草稿并写入：

- `drafts/000X_<title>.md`

### draft 阶段必须消费的硬输入

- `sceneBlueprint.goal`
- `sceneBlueprint.conflict`
- `sceneBlueprint.turn`
- `sceneBlueprint.result`
- `sceneBlueprint.newInformation`
- `sceneBlueprint.emotionalShift`
- `sceneBlueprint.drivingCharacter`
- `sceneBlueprint.opposingForce`
- `sceneBlueprint.decision`
- `sceneBlueprint.cost`
- `sceneBlueprint.relationshipChange`
- `sceneBlueprint.thematicTension`
- `sceneBlueprint.valuePositionA`
- `sceneBlueprint.valuePositionB`
- `sceneBlueprint.sceneStance`
- `sceneBlueprint.styleDirective`
- `styleProfile`

这使得 `scene -> draft` 的约束开始变硬。

## scene-level revise 设计

这轮最关键的变化，是 revise 开始支持“只改一个 scene”。

### revise 输入

每个待修 scene 的输入包含：

- 原 scene 文本
- scene blueprint
- 该 scene 的 critique 问题列表
- character constraints
- theme constraints
- style constraints

### revise 行为

- 优先只处理 blocking scenes 或 issue scenes
- 不改其他 scene
- 只替换目标 scene 的文本
- 保持前后场景边界与顺序

### revise 输出

- revised draft
- scene-level comparison explanation

## comparison 设计

`comparison.json` 不再只是分数差，而是解释层。

当前会输出：

- reader score delta
- scene issue delta
- `sceneChanges`

每个 `sceneChanges` 条目包含：

- `beforeProblems`
- `rewriteStrategy`
- `characterChange`
- `themeChange`
- `styleChange`
- `beforeExcerpt`
- `afterExcerpt`

它回答的是：

- 为什么这个 scene 被改
- 改了什么
- 改好在哪

## Blocking Gate 最小版

当前已经引入最小 blocking gate：

- 如果 `reader experience` 关键分数过低
- 或 `scene audit` 出现 `high severity` 问题

则：

- `draft-cycle` / `revise-cycle` 会返回 blocking 状态
- 默认阻断继续
- 必须显式传入 `--override` 才能继续

而且 gate 现在会指出：

- 哪些 scene 导致 blocking
- 严重问题类型是什么

## 当前边界

已经完成：

- 单章增强分析
- 跨章累计状态
- 章节规划
- 起草
- 初版修订闭环
- scene-level revise 第一版
- scene-level comparison 第一版

仍需继续加强：

- heuristic revise 仍偏结构化改写
- style control 还可进一步内化到局部重写
- scene 内更细粒度的局部定位还不够
- 更成熟的 LLM rewrite 质量还未验证到位
