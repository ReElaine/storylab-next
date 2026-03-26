# storylab-next 调用链

## 1. `run`

```bash
node dist/index.js run <workspaceDir> <bookId> <chapterNumber>
```

读取：

- `books/<bookId>/chapters/*.md`
- `story/characters/cast.json`
- `story/themes/theme-manifest.json`
- `story/style/style-guide.json`
- `story/human-gates/gates.json`

调用：

- `analysis agent`
- `reader agent`
- `HumanReviewGatekeeper`
- `HistoryBuilder`

写回：

- `story/scenes/*.scene-plan.json`
- `story/characters/*.character-state.json`
- `story/themes/*.theme-report.json`
- `story/style/*.style-report.json`
- `story/reviews/*.reader-experience.json`
- `story/reviews/*.revision-brief.md`
- `story/human-gates/*.gate.json`
- `story/characters/character-history.json`
- `story/themes/theme-history.json`
- `story/memory/story-memory.json`

## 2. `plan-next`

```bash
node dist/index.js plan-next <workspaceDir> <bookId> <targetChapterNumber>
```

读取：

- `character-history.json`
- `theme-history.json`
- `story-memory.json`
- `style-guide.json`
- `gates.json`

调用：

- `planning engine`

写回：

- `story/planning/chapter-XXXX.chapter-plan.json`

## 3. `write-from-plan`

```bash
node dist/index.js write-from-plan <workspaceDir> <bookId> <targetChapterNumber>
```

读取：

- `chapter-plan.json`
- `character-history.json`
- `theme-history.json`

调用：

- `writer agent`

写回：

- `story/writers-internal/XXXX_xxx.raw.md`

注意：

- 这里只生成内部工作稿
- 不导出最终正文

## 4. `writer-cycle`

```bash
node dist/index.js writer-cycle <workspaceDir> <bookId> <targetChapterNumber>
```

调用链：

1. `write-from-plan`
2. `analysis agent`
3. `reader agent`
4. `scene auditor`
5. `blocking gate`

写回：

- `story/reviews/writer/chapter-XXXX.writer-review.json`
- `story/reviews/writer/chapter-XXXX.writer-revision-brief.md`

## 5. `revise-cycle`

```bash
node dist/index.js revise-cycle <workspaceDir> <bookId> <targetChapterNumber> [--override]
```

调用链：

1. `write-from-plan`
2. `analysis agent`
3. `reader agent`
4. `scene auditor`
5. `revise agent`
6. `re-analysis`
7. `re-reader`
8. `comparison`
9. `persist`
10. `postRevisionGate`

写回：

- `story/revisions/internal/*.revised.raw.md`
- `story/reviews/revisions/*.revised-review.json`
- `story/reviews/revisions/*.revised-revision-brief.md`
- `story/revisions/*.comparison.json`

最终正文：

- 只有 `postRevisionGate` 通过时，才写 `final/*.txt`

## 6. `revise-until-pass`

```bash
node dist/index.js revise-until-pass <workspaceDir> <bookId> <targetChapterNumber> [--override] [--max-iterations N]
```

每轮调用：

1. `analysis agent`
2. `reader agent`
3. `scene auditor`
4. `revise agent`
5. `re-analysis`
6. `re-reader`
7. `comparison`

停止条件：

- 所有 reader 分数都 `>= 6`
- `scene audit` 无 `high severity`
- 或达到最大轮次
- 或本轮没有实际改写
- 或本轮没有产生有效提升

最终导出：

- 通过时：`books/<bookId>/final/*.txt`
- 未通过时：`finalProsePath = null`
