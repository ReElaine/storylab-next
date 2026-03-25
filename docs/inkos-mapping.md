# storylab-next 与 Inkos 的借鉴映射表

这份文档的目的不是证明 `storylab-next` 依附 Inkos，而是明确说明：

- 我们具体借鉴了什么
- 我们明确没有沿用什么
- 为什么不沿用
- 新模块和 Inkos 相关能力之间到底是什么关系

## 1. 明确借鉴的架构思想

### 1.1 状态外置到文件系统

借鉴点：

- 长篇写作不应只依赖 prompt 内隐记忆
- 关键状态应外置、可读、可编辑、可追踪

在 `storylab-next` 中的体现：

- `books/<bookId>/story/scenes/`
- `books/<bookId>/story/characters/`
- `books/<bookId>/story/themes/`
- `books/<bookId>/story/reviews/`
- `books/<bookId>/story/memory/`
- `books/<bookId>/story/planning/`

这对应的是 Inkos 的“把写作状态落到文件系统”的底层思路，但不是直接复刻其目录与 truth files。

### 1.2 Pipeline Runner 统一编排

借鉴点：

- 小说系统不该把命令逻辑、状态读写和生成逻辑混在一起
- 需要有一个总编排层把流程串起来

在 `storylab-next` 中的体现：

- [storylab-runner.ts](/C:/Working/storylab-next/src/core/pipeline/storylab-runner.ts)

对应关系：

- Inkos 中 `PipelineRunner` 是主编排器
- Storylab 中 `StorylabRunner` 承担同类职责，但流程目标不同

### 1.3 长篇写作应分层处理

借鉴点：

- 写作不是单次生成，而是“分析 / 规划 / 生成 / 审计 / 修订”多阶段协作

在 `storylab-next` 中的体现：

- `run`
- `plan-next`
- `draft-from-plan`
- `draft-cycle`
- `revise-cycle`

这继承了 Inkos 的“分层处理”思想，但 Storylab 更强调中间层建模与回写。

### 1.4 章节级持久化

借鉴点：

- 章节应该是基本工作单元
- 每一章都应该有独立的分析、审计和状态更新结果

在 `storylab-next` 中的体现：

- `chapter-0001.scene-plan.json`
- `chapter-0001.character-state.json`
- `chapter-0001.theme-report.json`
- `chapter-0001.reader-experience.json`
- `chapter-0002.draft-review.json`
- `chapter-0002.comparison.json`

### 1.5 memory / truth-like 状态累积

借鉴点：

- 需要跨章累计状态，而不是每章都重新理解故事

在 `storylab-next` 中的体现：

- `character-history.json`
- `theme-history.json`
- `story-memory.json`

这借鉴的是 Inkos“truth files / current state / memory”这类长期状态思路，但 Storylab 使用的是更偏结构化的专项状态文件。

### 1.6 审计与修订闭环思想

借鉴点：

- 写作系统不能只有生成，必须允许审计与修订

在 `storylab-next` 中的体现：

- `draft-cycle`
- `revise-cycle`
- `revision brief`
- `comparison report`

这一点借鉴的是 Inkos “write -> audit -> revise -> settle” 的思想，但 Storylab 把重点放在 reader/scene/character/theme/style 这些中间层约束。

## 2. 明确没有沿用的内容

### 2.1 没有沿用原 monorepo / workspace 组织

没有沿用：

- `packages/core`
- `packages/cli`
- workspace alias
- monorepo package wiring

原因：

- 当前目标是快速验证独立架构闭环
- 需要降低工程耦合与迁移成本
- 之前参考仓库的 workspace 解析问题会干扰实验推进

### 2.2 没有沿用原 StateManager 的具体实现

没有沿用：

- Inkos 的 `StateManager`
- 它对 book/chapter/snapshot/truth files/lock 的具体管理方式

原因：

- Storylab 的状态形态不同
- 我们需要更明确的 scene / character / theme / review / planning 分目录
- 当前阶段不需要完整复刻 snapshot/lock 策略

### 2.3 没有沿用原 truth files 的具体形态

没有沿用：

- `current_state.md`
- `particle_ledger.md`
- `pending_hooks.md`
- `character_matrix.md`
- 其他 markdown truth files 的具体格式

原因：

- Storylab 更强调结构化中间层
- 当前更需要 machine-friendly 的 JSON 状态，而不是大段 Markdown 汇总
- 目标不是保留原 truth files 体系，而是让 scene/character/theme/style 成为硬输入

### 2.4 没有沿用原 agent 结构

没有沿用：

- ArchitectAgent
- WriterAgent
- ContinuityAuditor
- ReviserAgent
- ChapterAnalyzerAgent

