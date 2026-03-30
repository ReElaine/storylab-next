# storylab-next 使用说明

## 环境要求

- Node.js 20+
- npm 10+

## 安装与检查

```bash
npm install
npm run typecheck
npm run build
```

## 常用命令

### 1. 初始化 demo 工作区

```bash
node dist/index.js init-demo ./demo-workspace
```

### 2. 分析已有章节

```bash
node dist/index.js run ./demo-workspace ember-fall 1
```

输出：

- scene / character / theme / style 分析
- reader experience
- revision brief
- human gate
- history / memory 更新

### 3. 生成下一章计划

```bash
node dist/index.js plan-next ./demo-workspace ember-fall 2
```

说明：

- 会同时生成 `chapter-plan.json`
- 也会生成 `context-pack.json`
- `context-pack` 是 `Phase 2` 初版运行时上下文包，供 planner 与 writer 共用最近章节摘要、chronology slice、active open loops、角色当前状态和当前书稿阶段

### 4. 根据计划生成 writer 工作稿

```bash
node dist/index.js write-from-plan ./demo-workspace ember-fall 2
```

说明：

- 只生成内部工作稿
- 不直接导出最终正文

### 5. writer 评审闭环

```bash
node dist/index.js writer-cycle ./demo-workspace ember-fall 2
node dist/index.js writer-cycle ./demo-workspace ember-fall 2 --override
```

说明：

- 生成 writer 工作稿
- 运行 analysis agent
- 运行 reader agent
- 运行 scene audit
- 输出 writer review 与 revision brief
- CLI 会把分阶段进度、reader 分数与 scene audit 问题输出到 `stderr`

### 6. 单轮修订闭环

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2
node dist/index.js revise-cycle ./demo-workspace ember-fall 2 --override
```

说明：

- 生成 writer 工作稿
- `analysis -> reader -> scene audit`
- `revise -> re-analysis -> re-reader`
- 如果当前版本已经通过 gate，本轮会直接跳过 revise
- 如果修后仍未过线，不导出最终正文

### 7. 自动循环直到过线

```bash
node dist/index.js revise-until-pass ./demo-workspace ember-fall 2 --override --max-iterations 3
```

说明：

- 每轮都执行：
  - `analysis agent`
  - `reader agent`
  - `scene audit`
  - `revise agent`
- 每轮都会读取 reader 建议继续修
- 整条链按串行执行，不并行触发多个 LLM agent
- 如果当前版本已经通过 gate，会直接停止并导出最终正文
- 只有当 reader 过线且不存在硬结构阻断时，才会继续进入 `settlement -> continuity audit -> persist canonical state -> final prose export`
- 只有 `continuity audit` 也通过时，才导出 `final/*.txt`
- 如果达到最大轮次、没有实际改写、或连续一轮没有有效提升，则停止
- CLI 的进度、retry、reader 分数和建议输出在 `stderr`，JSON 结果输出在 `stdout`

## LLM 切换

支持的 provider：

- `STORYLAB_ANALYSIS_PROVIDER`
- `STORYLAB_READER_PROVIDER`
- `STORYLAB_PLANNER_PROVIDER`
- `STORYLAB_WRITER_PROVIDER`
- `STORYLAB_REVISE_PROVIDER`

可选值：

- `heuristic`
- `openai`

示例：

```powershell
$env:STORYLAB_ANALYSIS_PROVIDER="openai"
$env:STORYLAB_READER_PROVIDER="openai"
$env:STORYLAB_PLANNER_PROVIDER="openai"
$env:STORYLAB_WRITER_PROVIDER="openai"
$env:STORYLAB_REVISE_PROVIDER="openai"
$env:STORYLAB_OPENAI_API_KEY="your_key"
$env:STORYLAB_OPENAI_MODEL="your_model"
$env:STORYLAB_OPENAI_BASE_URL="https://your-compatible-endpoint/v1"
```

## 输出规则

### 内部工作稿

- `books/<bookId>/story/writers-internal/*.raw.md`
- `books/<bookId>/story/revisions/internal/*.revised.raw.md`

用途：

- analysis / reader / revise / comparison / traceability

### review 与 comparison

- `books/<bookId>/story/reviews/writer/*.writer-review.json`
- `books/<bookId>/story/reviews/writer/*.writer-revision-brief.md`
- `books/<bookId>/story/reviews/revisions/*.revised-review.json`
- `books/<bookId>/story/reviews/revisions/*.revised-revision-brief.md`
- `books/<bookId>/story/revisions/*.comparison.json`

### 最终正文

- `books/<bookId>/final/*.txt`

### settlement 账本

- `books/<bookId>/story/settlement/chapter-XXXX.chapter-summary.json`
- `books/<bookId>/story/settlement/chapter-XXXX.chapter-state-delta.json`
- `books/<bookId>/story/plot/chronology.json`
- `books/<bookId>/story/plot/open-loops.json`
- `books/<bookId>/story/continuity/chapter-XXXX.continuity-report.json`

### 可选 world rules

- `books/<bookId>/story/canon/world-rules.json`

说明：

- 如果存在该文件，continuity audit 会额外检查：
  - 禁用表达是否出现在正文 / settlement 信号里
  - 某些规则在触发条件成立时，是否出现必须承接的规则信号
- continuity 现在还会检查最小版 `reveal continuity`
  - 当旧的 `mystery / question / promise` 看起来已经在正文中被揭示，但 settlement 没有把对应 loop 记成 `advanced / closed` 时，会触发 continuity 问题
- continuity 还会检查 `character state drift`
  - 当已跟踪角色的欲望 / 恐惧 / 误判在一章内发生突兀跳变，且正文缺少过渡桥接时，会触发角色状态连续性问题
- continuity 还会检查 `open loop contradiction / duplicate loop`
  - 当本章把旧 loop 名义关闭、却继续用正文强化后续压力，或把旧威胁换个名字重复新开时，会触发 loop 矛盾或重复开线问题

导出条件：

- `hook >= 6`
- `momentum >= 6`
- `emotionalPeak >= 6`
- `suspense >= 6`
- `memorability >= 6`
- 不存在硬结构阻断问题，例如 scene 漏写、scene 边界错乱或严重 POV 漂移

说明：

- 如果 reader 已过线，但 `scene audit` 只剩质量型 high severity 问题，这些问题会被降为 `advisory`
- 这类 advisory 会继续写入 review / comparison，但不会阻止 `final/*.txt` 导出
- 当前 canonical 提交流程是：`settlement -> continuity audit -> persist canonical state -> final prose export`
- `continuity_report` 会先写出；如果 continuity fail，则不会继续写 canonical `summary / delta / chronology / open-loops`，也不会导出 `final/*.txt`

如果未满足条件：

- `finalProsePath = null`

## 推荐工作方式

推荐流程：

1. 用 `run` 分析已有章节
2. 用 `plan-next` 生成下一章计划
3. 用 `write-from-plan` 生成第一版 writer 工作稿
4. 用 `writer-cycle` 看第一轮评审
5. 用 `revise-until-pass` 自动循环修订
6. 只在 `final/*.txt` 出现时把它当作真正正文
