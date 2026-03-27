# storylab-next 项目阶段总览

这份文档用于统一回答三个问题：

1. 项目已经走到哪一步了
2. 当前阶段的核心目标是什么
3. 下一步应该优先做什么，而不应该过早做什么

它是对 [README](/C:/Working/storylab-next/README.md) 和各轮专题文档的统一收口，也是当前默认的阶段总览入口。

## 1. 阶段总表

| 阶段 | 名称 | 当前状态 | 目标摘要 |
| --- | --- | --- | --- |
| 阶段一 | 单章增强分析 | 已完成基础版 | 建立 scene / character / theme / style / reader-experience / gate 的单章分析能力 |
| 阶段二 | 跨章累计状态 | 已完成基础版 | 建立 character history / theme history / story memory，并支持下一章规划 |
| 阶段三 | 章节主链打通 | 已完成基础版 | 打通 `plan -> writer -> review -> revise` 的最小闭环 |
| 阶段四 | 可插拔智能引擎 | 已完成基础版 | 让 analysis / planner / writer / reader / revise 具备 `heuristic / openai` 可切换能力 |
| 阶段五 | scene-level revise 与可追踪性 | 已完成 | 证明系统可以只改指定 scene，并追踪 target / actual / comparison 三套集合 |
| 阶段六 | rewrite effectiveness | 进行中 | 证明“改了哪里”之外，还能说明“为什么值得改、改完是否更好” |
| 阶段七 | 自动循环与 gate 策略 | 已完成基础版 | 建立串行 `revise-until-pass`、reader 优先 gate、override 与最终正文导出策略 |
| 阶段八 | 质量增强与策略深化 | 进行中 | 强化真实收益判断、回归检测、更成熟的 rewrite 策略与质量控制 |

## 2. 各阶段说明

### 阶段一：单章增强分析

当前结论：已完成基础版。

已经具备：

- `Scene Planner`
- `Character Engine`
- `Theme Tracker`
- `Style Engine`
- `Reader Experience Critic`
- `Human Review Gates`

代表性文档：

- [详细设计](/C:/Working/storylab-next/docs/design.md)
- [使用说明](/C:/Working/storylab-next/docs/usage.md)

阶段验收标准：

- 能对已有章节做增强分析
- 能输出结构化中间状态
- 能生成 revision brief

### 阶段二：跨章累计状态

当前结论：已完成基础版。

已经具备：

- `character-history.json`
- `theme-history.json`
- `story-memory.json`
- `plan-next`

仍未做强的部分：

- 更细粒度 `scene-history`
- 更稳定的跨章 scene identity

代表性文档：


阶段验收标准：

- 下一章规划可以读取累计状态
- 跨章状态会被持续写回

### 阶段三：章节主链打通

当前结论：已完成基础版。

已经打通：

- `run`
- `plan-next`
- `write-from-plan`
- `writer-cycle`
- `revise-cycle`

对应主链：

`analysis -> critique -> revision brief -> revise -> re-analysis -> comparison -> persist`

代表性文档：

- [修订闭环](/C:/Working/storylab-next/docs/revision-loop.md)
- [调用链说明](/C:/Working/storylab-next/docs/call-flows.md)

阶段验收标准：

- 不是只输出分析报告
- 系统可以实际生成草稿并继续修订

### 阶段四：可插拔智能引擎

当前结论：已完成基础版。

已经具备：

- `run` 支持 `heuristic / openai`
- `plan-next` 支持 `heuristic / openai`
- `write-from-plan` / `writer-cycle` / `revise-until-pass` 支持 `heuristic / openai`
- revise 主链具备独立 engine 层

代表性文档：

- [README](/C:/Working/storylab-next/README.md)
- [详细设计](/C:/Working/storylab-next/docs/design.md)

阶段验收标准：

- 主链环节不被单一实现绑死
- 可以按环节切换 heuristic 或 LLM

### 阶段五：scene-level revise 与可追踪性

当前结论：已完成。

已经证明：

- target scene 可追踪
- actual rewritten scene 可追踪
- comparison scene 可追踪
- prelude / unchanged scenes / postlude 边界可验证
- 自动化测试可证明“只改一个 scene”

代表性文档：

- [scene rewrite 验证](/C:/Working/storylab-next/docs/scene-rewrite-verification.md)
- [调用链说明](/C:/Working/storylab-next/docs/call-flows.md)

阶段验收标准：

- 系统不只“会改”
- 还能证明“具体改了哪里、没改哪里”

### 阶段六：rewrite effectiveness

当前结论：进行中。这是当前主阶段。

当前阶段的核心问题：

- 不能只证明“改了哪个 scene”
- 还要证明“改得值不值、改完是否更好”

当前已经推进的点：

