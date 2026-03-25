# storylab-next 详细设计

## 设计目标

本项目要解决的不是“能不能写一章”，而是“怎样建立一套更适合高质量小说生产的独立架构”。

当前设计目标：

1. 强化读者体验评审
2. 强化人物动态状态
3. 引入场景级规划
4. 引入主题追踪
5. 引入更明确的风格控制
6. 明确人类介入点
7. 建立跨章累计状态
8. 为后续高质量正文生成打底

## 当前架构层次

### CLI 层

- `init-demo`
- `run`
- `plan-next`
- `draft-from-plan`
- `draft-cycle`

### Pipeline 层

- `StorylabRunner.run()`
- `StorylabRunner.planNext()`
- `StorylabRunner.draftFromPlan()`
- `StorylabRunner.draftCycle()`

### Store 层

负责：

- 读取书籍与章节
- 读取角色、主题、风格、gate 配置
- 管理 story 目录输出
- 管理 draft 目录输出
- 读取累计状态

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

### Draft Engine 层

当前草稿生成已抽象成独立引擎：

- `HeuristicDraftWriter`
- `OpenAIDraftWriter`

统一入口：

- `createDraftWriterFromEnv()`

### Analysis Engine 层

当前 `run` 已抽象成独立引擎：

- `HeuristicAnalysisEngine`
- `OpenAIAnalysisEngine`

统一入口：

- `createAnalysisEngineFromEnv()`

### Planning Engine 层

当前 `plan-next` 已抽象成独立引擎：

- `HeuristicPlanningEngine`
- `OpenAIPlanningEngine`

统一入口：

- `createPlanningEngineFromEnv()`

## 数据结构

### 单章结构

- `ScenePlanItem`
- `CharacterState`
- `ThemeReport`
- `StyleReport`
- `ReaderExperienceReport`
- `GateDecision`

### 跨章结构

- `CharacterHistory`
- `ThemeHistory`
- `StoryMemory`

### 规划结构

- `ChapterPlan`

### 草稿闭环结构

- `StorylabDraftResult`
- `DraftReviewArtifacts`
- `StorylabDraftCycleResult`

## 单章处理流

`run(bookId, chapterNumber)`：

1. 读取章节与基础配置
2. 生成 scene plan
3. 更新 character state
4. 生成 theme report
5. 生成 style report
6. 生成 reader report
7. 生成 gate decision
8. 生成 revision brief
9. 合并 character history
10. 合并 theme history
11. 更新 story memory
12. 全部落盘

## 跨章累计状态设计

### Character History

保存每个角色随章节推进的：

- desire
- fear
- recentDecision
- decisionCost
- arcProgress

当前文件：

- `story/characters/character-history.json`

### Theme History

保存每章主题推进结果：

- `theme`
- `antiTheme`
- `themeSignalCount`
- `antiSignalCount`
- `interpretation`

当前文件：

- `story/themes/theme-history.json`

### Story Memory

汇总全局层面信息：

- 最近分析到哪一章
- 仍在推进的 hooks
- 尚未解决的风险
- 读者体验平均分轨迹

当前文件：

- `story/memory/story-memory.json`

## 下一章规划设计

`planNext(bookId, targetChapterNumber)` 会读取累计状态，生成：

- chapter mission
- reader goal
- scene blueprint
- character intent
- theme intent
- thematic question
- style profile
- gate note

当前文件：

- `story/planning/chapter-XXXX.chapter-plan.json`

这个设计的意义是把“分析过去章节”和“规划下一章节”接起来，为 writer 主链准备明确输入。

### Character / Theme / Style 如何进入 generation pipeline

当前这一层已经不再只是“章节提纲”，而是包含三种硬约束：

1. Character 约束  
每个 `sceneBlueprint` 现在至少包含：
- `drivingCharacter`
- `opposingForce`
- `decision`
- `cost`
- `relationshipChange`

这意味着 draft 与 revise 都必须回答：
- 谁在推动场景
- 谁在阻碍
- 该角色做了什么决定
- 代价如何落地
- 关系如何变化

2. Theme 约束  
每个 `sceneBlueprint` 现在至少包含：
- `thematicTension`
- `valuePositionA`
- `valuePositionB`
- `sceneStance`

这意味着 scene 不再只是推进剧情，也必须承担价值冲突。

3. Style 约束  
`ChapterPlan` 现在包含：
- `styleProfile`

每个 `sceneBlueprint` 还会带：
- `styleDirective`

这意味着 draft / revise 不再只“参考风格说明”，而是必须消费结构化风格约束。

## 草稿生成设计

`draftFromPlan(bookId, targetChapterNumber)` 会读取：

- `chapter-plan.json`
- `character-history.json`
- `theme-history.json`

然后通过 draft engine 生成草稿并写入：

- `drafts/000X_<title>.md`

当前支持：

- heuristic writer
- OpenAI-compatible writer

### 草稿生成现在必须吃哪些硬输入

当前 draft 不只是读取 chapter mission，而是显式读取：

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
- `sceneBlueprint.sceneStance`
- `sceneBlueprint.styleDirective`
- `styleProfile`

这使 `scene -> draft` 的约束开始变硬。

## 草稿评审闭环

`draftCycle(bookId, targetChapterNumber)` 是当前新接上的第一版闭环：

1. 先调用 `draftFromPlan`
2. 读取已经落盘的草稿正文
3. 重用分析模块对草稿执行评审
4. 输出草稿评审 JSON
5. 输出草稿 revision brief

当前输出：

- `story/reviews/drafts/chapter-XXXX.draft-review.json`
- `story/reviews/drafts/chapter-XXXX.draft-revision-brief.md`

这一步的意义是把系统从“只会规划和出草稿”推进到“开始能对自己的草稿做结构化回看”。

## 修订闭环中的 Character / Theme / Style

`reviseCycle(bookId, targetChapterNumber)` 现在会把以下约束真正送进 revise engine：

- 角色决策与代价
- 主题冲突与价值对立
- style profile 与 style directive
- scene audit 问题

当前 heuristic revise 仍然比较粗，但它已经开始围绕“scene 级修订锚点”工作，而不是整章泛化重写。

## Blocking Gate 最小版

当前已经加入最小 blocking gate：

- 如果 `reader experience` 关键分数过低
- 或 `scene audit` 出现 `high severity` 问题

则：

- `draft-cycle` / `revise-cycle` 会返回 blocking 状态
- 默认阻断继续
- 必须显式传 `--override` 才能继续

## 当前边界

### 已经完成

- 单章增强分析
- 跨章累计状态
- 下一章规划
- 基于规划生成草稿
- 第一版 `plan -> draft -> review` 闭环
- analysis / planning / draft engine 抽象

### 还未完成

- scene history
- scene auditor
- 更强的 planner LLM 质量
- 更强的 critic LLM 质量
- 高质量正文生成
- 真正阻断式 human gate
- 完整 revision loop

## 为什么这个方向合理

因为它先把真正决定小说质量的中间层做出来：

- 读者体验
- 人物弧线
- 主题推进
- 场景蓝图
- 人类可控点

这些层稳定后，再接高质量正文生成，收益会明显高于“先写正文，再补审查”。 
