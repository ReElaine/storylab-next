# storylab-next 修订闭环设计

这份文档只回答一个问题：

`storylab-next` 的修订链路，是否已经从“输出报告”走到了“按问题改稿”。

当前答案是：已经进入第一版可运行闭环，而且修订粒度开始下沉到 `scene`。

主链如下：

`analysis -> critique -> revision brief -> scene-level revise -> re-analysis -> comparison -> persist`

## 1. 命令入口

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2
```

如果 blocking gate 被触发，默认会中断；需要显式传入：

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2 --override
```

## 2. revise-cycle 的完整流程

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

- `draft-from-plan`

然后读取已落盘的草稿正文。

### 第三步：首次 analysis

调用：

- `analysis engine`

输出：

- scene 分析
- character state
- theme report
- style report
- reader experience report
- gate decision
- revision brief

### 第四步：scene audit

把：

- `chapter plan.sceneBlueprint`
- `analysis.scenes`

做对照审计，检查：

- 是否漏写 scene
- 是否目标失焦
- 是否缺少决策
- 是否缺少代价
- 是否主题冲突不足
- 是否 POV 漂移

### 第五步：scene-level revise

调用：

- `revise engine`

输入：

- 原始草稿全文
- 章节 plan
- analysis 结果
- scene audit 结果
- character history
- theme history
- style guide
- `targetSceneNumbers`

这里最关键的变化是：

- revise 不再默认整章重写
- 系统会优先定位有问题的 `scene`
- 如果 blocking gate 命中，则优先只修 blocking scenes
- 每个待修 `scene` 的输入都包含：
  - 原 scene 文本
  - scene blueprint
  - 该 scene 的 critique 问题
  - character / theme / style 约束

输出：

- revised draft

### 第六步：re-analysis

对修订后的正文再次调用：

- `analysis engine`
- `scene auditor`

### 第七步：comparison

输出 `comparison.json`，包含：

- reader score delta
- scene issue delta
- improved / unresolved 摘要
- `sceneChanges`

其中 `sceneChanges` 会按场景给出：

- 修改前问题
- 修改策略
- character change
- theme change
- style change
- before excerpt
- after excerpt

### 第八步：persist

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

- `drafts/revised/`
- `story/reviews/revisions/`
- `story/revisions/`

## 3. 当前输出文件

初始草稿评审：

- `story/reviews/drafts/chapter-XXXX.draft-review.json`
- `story/reviews/drafts/chapter-XXXX.draft-revision-brief.md`

修订后评审：

- `story/reviews/revisions/chapter-XXXX.revised-review.json`
- `story/reviews/revisions/chapter-XXXX.revised-revision-brief.md`

对比报告：

- `story/revisions/chapter-XXXX.comparison.json`

修订正文：

- `drafts/revised/000X_xxx.revised.md`

## 4. 这一轮闭环真正解决了什么

- 修订前后不再只是“感觉更好了”
- 现在有 before / after 的结构化 comparison
- 修订后结果会写回 history 和 memory
- scene plan 不再只是附件，而是 revise 的硬基准
- 系统已经具备“scene 2 有问题，就优先只改 scene 2”的能力

## 5. 当前仍然不足的地方

- heuristic revise 仍偏结构化改写，不是成熟小说重写器
- style control 还没有完全内化到所有局部重写里
- 角色问题和主题问题虽然已进入 scene revise，但还可以更细
- comparison 现在能解释改写方向，但还不是完整 scene diff 可视化

## 6. 下一步继续强化什么

优先建议：

1. 让 revise engine 对角色问题的局部重写更细
2. 让 revise engine 对主题冲突的重写更明确
3. 让 style report 直接产出更硬的局部 style constraints
4. 让 comparison 报告继续增强“改好在哪”的解释性
