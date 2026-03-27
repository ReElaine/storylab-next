# LLM 接入现状对照表

这份文档专门回答一个很实际的问题：

`storylab-next` 现在到底哪些流程已经真正接上了 LLM，哪些仍然主要由 heuristic 驱动？

结论先说在前面：

- 项目已经具备 `heuristic / openai` 可切换的引擎层
- 但默认仍然是 `heuristic`
- 即使切到 `openai`，当前也仍然存在若干规则层与 deterministic 层
- 所以它现在是 “LLM-capable”，不是“默认全链路 LLM 驱动”

## 1. 默认行为

如果没有显式设置环境变量：

- `STORYLAB_ANALYSIS_PROVIDER`
- `STORYLAB_READER_PROVIDER`
- `STORYLAB_PLANNER_PROVIDER`
- `STORYLAB_WRITER_PROVIDER`
- `STORYLAB_REVISE_PROVIDER`

那么系统默认使用：

- `heuristic`

这意味着当前大多数本地验证、测试和可追踪性证明，主要是在 heuristic 路径上完成的。

## 2. 命令级对照表

| 命令 / 流程 | 是否支持 LLM | 当前默认 | 实际形态 | 说明 |
| --- | --- | --- | --- | --- |
| `run` | 支持 | `heuristic` | 混合链路 | analysis / reader 可切 `heuristic / openai`，但 scene audit / gate / persist 仍是本地规则与状态落盘 |
| `plan-next` | 支持 | `heuristic` | 可切换 | chapter planning 可切 `heuristic / openai` |
| `write-from-plan` | 支持 | `heuristic` | 可切换 | writer generation 可切 `heuristic / openai` |
| `writer-cycle` | 支持 | `heuristic` | 混合链路 | writer 可用 LLM，但 review 仍依赖 analysis engine + reader engine + scene auditor + blocking gate |
| `revise-cycle` | 支持 | `heuristic` | 混合链路 | revise 可用 LLM，但 before/after analysis、scene audit、comparison、persist 不等于全都由 LLM 负责 |
| `revise-until-pass` | 支持 | `heuristic` | 自动循环 | writer / analysis / reader / revise 可混搭，当前按串行执行，循环直到 gate 通过或停止条件触发 |

## 3. 引擎级对照表

| 引擎 | 当前实现 | 是否有 OpenAI 版本 | 默认 provider | 当前说明 |
| --- | --- | --- | --- | --- |
| `AnalysisEngine` | `HeuristicAnalysisEngine` / `OpenAIAnalysisEngine` | 有 | `heuristic` | LLM 版会输出 analysis bundle，但 gate decision 仍由本地 gatekeeper 决定 |
| `ReaderCriticEngine` | `HeuristicReaderCriticEngine` / `OpenAIReaderCriticEngine` | 有 | `heuristic` | LLM 版负责 reader score、修改建议与按维度解释 |
| `PlanningEngine` | `HeuristicPlanningEngine` / `OpenAIPlanningEngine` | 有 | `heuristic` | LLM 版会生成 `ChapterPlan`，解析失败时仍回退到 heuristic 结果 |
| `WriterAgent` | `HeuristicWriterAgent` / `OpenAIWriterAgent` | 有 | `heuristic` | LLM 版直接写章节正文 |
| `ReviseEngine` | `HeuristicReviseEngine` / `OpenAIReviseEngine` | 有 | `heuristic` | LLM 版按 scene 局部重写，但 comparison / gate / audit 仍由其他层补全 |

## 4. 目前仍然主要由 heuristic / deterministic 驱动的部分

下面这些能力即使在 `openai` 模式下，也不是完全交给 LLM：

| 能力 | 当前主导方式 | 说明 |
| --- | --- | --- |
| `SceneAuditor` | heuristic / deterministic | 作为 writer / revise 后的硬基准存在 |
| blocking gate | heuristic / deterministic | 采用 reader 优先策略：reader 过线后，质量型 high severity 会降为 advisory，只有硬结构问题继续阻断 |
| scene traceability | deterministic | target / actual / comparison / unchanged 等集合由代码跟踪，不依赖 LLM 自报 |
| scene text replace | deterministic | `prelude / scene blocks / postlude` 的保留与替换由代码控制 |
| comparison assembly | deterministic + analysis input | comparison 的结构由代码生成，部分依据 analysis/re-analysis 结果 |
| history / memory persist | deterministic | 状态写回完全由本地 store 与 builder 负责 |
| timeout / retry / JSON repair | deterministic | 统一包在 OpenAI 兼容调用之外，保证 LLM 链路更稳定 |

