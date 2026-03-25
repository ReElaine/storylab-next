# storylab-next 使用说明

## 环境要求

- Node.js 20+
- npm 10+

## 安装

```bash
npm install
```

## 编译与检查

```bash
npm run typecheck
npm run build
```

## 命令

### 1. 初始化 demo 工作区

```bash
node dist/index.js init-demo ./demo-workspace
```

作用：

- 创建最小工作区
- 写入 demo 书籍
- 写入角色 seed
- 写入主题 seed
- 写入风格 guide
- 写入 human gate
- 写入第一章正文

### 2. 分析某一章

```bash
node dist/index.js run ./demo-workspace ember-fall 1
```

作用：

- 生成 scene plan
- 生成人物动态状态
- 生成主题报告
- 生成风格报告
- 生成读者体验评审
- 生成 revision brief
- 生成 gate 判断
- 更新跨章累计状态

### 3. 生成下一章计划

```bash
node dist/index.js plan-next ./demo-workspace ember-fall 2
```

作用：

- 读取 `character-history.json`
- 读取 `theme-history.json`
- 读取 `story-memory.json`
- 输出下一章 `chapter-plan.json`

### 4. 基于计划生成草稿

```bash
node dist/index.js draft-from-plan ./demo-workspace ember-fall 2
```

作用：

- 读取 `chapter-plan.json`
- 读取人物历史与主题历史
- 输出一份章节草稿 Markdown

默认模式：

- `heuristic`

### 5. 使用 OpenAI-compatible LLM 切换引擎

先设置环境变量：

```powershell
$env:STORYLAB_ANALYSIS_PROVIDER="openai"
$env:STORYLAB_PLANNER_PROVIDER="openai"
$env:STORYLAB_DRAFT_PROVIDER="openai"
$env:STORYLAB_OPENAI_API_KEY="your_key"
$env:STORYLAB_OPENAI_MODEL="your_model"
# 可选
$env:STORYLAB_OPENAI_BASE_URL="https://your-compatible-endpoint/v1"
```

然后执行：

```bash
node dist/index.js run ./demo-workspace ember-fall 1
node dist/index.js plan-next ./demo-workspace ember-fall 2
node dist/index.js draft-from-plan ./demo-workspace ember-fall 2
```

说明：

- `run` 现在支持切换 analysis engine
- `plan-next` 现在支持切换 planning engine
- `draft-from-plan` 和 `draft-cycle` 继续使用 draft engine
- 如果只想切换单个环节，也可以只设置对应的 provider 与 model 配置

### 6. 执行草稿闭环

```bash
node dist/index.js draft-cycle ./demo-workspace ember-fall 2
# 或在 blocking gate 触发时
node dist/index.js draft-cycle ./demo-workspace ember-fall 2 --override
```

作用：

- 先执行 `draft-from-plan`
- 读取已落盘草稿正文
- 对草稿再次执行 `reader / character / theme / style / gate` 分析
- 输出草稿评审结果与草稿修订 brief

### 7. 执行完整修订闭环

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2
# 或在 blocking gate 触发时
node dist/index.js revise-cycle ./demo-workspace ember-fall 2 --override
```

作用：

- 生成初始草稿
- 对初始草稿做 analysis 与 scene audit
- 根据 revision brief 和 scene audit 执行 revise
- 对修订后版本重新 analysis
- 输出 before / after comparison
- 将修订后结果写回 history 与 memory
- 如果 blocking gate 命中，默认阻断，除非显式传 `--override`

## 关键输出文件

### 单章输出

- `story/scenes/chapter-0001.scene-plan.json`
- `story/characters/chapter-0001.character-state.json`
- `story/themes/chapter-0001.theme-report.json`
- `story/style/chapter-0001.style-report.json`
- `story/reviews/chapter-0001.reader-experience.json`
- `story/reviews/chapter-0001.revision-brief.md`
- `story/human-gates/chapter-0001.gate.json`

### 跨章累计状态

- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`

### 下一章规划

- `story/planning/chapter-0002.chapter-plan.json`

### 草稿输出

- `drafts/0002_xxx.md`

### 草稿评审输出

- `story/reviews/drafts/chapter-0002.draft-review.json`
- `story/reviews/drafts/chapter-0002.draft-revision-brief.md`

### 修订闭环输出

- `drafts/revised/0002_xxx.revised.md`
- `story/reviews/revisions/chapter-0002.revised-review.json`
- `story/reviews/revisions/chapter-0002.revised-revision-brief.md`
- `story/revisions/chapter-0002.comparison.json`

## 推荐工作方式

当前推荐流程：

1. 准备章节正文
2. 跑 `run`
3. 查看 scene plan 是否合理
4. 查看人物状态是否抓到“欲望-决策-代价”
5. 查看 reader report 是否指出推进问题
6. 查看 revision brief 是否能直接指导修订
7. 跑 `plan-next` 生成下一章计划
8. 跑 `draft-from-plan` 生成草稿
9. 跑 `draft-cycle` 形成草稿评审闭环
10. 跑 `revise-cycle` 执行修订闭环
11. 再进入下一轮写作或修订

## 已知限制

- 当前仍然以 heuristic 为主，不是完整 LLM 版本
- LLM 路径已经打通，但 prompt 和 schema 还属于第一版
- 还没有 scene history
- 已经能生成草稿，但还不是最终成品章节
- human gate 还没有真正阻断流程

## 下一步

最值得继续做的是：

1. scene history
2. planner / critic 的 LLM 质量增强
3. 正文生成质量提升
4. 真正的人类 Gate 中断机制
