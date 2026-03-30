# storylab-next

`storylab-next` 是一个独立的中文小说写作系统原型，重点不是堆模块，而是把“规划 -> writer -> analysis -> reader -> revise -> gate -> final prose”这条主链做实。

当前项目已经具备：

- 独立的 `writer / analysis / reader / revise` 多 agent 架构
- scene-level 可追踪改写
- 读者体验独立评分
- 自动循环修订，直到过线或停止
- 只有全部关键环节通过后，才导出最终正文 `.txt`
- 串行 LLM 工作流、阶段进度输出与统一 retry 机制
- Phase 1 Settlement Layer 初版：在最终提交链中生成 summary / state delta / chronology / open loops
- Phase 2 State-Driven Planning 初版：`plan-next` 会先组装 `context-pack`，再基于账本状态规划下一章
- Phase 3 Continuity Audit 初版：`continuity agent` 已接入最终提交链，continuity fail 时阻止 canonical persist
  - 当前最小检查项包括：scene coverage、timeline、open loop continuity、tracked character state continuity、可选 `world-rules.json` 规则检查

当前中短期关注的是“单章质量闭环”，但项目已经正式记录了下一条升级路线：

- 跨章连续写作与状态结算架构
  - 包含目标架构、当前差异和下一步开发计划

## 当前工作流

### 主链

1. `plan-next`
2. `write-from-plan`
3. `writer-cycle`
4. `revise-cycle`
5. `revise-until-pass`

### agent 分工

- `writer agent`
  负责根据章节计划、角色状态、主题轨迹和风格约束生成工作稿
- `analysis agent`
  负责结构化分析 scene / character / theme / style
- `reader agent`
  负责独立给出 `hook / momentum / emotionalPeak / suspense / memorability` 评分与修改建议
- `revise agent`
  负责 scene-level 局部改写

## 快速开始

```bash
npm install
npm run typecheck
npm run build
node dist/index.js init-demo ./demo-workspace
node dist/index.js run ./demo-workspace ember-fall 1
node dist/index.js plan-next ./demo-workspace ember-fall 2
node dist/index.js write-from-plan ./demo-workspace ember-fall 2
node dist/index.js writer-cycle ./demo-workspace ember-fall 2
node dist/index.js revise-cycle ./demo-workspace ember-fall 2 --override
node dist/index.js revise-until-pass ./demo-workspace ember-fall 2 --override --max-iterations 3
```

## LLM 配置

当前支持的 provider 环节：

- `STORYLAB_ANALYSIS_PROVIDER`
- `STORYLAB_READER_PROVIDER`
- `STORYLAB_PLANNER_PROVIDER`
- `STORYLAB_WRITER_PROVIDER`
- `STORYLAB_REVISE_PROVIDER`

统一 OpenAI 兼容配置示例：

```bash
STORYLAB_ANALYSIS_PROVIDER=openai
STORYLAB_READER_PROVIDER=openai
STORYLAB_PLANNER_PROVIDER=openai
STORYLAB_WRITER_PROVIDER=openai
STORYLAB_REVISE_PROVIDER=openai
STORYLAB_OPENAI_API_KEY=your_key
STORYLAB_OPENAI_MODEL=your_model
STORYLAB_OPENAI_BASE_URL=https://your-compatible-endpoint/v1
```

项目也支持读取本地配置文件：

- `config/llm.local.json`

## 输出规则

当前项目严格区分两类产物：

- 内部工作稿
  - 用于 analysis / reader / revise / comparison
  - 保留 scene marker
  - 落在 `books/<bookId>/story/writers-internal/`
  - 修订稿落在 `books/<bookId>/story/revisions/internal/`

- 最终正文
  - 面向读者
  - 不显示 `场景 / POV` 标签
  - 只在 `reader` 过线且不存在硬结构阻断时导出
  - 落在 `books/<bookId>/final/*.txt`

- settlement 账本
  - 只在 `settlement -> continuity audit -> persist canonical state` 通过后正式写回
  - `books/<bookId>/story/settlement/chapter-XXXX.chapter-summary.json`
  - `books/<bookId>/story/settlement/chapter-XXXX.chapter-state-delta.json`
  - `books/<bookId>/story/plot/chronology.json`
  - `books/<bookId>/story/plot/open-loops.json`

- state-driven planning 上下文
  - 在 `plan-next` 时先生成
  - `books/<bookId>/story/context/chapter-XXXX.context-pack.json`
  - 供 planner / writer 读取 recent summaries、chronology、open loops、角色当前状态与当前书稿阶段

如果修订后仍未过线，则：

- 不导出最终正文
- `finalProsePath = null`

## 当前及格线

`reader agent` 的 5 项分数都必须至少为 `6`：

- `hook >= 6`
- `momentum >= 6`
- `emotionalPeak >= 6`
- `suspense >= 6`
- `memorability >= 6`

同时系统会继续检查 `scene audit`，但当前采用 `reader` 优先策略：

- 如果 reader 五项全部过线，而 `scene audit` 只剩“无决策 / 无代价 / 主题偏弱”这类质量问题，这些问题会被降为 `advisory`
- 只有真正的硬结构问题仍然会阻断最终正文导出，例如：
  - scene 漏写或计划覆盖失败
  - scene 边界错乱
  - 严重 POV 漂移

## 运行与调试

当前 `writer-cycle / revise-cycle / revise-until-pass` 都是串行执行：

`writer -> analysis -> reader -> scene audit -> revise -> re-analysis -> re-reader -> gate`

CLI 会把阶段进度、reader 分数、修改建议、scene audit 问题、target scene 与 retry 日志输出到 `stderr`，而最终 JSON 结果继续输出到 `stdout`。

OpenAI 兼容链路已经内置：

- 超时控制
- retry
- JSON 修复与 fallback

## 文档

- [项目阶段总览](./docs/project-stages.md)
- [跨章连续写作路线](./docs/cross-chapter-continuity.md)
- [详细设计](./docs/design.md)
- [调用链说明](./docs/call-flows.md)
- [使用说明](./docs/usage.md)
- [LLM 接入矩阵](./docs/llm-adoption-matrix.md)
- [修订闭环](./docs/revision-loop.md)
- [改写有效性](./docs/rewrite-effectiveness.md)
- [scene rewrite 验证](./docs/scene-rewrite-verification.md)
- [架构分析](./docs/architecture-analysis.md)
- [Chapter 2 修订示例](./docs/chapter-2-walkthrough.md)
