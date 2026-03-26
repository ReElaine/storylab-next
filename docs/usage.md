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

### 6. 单轮修订闭环

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2
node dist/index.js revise-cycle ./demo-workspace ember-fall 2 --override
```

说明：

- 生成 writer 工作稿
- `analysis -> reader -> scene audit`
- `revise -> re-analysis -> re-reader`
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
- 只有当全部关键 gate 通过时，才导出 `final/*.txt`
- 如果达到最大轮次、没有实际改写、或连续一轮没有有效提升，则停止

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

导出条件：

- `hook >= 6`
- `momentum >= 6`
- `emotionalPeak >= 6`
- `suspense >= 6`
- `memorability >= 6`
- `scene audit` 无 `high severity`

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
