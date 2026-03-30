# storylab-next 跨章连续写作架构

这份文档把当前项目从“单章写作与修订系统”升级为“支持整本书长期连续创作系统”的目标架构、当前差异和后续开发计划统一整理出来。

当前 `storylab-next` 已经具备：

- 单章 `writer -> analysis -> reader -> revise` 主链
- scene-level 可追踪改写
- 自动循环修订与最终正文导出
- `character-history / theme-history / story-memory` 基础跨章状态
- `Phase 1: Settlement Layer` 初版
- `Phase 2: State-Driven Planning` 初版
- `Phase 3: Continuity Audit` 初版
- `Phase 4: Re-settlement` 初版

但这还不足以真正支撑整本书的连续写作。后续架构要解决的是：

1. 世界观和规则连续
2. 人物状态与人设连续
3. 欲望 / 恐惧 / 误判 / 关系 / 弧线连续演化
4. 伏笔 / 承诺 / 未兑现事件可追踪
5. 时间线与因果链不乱
6. 主题推进跨章连续
7. writer 写下一章时不会忘记关键状态
8. revise 后状态可重结算，不与正文脱节

## 推荐目标架构：5 层状态 + 2 层执行流

这条路线的核心不是“把更多前文塞给 prompt”，而是：

`正文 + 状态账本` 共同构成系统真相。

### 5 层状态

#### 1. 静态设定层（Static Canon Layer）

用于维护原则上不应频繁变化的内容：

- world rules
- style profile
- genre contract
- series promise

这层更像全书的“宪法”。

#### 2. 全书动态状态层（Book Dynamic State Layer）

用于维护跨章连续性真正依赖的运行态账本：

- character current state / arc state
- relationship ledger
- chronology
- causality ledger
- open loops
- reveals ledger
- theme progression
- world state
- power state
- book phase

这层更像“全书数据库”。

#### 3. 章节层（Chapter Layer）

用于把一章作为完整叙事单元管理：

- chapter plan
- chapter summary
- chapter state delta
- chapter continuity report
- chapter reader report
- chapter revision history

这层更像“章节提交单元”。

#### 4. Scene 层（Scene Execution Layer）

每个 scene 不只是文本片段，还应承担明确状态责任：

- scene purpose
- scene input state
- scene output state
- scene conflict
- scene reveal / foreshadow
- scene causality hook
- scene audit

这层是“最小可控状态变换器”。

#### 5. 运行时上下文层（Runtime Context Layer）

这层不是永久真相，而是每次 agent 调用前动态组装的工作集：

- relevant canon
- relevant character states
- recent chapter summaries
- active open loops top-k
- chronology slices
- chapter plan
- scene cards
- source excerpt refs

重点不是“读全部历史”，而是“读经过选择和压缩的当前任务上下文”。

### 2 层执行流

#### 1. 文本生产流

当前主链已经大体具备：

`plan -> writer -> analysis -> reader -> revise -> re-settlement -> re-audit -> gate -> final prose`

#### 2. 状态结算流

这条链现在已经进入初版可用状态，当前目标链路是：

`final prose -> settlement -> continuity audit -> persist canonical state -> plan next`

当 `revise` 改动正文后，当前主链已经会执行：

`revise -> re-settlement -> re-audit -> persist`

也就是说：

- 正文不是唯一真相
- 下一章不是直接续写上一章
- 下一章要基于“已经结算过的全书状态”来写

## 当前实现与目标架构的差异

### 当前已经比较强的部分

#### Scene 层

已经具备：

- scene blueprint
- scene audit
- scene-level revise
- target / actual / comparison scene traceability

这是当前项目最成熟的一层。

#### 章节层

已经具备：

- chapter plan
- writer / review / revise / comparison
- 最终正文与内部工作稿分离

当前章节层更像“生产单元”，但还不是完整“结算单元”。

#### 文本生产流

已经具备：