原因：

- Storylab 当前不是复刻原 agent 编排
- 我们把能力抽象成 engine + module，更适合独立实验项目
- 当前重点是把中间层做成“强约束”，而不是先追求多 agent 形式

### 2.5 没有沿用原 CLI 组织方式

没有沿用：

- `inkos book`
- `inkos write`
- `inkos revise`
- `inkos audit`

原因：

- Storylab 当前命令围绕实验主链收敛
- 更适合保留极少量直接命令：
  - `run`
  - `plan-next`
  - `draft-from-plan`
  - `draft-cycle`
  - `revise-cycle`

## 3. 为什么不直接沿用 Inkos

原因不是“原项目不好”，而是目标不同。

### 3.1 目标不同

Inkos 的重心更接近“可持续写作生产流水线”。

Storylab 当前的重心更接近“围绕高质量小说生成的中间层建模与质量闭环”。

### 3.2 Storylab 更强调中间层建模

Storylab 想证明的是：

- scene 不是 notes，而是硬输入和硬审计基准
- character 不是设定表，而是戏剧驱动器
- theme 不是总结，而是冲突推进器
- style 不是报告，而是控制器

这要求状态设计和主链组织都与 Inkos 有明显差异。

### 3.3 需要独立实验空间

如果继续依附原项目：

- 很容易被原系统边界绑定
- 很容易为了兼容旧接口而稀释新结构
- 很难清晰判断“新架构本身是否成立”

因此独立仓库是刻意设计，不是偏离目标。

### 3.4 降低耦合与迁移成本

独立项目有几个直接好处：

- 工程复杂度更低
- 迭代速度更快
- 更容易让外部评审理解
- 未来如果要接回更复杂系统，也能按边界迁移

## 4. 新模块与 Inkos 对应能力的关系

### 4.1 Character Engine vs Inkos 角色状态方式

Inkos 中已有：

- 角色设定
- 状态文件
- 审计中的 OOC 检查

Storylab 新增的是：

- `current desire`
- `current fear`
- `current misbelief`
- `recent choice`
- `cost paid`
- `relationship delta`
- `arc progress`

差异在于：

- Inkos 更偏“持续一致性与状态结算”
- Storylab 更强调“角色如何驱动冲突与选择”

所以 Character Engine 不是改名版 character notes，而是从“状态记录”向“戏剧驱动”推进。

### 4.2 Theme Tracker vs Inkos truth files

Inkos 中已有：

- outline / state / summary 一类长期记忆

Storylab 的 Theme Tracker 额外强调：

- core theme
- anti-theme
- value tensions
- thematic question
- current thematic movement

差异在于：

- Inkos 的主题相关信息更多是整体故事约束的一部分
- Storylab 让主题成为规划与评审中的显式层

Theme Tracker 不是对 truth files 的简单改写，而是把“主题推进”做成独立可操作模块。

### 4.3 Reader Experience Critic vs Continuity Auditor

Inkos 的 Continuity Auditor 更强调：

- 连续性
- 角色一致性
- 信息越界
- 大纲偏离
- 风格与读者期待等综合审计

Storylab 的 Reader Experience Critic 不是简单改名，原因是：

- 它的中心问题不是“有没有写错”
- 而是“读者为什么会继续读”

它显式输出：

- hook
- momentum
- emotional peak
- suspense
- memorability

这使它更像“读者体验层”，而不是 continuity 的子维度。

### 4.4 Scene Planner vs 章节 plan

Inkos 里已有章节级写作组织思想。

Storylab 的 Scene Planner 之所以必须新增，不是为了重复封装，而是因为：

- chapter plan 太粗
- 无法直接约束正文结构质量
- 无法为 revise/audit 提供细粒度基准

现在 Storylab 的目标是让 scene 成为：

- draft 的硬输入
- audit 的硬基准
- revise 的定位坐标

所以 Scene Planner 在 Storylab 里是必要新增层，而不是装饰性 artifacts。

## 5. 当前结论

`storylab-next` 借鉴的是 Inkos 的底层方法论，而不是它的具体实现。

它保留了以下真正有价值的思想：

- 文件状态外置
- runner 统一编排
- 长篇写作分层处理
- 章节级持久化
- 长期状态累积
- 审计与修订闭环

同时明确放弃了以下会降低独立实验效率的内容：

- 原 monorepo 组织
- 原 state manager 具体实现
- 原 truth files 具体格式
- 原 agent 结构
- 原 CLI 命令体系

这不是偏离，而是为了更好地服务 Storylab 自己的目标：

- 用更硬的中间层，真正提升正文质量。 
