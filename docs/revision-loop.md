# storylab-next 修订闭环设计

这份文档说明当前项目中真正会影响正文质量的修订闭环。

目标不是“多一份报告”，而是把以下链路做实：

`analysis -> critique -> revision brief -> revise -> re-analysis -> persist`

## 1. 当前闭环入口

命令：

```bash
node dist/index.js revise-cycle ./demo-workspace ember-fall 2
```

## 2. revise-cycle 的完整过程

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

然后读取初始草稿正文。

### 第三步：首次 analysis

调用：

- `analysis engine`

输出：

- scenes
- character states
- theme report
- style report
- reader experience report
- gate decision
- revision brief

### 第四步：scene audit

将：

- `chapter plan.sceneBlueprint`
- `analysis.scenes`

做对照审计，检查：

- 是否漏写 scene
- 是否目标失焦
- 是否冲突不足
- 是否转折缺失
- 是否结果不清晰
- 是否 POV 漂移

### 第五步：执行 revise

调用：

- `revise engine`

输入：

- 原始草稿
- chapter plan
- analysis 结果
- scene audit 结果
- character history
- theme history
- style guide

输出：

- revised draft

### 第六步：re-analysis

对修订后的正文再次调用：

- `analysis engine`

然后再次运行：

- `scene auditor`

### 第七步：比较 before / after

输出 comparison report，至少比较：

- hook delta
- momentum delta
- emotional peak delta
- suspense delta
- memorability delta
- scene issue delta

### 第八步：persist

将修订后的 analysis 结果重新写回：

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

### 初始草稿评审

- `story/reviews/drafts/chapter-XXXX.draft-review.json`
- `story/reviews/drafts/chapter-XXXX.draft-revision-brief.md`

### 修订后评审

- `story/reviews/revisions/chapter-XXXX.revised-review.json`
- `story/reviews/revisions/chapter-XXXX.revised-revision-brief.md`

### 对比报告

- `story/revisions/chapter-XXXX.comparison.json`

### 修订正文

- `drafts/revised/000X_xxx.revised.md`

## 4. 当前 revise loop 已解决的问题

- 修订前后不再只是“感觉更好了”
- 有 before/after 的结构化比较
- 修订后结果会重新写回 history 与 memory
- scene plan 不再只是附件，而是 revise 的硬基准之一

## 5. 当前 revise loop 仍然不足的地方

- heuristic revise 仍偏局部补强，不是成熟重写器
- style control 还没有完全进入 revise 行为
- 角色问题还没有按 scene 粒度局部重写
- blocking gate 还未进入 revise 阶段控制

## 6. 下一步应继续强化什么

优先级建议：

1. 让 revise engine 更强地按 scene 定位问题
2. 让 revise engine 能按角色问题定点重写
3. 让 style report 直接生成 style constraints
4. 让 revise 后的 comparison 不只比较分数，还比较问题收敛情况
