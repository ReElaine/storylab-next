# storylab-next 修订闭环

这份文档只回答一个问题：

`storylab-next` 的修订链路，是否已经从“输出分析报告”进入“按问题改写正文”。

当前结论是：

- 已经形成第一版可运行修订闭环
- revise 已经下沉到 `scene` 粒度
- 但 rewrite quality 仍处在继续强化阶段

当前主链如下：

`analysis -> critique -> revision brief -> scene-level revise -> re-analysis -> comparison -> persist`

当前实际运行方式：

- 串行执行
- 每个阶段输出进度与 debug 信息
- LLM 调用带 timeout / retry / JSON 修复

## 1. 命令入口

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2
```

如果 blocking gate 被触发，默认会中断；需要显式传入：

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2 --override
```

## 2. 闭环目标

这条链路的目标不是“再分析一遍草稿”，而是：

- 先定位问题 scene
- 再只改目标 scene
- 改完后重新分析
- 最后把改写前后差异与效果落盘

## 3. revise-cycle 调用链

### 第一步：准备输入

读取：

- `story/planning/chapter-0002.chapter-plan.json`
- `story/characters/cast.json`
- `story/themes/theme-manifest.json`
- `story/style/style-guide.json`
- `story/human-gates/gates.json`
- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`

### 第二步：生成或读取初始草稿

`revise-cycle` 会先调用：

- `write-from-plan`

然后读取已落盘草稿正文。

### 第三步：before analysis

调用：

- `analysis engine`

输出：

- scenes
- character states
- theme report
- style report
- gate decision
- revision brief

说明：

- `reader report` 现在由独立 `reader agent` 生成，不再混在 `analysis` 输出里

### 第四步：scene audit

对照：

- `chapterPlan.sceneBlueprint`
- `analysis.scenes`

检查：

- 是否漏写 scene
- 是否目标失焦
- 是否缺少决策
- 是否缺少代价
- 是否主题冲突不足
- 是否 POV 漂移

### 第五步：reader gate 与是否进入 revise

在进入 revise 前，系统先检查：

- `reader` 五项分数是否全部 `>= 6`
- 是否仍存在硬结构阻断问题

当前采用 `reader` 优先策略：

- 如果 reader 已过线，而 scene audit 只剩质量型问题，这些问题会降为 `advisory`
- 如果当前版本已经通过 gate，本轮会直接跳过 revise，进入 comparison 与 persist
- 只有 gate 仍为 blocking 时，才继续进入 scene-level revise

### 第六步：scene-level revise

调用：

- `revise engine`

输入包括：

- 原始草稿全文
- chapter plan
- analysis 结果
- scene audit 结果
- character history
- theme history
- style guide
- `targetSceneNumbers`

这里最关键的是：

- revise 不再默认整章重写
- 系统优先定位问题 scene
- 如果 blocking gate 命中，则优先只修 blocking scenes
- 每个待修 scene 的输入都包含：
  - 原 scene 文本
  - scene blueprint
  - 该 scene 的 critique 问题
  - character / theme / style 约束

输出：

- revised writer working
- revision trace

### 第七步：re-analysis

对修订后正文再次调用：

- `analysis engine`
- `scene auditor`
- `reader agent`

### 第八步：comparison

输出 `comparison.json`，当前包含两层：

- `rewriteFacts`
- `rewriteInterpretation`

并按 scene 给出：

- 修改前问题
- 实际采用的 rewrite strategy
- 文本级 change evidence
- post-rewrite assessment

### 第九步：persist

把修订后的 analysis 结果重新写回：

- `story/scenes/`
- `story/characters/`
- `story/themes/`
- `story/style/`
- `story/reviews/`
- `story/human-gates/`
- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`

同时额外写入：

- `story/revisions/internal/`
- `story/reviews/revisions/`
- `story/revisions/`

同时如果当前版本已经通过 gate，则会额外导出：

- `final/*.txt`

## 4. 当前输出文件

writer review：

- `story/reviews/writer/chapter-XXXX.writer-review.json`
- `story/reviews/writer/chapter-XXXX.writer-revision-brief.md`

revised review：

- `story/reviews/revisions/chapter-XXXX.revised-review.json`
- `story/reviews/revisions/chapter-XXXX.revised-revision-brief.md`

comparison：

- `story/revisions/chapter-XXXX.comparison.json`

revised writer working：

- `story/revisions/internal/000X_xxx.revised.raw.md`

## 5. 当前这条闭环已经解决了什么

这轮主链已经解决的不是“多一份报告”，而是：

- scene plan 不再只是 planning artifact，而是 revise 的硬基准
- 系统可以优先只改问题 scene，而不是默认整章重写
- before / after 已经有结构化 comparison
- 修订后结果会写回 history 与 memory
- blocking gate 已经能够中断流程并指出阻断 scene
- reader 已过线时，系统不会继续盲目 revise 把已达标文本修坏

## 6. 当前边界

当前仍然存在的边界：

- heuristic revise 仍偏结构化改写，不是成熟小说重写器
- style control 还没有完全内化到所有局部重写中
- character/theme 驱动的局部改写还可以继续做细
- comparison 还不是完整 scene diff 可视化
- 全 LLM 串行链路仍然偏慢，writer 与 analysis 是主要耗时项

## 7. 下一步最值得强化的点

优先建议：

1. 让 revise engine 的局部重写更贴近真实文本差异
2. 让 post-rewrite assessment 更准确判断“改写是否真的有效”
3. 继续强化 style local rewrite，而不是停留在 scene directive


