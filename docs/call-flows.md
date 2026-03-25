# storylab-next 调用链说明

这份文档只回答一个问题：

这些模块到底有没有真正串起来？

下面按命令逐条说明：

- 读取哪些文件
- 调用哪些 engine / service
- 写回哪些文件
- 哪些状态跨章继承
- 哪些状态只属于当前章

## 1. `run`

命令：

```bash
node dist/index.js run <workspaceDir> <bookId> <chapterNumber>
```

### 读取

- `books/<bookId>/book.json`
- `books/<bookId>/chapters/<chapter>.md`
- `story/characters/cast.json`
- `story/themes/theme-manifest.json`
- `story/style/style-guide.json`
- `story/human-gates/gates.json`
- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`

### 调用

- `StorylabRunner.run()`
- `analysis engine`
- `HistoryBuilder`

### 写回

- `story/scenes/chapter-XXXX.scene-plan.json`
- `story/characters/chapter-XXXX.character-state.json`
- `story/themes/chapter-XXXX.theme-report.json`
- `story/style/chapter-XXXX.style-report.json`
- `story/reviews/chapter-XXXX.reader-experience.json`
- `story/reviews/chapter-XXXX.revision-brief.md`
- `story/human-gates/chapter-XXXX.gate.json`
- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`

### 跨章继承

- `character-history.json`
- `theme-history.json`
- `story-memory.json`

### 当前章专属

- 本章的 scene/theme/style/review/gate 输出

## 2. `plan-next`

命令：

```bash
node dist/index.js plan-next <workspaceDir> <bookId> <targetChapterNumber>
```

### 读取

- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`
- `story/human-gates/gates.json`

### 调用

- `StorylabRunner.planNext()`
- `planning engine`

### 写回

- `story/planning/chapter-XXXX.chapter-plan.json`

### 跨章继承

- `character-history.json`
- `theme-history.json`
- `story-memory.json`

### 当前章专属

- `chapter-plan.json`

## 3. `draft-from-plan`

命令：

```bash
node dist/index.js draft-from-plan <workspaceDir> <bookId> <targetChapterNumber>
```

### 读取

- `story/planning/chapter-XXXX.chapter-plan.json`
- `story/characters/character-history.json`
- `story/themes/theme-history.json`

### 调用

- `StorylabRunner.draftFromPlan()`
- `draft engine`

### 写回

- `drafts/000X_<title>.md`

### 跨章继承

- `character-history.json`
- `theme-history.json`

### 当前章专属

- 当前草稿 markdown

## 4. `draft-cycle`

命令：

```bash
node dist/index.js draft-cycle <workspaceDir> <bookId> <targetChapterNumber>
```

### 读取

- `chapter-plan.json`
- 当前草稿正文
- `cast.json`
- `theme-manifest.json`
- `style-guide.json`
- `gates.json`

### 调用

- `draft-from-plan`
- `analysis engine`
- `SceneAuditor`

### 写回

- `drafts/000X_<title>.md`
- `story/reviews/drafts/chapter-XXXX.draft-review.json`
- `story/reviews/drafts/chapter-XXXX.draft-revision-brief.md`

### 跨章继承

- 不回写长期状态

### 当前章专属

- draft review
- draft revision brief

## 5. `revise-cycle`

命令：

```bash
node dist/index.js revise-cycle <workspaceDir> <bookId> <targetChapterNumber>
```

### 读取

- `chapter-plan.json`
- `cast.json`
- `theme-manifest.json`
- `style-guide.json`
- `gates.json`
- `character-history.json`
- `theme-history.json`
- `story-memory.json`
- 初始草稿正文

### 调用

- `draft-from-plan`
- `analysis engine`
- `SceneAuditor`
- `revise engine`
- `analysis engine` 再次运行
- `SceneAuditor` 再次运行
- `HistoryBuilder`

### 写回

#### 初始草稿评审

- `story/reviews/drafts/chapter-XXXX.draft-review.json`
- `story/reviews/drafts/chapter-XXXX.draft-revision-brief.md`

#### 修订正文与修订后评审

- `drafts/revised/000X_xxx.revised.md`
- `story/reviews/revisions/chapter-XXXX.revised-review.json`
- `story/reviews/revisions/chapter-XXXX.revised-revision-brief.md`
- `story/revisions/chapter-XXXX.comparison.json`

#### 修订后正式状态回写

- `story/scenes/chapter-XXXX.scene-plan.json`
- `story/characters/chapter-XXXX.character-state.json`
- `story/themes/chapter-XXXX.theme-report.json`
- `story/style/chapter-XXXX.style-report.json`
- `story/reviews/chapter-XXXX.reader-experience.json`
- `story/reviews/chapter-XXXX.revision-brief.md`
- `story/human-gates/chapter-XXXX.gate.json`
- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`

### 跨章继承

- `character-history.json`
- `theme-history.json`
- `story-memory.json`

### 当前章专属

- 初始评审
- 修订后评审
- comparison report
- revised draft

## 6. 当前最关键的调用链证明

当前主链已经不再是“模块并列”，而是至少形成了下面两条硬链：

### 质量分析链

`run -> analysis engine -> reports -> history/memory persist`

### 修订闭环链

`plan-next -> draft-from-plan -> draft-cycle -> revise-cycle -> re-analysis -> comparison -> persist`

## 7. 仍然不够硬的地方

当前仍需继续强化：

- blocking human gate 还没真正插入链路
- style control 还没有在 draft/revise 中成为硬约束
- scene auditor 还需要更细的弱点定位
- character/theme 问题还要更显式地进入 revise 层