`plan -> writer -> analysis -> reader -> revise -> gate -> final prose`

### 当前仍明显不足的部分

#### 1. 静态设定层还不够完整

现在已经有：

- `book.json`
- `cast.json`
- `theme-manifest.json`
- `style-guide.json`

但还没有正式的：

- `world_rules`
- `series_promise`
- `genre_contract`

也还没有“哪些规则不可违背”的显式表达。

#### 2. 全书动态状态层还只是基础版

现在已经有：

- `character-history`
- `theme-history`
- `story-memory`

以及 `Phase 1` / `Phase 3` 新增的：

- `chapter_summary`
- `chapter_state_delta`
- `chronology`
- `open_loops`
- `reveals ledger`
- `relationship ledger`

但还没有正式账本层：

- `world_state`
- `book_phase`
- `causality ledger`
- 更完整的 character current state

当前更多是“跨章记忆”，还不是“全书账本”。

#### 3. Scene 还是文本控制单元，不完全是状态变换单元

我们已经能控制 scene 怎么写、怎么改；
但还没有正式结算成：

- input state
- output state
- 对 chapter delta 的贡献

#### 4. 运行时上下文层还没独立

现在已经开始落地，但还只是初版：

- 已有 `context assembler`
- 已有 `context_pack`
- `plan-next` 与 writer 已开始读同一份上下文包

仍然缺少的部分：

- 按 agent 区分的上下文切片规则
- 更细粒度的 runtime pack 裁剪与缓存策略

#### 5. 状态结算流仍在补强

当前已经开始落地：

- `chapter_summary`
- `chapter_state_delta`
- `chronology`
- `open_loops`
- `reveals ledger`
- `relationship ledger`
- 独立 `continuity gate`
- `re-settlement`
- canonical book-state commit 语义

## 当前最重要的架构缺口

如果只挑最关键的 3 个差距，可以概括成：

1. 还没有完整的 canonical book-state
2. 还没有更强的 world/theme/book phase 账本
3. scene 增量重结算已经接入初版，但还没有做到更细粒度的 scene output-state fold

换句话说：

- 我们现在强在“章节生产”
- 还不够强在“全书记账”

## 当前已落地：Phase 1 Settlement Layer

### 当前状态

已完成初版实现。

### 当前新增能力

- `SettlementAgent`
- `chapter_summary`
- `chapter_state_delta`
- `chronology`
- `open_loops`
- `reveals ledger`
- `relationship ledger`

当前已经能在 `final prose` 之后生成：

- `story/settlement/chapter-XXXX.chapter-summary.json`
- `story/settlement/chapter-XXXX.chapter-state-delta.json`
- `story/plot/chronology.json`
- `story/plot/open-loops.json`
- `story/plot/reveals-ledger.json`
- `story/characters/relationship-ledger.json`

并且：

- `plan-next` 已开始读取 recent chapter summaries
- `plan-next` 已开始读取 chronology
- `plan-next` 已开始读取 open loops
- `plan-next` 已开始读取 recent reveals，并把“已揭示真相”转成下一章的后果或行动压力
- `plan-next` 已开始读取 recent relationship changes，并把“已恶化/已重划线的关系”转成下一章冲突压力

### 当前边界

Phase 1 / Phase 4 当前已经进入“账本可用、改后可重结算”的版本，但还不是完整全书账本：

- `theme progression` 已接入初版账本，并进入 `context-pack -> plan-next`
- scene 级增量重结算已接入初版：未改 scene 优先复用旧 `sceneDeltas`，改动 scene 重新结算
- 更高阶的 continuity 语义推理还未建立
- 更细粒度的 revise 后增量 merge 仍可继续深化

## 推荐总链路

当前主链：

`plan -> writer -> analysis -> reader -> revise -> re-settlement -> re-audit -> gate -> persist canonical state -> final prose -> plan next`

其中 `revise-cycle / revise-until-pass` 已经默认采用：

