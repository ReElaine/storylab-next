# storylab-next 跨章连续写作架构

这份文档把当前项目从“单章写作与修订系统”升级为“支持整本书长期连续创作系统”的目标架构、当前差异和后续开发计划统一整理出来。

当前 `storylab-next` 已经具备：

- 单章 `writer -> analysis -> reader -> revise` 主链
- scene-level 可追踪改写
- 自动循环修订与最终正文导出
- `character-history / theme-history / story-memory` 基础跨章状态
- `Phase 1: Settlement Layer` 初版

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

`plan -> writer -> analysis -> reader -> revise -> gate -> final prose`

#### 2. 状态结算流

这是长篇连续写作真正缺失的部分，目标链路是：

`final prose -> settlement -> continuity audit -> persist canonical state -> plan next`

当 `revise` 改动正文后，还需要：

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

以及 `Phase 1` 新增的：

- `chapter_summary`
- `chapter_state_delta`
- `chronology`
- `open_loops`

但还没有正式账本层：

- `relationship ledger`
- `reveals ledger`
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

现在有 prompt 拼装思想，但还没有正式的：

- `context assembler`
- `context_pack`
- 按 agent 区分的上下文切片规则

#### 5. 状态结算流才刚起步

当前已经开始落地：

- `chapter_summary`
- `chapter_state_delta`
- `chronology`
- `open_loops`

但还没有：

- 独立 `continuity gate`
- `re-settlement`
- canonical book-state commit 语义

## 当前最重要的架构缺口

如果只挑最关键的 3 个差距，可以概括成：

1. 还没有完整 `settlement layer`
2. 还没有独立 `continuity layer`
3. 还没有“可作为下一章唯一真相源”的 canonical book-state

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

当前已经能在 `final prose` 之后生成：

- `story/settlement/chapter-XXXX.chapter-summary.json`
- `story/settlement/chapter-XXXX.chapter-state-delta.json`
- `story/plot/chronology.json`
- `story/plot/open-loops.json`

并且：

- `plan-next` 已开始读取 recent chapter summaries
- `plan-next` 已开始读取 chronology
- `plan-next` 已开始读取 open loops

### 当前边界

Phase 1 仍然只是“有账可记”的版本，还不是完整全书账本：

- relationship / reveals / theme progression 暂未接入
- scene 增量结算还未开始
- continuity gate 还未建立
- revise 后的 re-settlement 还未建立

## 推荐总链路

短期目标链路：

`plan -> writer -> analysis -> reader -> revise -> gate -> final prose -> settlement -> plan next`

完整目标链路：

`plan -> writer -> analysis -> reader -> revise -> gate -> final prose -> settlement -> continuity audit -> persist canonical state -> plan next`

当 revise 能重结算后，目标闭环是：

`writer -> revise -> re-settlement -> re-audit -> persist`

## 接下来开发计划

这条路线的优先级不是“继续加会写文的 agent”，而是“先把记账和审计做实”。

### P0：必须优先完成

#### 1. 完成 Phase 1 的实战闭环验证

当前 Phase 1 已有代码与测试，但还需要继续拿真实样例稳定验证：

- final prose 通过后稳定写出 settlement 文件
- `plan-next` 在真实链路里持续读取 settlement 账本

#### 2. 推进 Phase 2：State-Driven Planning

优先新增：

- `context assembler`
- `context_pack.json`

并让 planner 明确读取：

- recent chapter summaries
- chronology
- open loops
- core character current state
- current book phase（初版可先 heuristic）

#### 3. 规划 Phase 3：Continuity Audit

先不做太复杂，首批只查：

- 时间线冲突
- world rules 冲突
- 人物状态 / 人设冲突
- open loop / reveal 冲突

### P1：紧接着做

#### 4. 推进 Phase 4：Re-settlement

初版先用“整章重结算”：

- revise 后重新生成 summary / delta / continuity report
- persist 只认最后一次 revise 后的状态

#### 5. 补更完整的全书账本

优先顺序建议：

1. relationship ledger
2. reveals ledger
3. theme progression
4. world state / book phase

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