## 5. 各流程的“真实状态”说明

### `run`

`run` 的输入是章节文本，输出是：

- scenes
- character states
- theme report
- style report
- reader report
- gate decision
- revision brief

当前状态：

- 已支持 `openai` 分析
- 但不是“纯 LLM review”
- `gateDecision` 仍来自本地 `HumanReviewGatekeeper`
- 最终状态写回由 `ProjectStore` 与 `HistoryBuilder` 负责

所以它更准确地说是：

`LLM-enhanced analysis + deterministic persistence`

### `plan-next`

当前状态：

- 已支持 `openai` 规划下一章
- 但 LLM 输出如果字段不完整，会回落到 heuristic plan 的对应字段

所以它更准确地说是：

`LLM-first planning with heuristic fallback`

### `write-from-plan`

当前状态：

- 已支持 `openai` 直接生成章节工作稿
- heuristic 版仍然是当前稳定默认路径

所以它更准确地说是：

`Switchable writer generation`

### `writer-cycle`

当前链路是：

`writer -> analysis -> reader -> scene audit -> blocking gate -> review artifacts`

因此即使 writer 用了 LLM，也不代表整个 cycle 都是 LLM。

更准确地说：

`LLM writer generation + rule-backed review cycle`

### `revise-cycle`

当前链路是：

`writer -> before analysis -> reader -> scene audit -> revise -> re-analysis -> re-reader -> comparison -> persist`

这里：

- revise 本身可以是 `openai`
- before / after analysis 可以是 `openai`
- 但 scene audit、traceability、comparison assembly、persist 仍是 deterministic / heuristic 主导

所以它更准确地说是：

`LLM-capable scene rewrite inside a deterministic revise loop`

### `revise-until-pass`

当前链路是：

`writer -> analysis -> reader -> scene audit -> gate -> revise? -> re-analysis -> re-reader -> post-gate`

它的关键点是：

- 串行执行，不并行调多个 LLM agent
- CLI 会输出阶段进度、reader 分数、建议与 retry 日志
- 如果当前版本已通过 reader 优先 gate，会直接跳过 revise
- 只有在仍然 blocking 时，才会进入下一轮局部改写

## 6. 当前最准确的项目表述

目前最准确的说法是：

- 项目已接通 LLM 能力
- 项目默认仍以 heuristic 为主
- 当前主链属于“可切换、混合式架构”

不准确的说法包括：

- “现在已经是全链路 LLM 写作系统”
- “所有分析、规划、修订都默认由 LLM 执行”
- “comparison 与 traceability 完全依赖模型判断”

## 7. 环境变量对照

### provider

- `STORYLAB_ANALYSIS_PROVIDER`
- `STORYLAB_READER_PROVIDER`
- `STORYLAB_PLANNER_PROVIDER`
- `STORYLAB_WRITER_PROVIDER`
- `STORYLAB_REVISE_PROVIDER`

可选值：

- `heuristic`
- `openai`

### OpenAI 配置

可以统一配置：

- `STORYLAB_OPENAI_API_KEY`
- `STORYLAB_OPENAI_MODEL`
- `STORYLAB_OPENAI_BASE_URL`

也可以按环节分别配置：

- `STORYLAB_ANALYSIS_OPENAI_API_KEY`
- `STORYLAB_ANALYSIS_OPENAI_MODEL`
- `STORYLAB_READER_OPENAI_API_KEY`
- `STORYLAB_READER_OPENAI_MODEL`
- `STORYLAB_PLANNER_OPENAI_API_KEY`
- `STORYLAB_PLANNER_OPENAI_MODEL`
- `STORYLAB_WRITER_OPENAI_API_KEY`
- `STORYLAB_WRITER_OPENAI_MODEL`
- `STORYLAB_REVISE_OPENAI_API_KEY`
- `STORYLAB_REVISE_OPENAI_MODEL`

## 8. 当前建议

如果目标是继续验证系统结构与证据链：

- 优先保留 heuristic 默认路径

如果目标是开始验证真实生成质量：

- 优先把 `write-from-plan`、`writer-cycle` 与 `revise-cycle` 切到 `openai`
- 同时保留 deterministic comparison / traceability，不要把证据链交给模型自己解释

## 9. 一句话总结

`storylab-next` 现在已经不是纯规则系统，但也还不是默认全链路 LLM 系统；它当前是一个“默认 heuristic、支持按环节切换到 LLM 的混合式写作架构”。 


