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
| 阶段四 | 可插拔智能引擎 | 已完成基础版 | 让 analysis / planner / writer / revise 具备 `heuristic / openai` 可切换能力 |
| 阶段五 | scene-level revise 与可追踪性 | 已完成 | 证明系统可以只改指定 scene，并追踪 target / actual / comparison 三套集合 |
| 阶段六 | rewrite effectiveness | 进行中 | 证明“改了哪里”之外，还能说明“为什么值得改、改完是否更好” |
| 阶段七 | 人类协作工作流 | 未开始 | 引入 advisory / blocking gate 的更完整流程控制 |
| 阶段八 | 质量增强与策略深化 | 未开始 | 强化真实收益判断、回归检测、更成熟的 rewrite 策略与质量控制 |

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

### 阶段七：人类协作工作流

当前结论：未开始。

计划目标：

- advisory gate
- blocking gate
- gate override
- 关键节点人工确认

预期阶段门：

- 开书前
- 前几章后
- 中盘转折前
- 结尾收束前

阶段验收标准：

- gate 不再只是提示
- 系统具备明确的人工介入点与阻断机制

### 阶段八：质量增强与策略深化

当前结论：未开始。

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

`阶段六：rewrite effectiveness`

当前最重要的目标是：

1. 让 `textualChangeEvidence` 更接近真实文本改写证据
2. 让 `postRewriteAssessment` 更像效果判断，而不是说明文
3. 用更接近真实章节的样例验证 rewrite 是否真的稳定有效

当前不应该优先做的事情：

- 继续横向增加新模块
- 过早做 UI / 可视化
- 过早把重点放到更复杂的模型路由

## 4. 当前优先级

### P0

- 细化文本级改写证据
- 细化问题解决状态判断
- 扩展真实章节样例验证
- 强化 rewrite benefit 判断

### P1

- regression 标记
- no-op rewrite 判定
- 多问题单目标样例

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

`storylab-next` 已经跨过“独立架构搭建”和“scene-level 可追踪改写”两个关键门槛，当前正处于“证明改写有效、证明改完更好”的阶段。