`writer -> revise -> re-settlement -> re-audit -> persist`

## 接下来开发计划

这条路线的优先级不是“继续加会写文的 agent”，而是“先把记账和审计做实”。

### P0：必须优先完成

#### 1. 完成 Phase 1 的实战闭环验证

当前 Phase 1 已有代码与测试，但还需要继续拿真实样例稳定验证：

- final prose 通过后稳定写出 settlement 文件
- `plan-next` 在真实链路里持续读取 settlement 账本

#### 2. 推进 Phase 2：State-Driven Planning

当前已完成初版：

- `context assembler`
- `context_pack.json`

当前已经做到：

- `plan-next` 在规划前会先组装 `context-pack`
- planner 通过 `context-pack` 读取状态，而不是直接拼散装历史
- writer 也开始消费同一份 `context-pack`

接下来要继续做强的是：

- recent chapter summaries
- chronology
- open loops
- recent reveals
- recent relationship changes
- core character current state
- current book phase（初版可先 heuristic）

下一步仍需要补：

- 更稳定的 `book phase` 维护
- 更明确的 `carry-forward facts / forbidden contradictions`
- 面向不同 agent 的专用 context slice

#### 3. 完成 Phase 3：Continuity Audit

当前初版已落地，首批检查范围包括：

- scene coverage
- timeline
- world rules
- open loop continuity / contradiction / duplicate loop
- reveal continuity / reveal conflict
- character state continuity / drift
- relationship drift

当前已经落地的最小版：

- `ContinuityAgent`
- `story/continuity/chapter-XXXX.continuity-report.json`
- `finalizeAcceptedChapter` 现在会先 `settlement -> continuity audit`
- continuity fail 时只写 `continuity_report`，不会继续写 canonical `summary / delta / chronology / open-loops / reveals-ledger / relationship-ledger`
- `final prose` 也会因为 continuity fail 被拦下，不会导出到 `final/*.txt`

当前这版仍然是最小实现，主要作用是先把 continuity gate 建起来，而不是一次性做完整世界规则检查：

- 已接入：scene coverage、timeline、open loop continuity、reveal continuity、reveals ledger 冲突检查
- 已接入：已跟踪角色状态连续性、character state drift、relationship drift
- 已接入：open loop contradiction / duplicate loop、最小版 `world-rules.json` 禁用表达 / 必要规则信号检查
- 暂时未做：更强的 `world_rules` 语义推理与例外规则解释

### P1：紧接着做

#### 4. 推进 Phase 4：Re-settlement

当前已经进入初版实现：

- 每一轮 `revise` 后都会重新生成 `settlement`
- 每一轮 `revise` 后都会重新生成 `continuity report`
- `revise-cycle / revise-until-pass` 的最终判定，已经基于改后 `continuity` 结果
- `persist` 只认最后一次 revise 后的状态
- 当前 re-settlement 已按“目标章节之前的 canonical 基线”回溯再 fold，不再直接叠用当前章节旧账本

当前仍待继续做强：

- scene 增量重结算从“scene delta 复用/重算”升级到更细的 scene output-state fold
- 更细粒度的 canonical delta merge 策略
- 更清晰的 re-settlement / re-audit 调试视图

#### 5. 补更完整的全书账本

优先顺序建议：

1. world state / book phase
2. 更细的 scene delta merge / output-state fold

### P2：高级优化

- scene-level settlement
- causality ledger
- 更细粒度 context pack 裁剪
- continuity 与 reader 的双 gate 协同策略

## 一句话结论

这条路线的重点不是再堆新模块，而是把“final prose 之后的状态结算与跨章约束”补实。

可以把它理解成：

- Phase 1：先让每章写完后有账可记
- Phase 2：再让下一章规划真正读账本
- Phase 3：再让连续性审计成为独立 gate
- Phase 4：最后让 revise 后状态重新结算，与最终正文对齐