- `comparison` 开始区分事实层和解释层
- `textualChangeEvidence` 开始包含文本级证据
- `postRewriteAssessment` 开始判断问题是否解决
- `benefitSummary` 开始表达最小收益判断

还需要继续做强的点：

- 更真实的章节样例验证
- `regressed / no-op rewrite` 判断
- 更强的文本前后证据提取
- 更稳定的收益判断

代表性文档：

- [rewrite effectiveness](/C:/Working/storylab-next/docs/rewrite-effectiveness.md)

阶段验收标准：

- comparison 不只说明“做了什么”
- 还能判断“做得值不值”

### 阶段七：自动循环与 gate 策略

当前结论：已完成基础版。

已经具备：

- `revise-until-pass`
- 串行自动循环
- reader 优先 gate
- advisory / blocking 区分
- `--override`
- 只有通过 gate 后才导出最终正文 `.txt`

仍待继续强化：

- 更成熟的人类确认节点
- 更丰富的 gate 类型与协作策略
- 更细粒度的“为什么通过 / 为什么阻断”解释

阶段验收标准：

- 系统不再盲目一直 revise
- 当前版本已经过线时可以直接通过
- quality advisory 不会继续把已达标正文修坏

### 阶段八：质量增强与策略深化

当前结论：进行中。

计划方向：

- 更成熟的 rewrite strategy
- 更强的 regression detection
- scene diff 可视化
- 更细 style local rewrite
- 更复杂的收益评分

阶段验收标准：

- 系统不只“可运行”
- 而是开始具备稳定质量控制能力

## 3. 当前阶段

当前主阶段是：

`阶段八：质量增强与策略深化`

当前最重要的目标是：

1. 提升 writer 初稿质量，而不是依赖 revise 救火
2. 继续压低全 LLM 串行链路耗时
3. 让 rewrite effectiveness 与人类编辑判断更一致
4. 在 reader 优先策略下继续优化 scene audit 的 advisory 质量

当前不应该优先做的事情：

- 继续横向增加新模块
- 过早做 UI / 可视化
- 过早把重点放到更复杂的模型路由

## 3.1 下一条架构升级主线

除了当前的单章质量强化，项目已经记录了下一条明确升级路线：

- [跨章连续写作路线](/C:/Working/storylab-next/docs/cross-chapter-continuity.md)

这条路线专门解决：

- 世界规则连续
- 人物状态与人设连续
- 欲望 / 恐惧 / 误判 / 关系 / 弧线连续演化
- 伏笔 / 承诺 / 未兑现事件可追踪
- 时间线与因果链连续
- revise 后状态重结算

它当前被拆成 4 个 phase：

1. Settlement Layer
2. State-Driven Planning
3. Continuity Audit
4. Re-settlement

更新：

- `Phase 1: Settlement Layer` 已完成初版实现
- 当前已经能在 final prose 后生成：
  - `chapter-summary`
  - `chapter-state-delta`
  - `chronology`
  - `open-loops`
- `plan-next` 也已经开始读取这些账本

但当前还未进入：

- continuity gate
- re-settlement
- relationship / reveals / theme progression 的完整账本

这条路线当前已经不只是“立项记录”，而是：

- 已经完成 Phase 1 初版
- 正在准备进入 Phase 2（State-Driven Planning）
- 后续会继续进入 Phase 3 / Phase 4

## 4. 当前优先级

### P0

- 提升 writer 初稿质感
- 降低全 LLM 串行链路耗时
- 强化 rewrite effectiveness 与人类判断的一致性
- 继续收敛 reader 优先 gate 下的 advisory 解释

### P1

- regression 标记
- no-op rewrite 判定
- 多问题单目标样例
- 更完整的人类协作 gate

### P2

- 更复杂收益评分
- 更细 scene diff 展示
- 更复杂 strategy learning

## 5. 文档索引

如果你想快速定位某个阶段的信息，可以直接看：

- 当前哪些环节真的接了 LLM：[LLM 接入现状对照表](/C:/Working/storylab-next/docs/llm-adoption-matrix.md)
- 主链如何串起来：[调用链说明](/C:/Working/storylab-next/docs/call-flows.md)
- revise 主链：[修订闭环](/C:/Working/storylab-next/docs/revision-loop.md)
- scene-level 可追踪性：[scene rewrite 验证](/C:/Working/storylab-next/docs/scene-rewrite-verification.md)
- 当前主阶段专题：[rewrite effectiveness](/C:/Working/storylab-next/docs/rewrite-effectiveness.md)

## 6. 一句话状态判断

`storylab-next` 已经跨过“独立架构搭建”“scene-level 可追踪改写”和“reader 优先自动循环”三个关键门槛，当前正处于“提升全 LLM 实战质量与效率”的阶段。

