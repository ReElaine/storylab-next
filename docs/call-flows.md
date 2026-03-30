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
- `story/settlement/*.chapter-summary.json`
- `story/plot/chronology.json`
- `story/plot/open-loops.json`
- `story/plot/reveals-ledger.json`
- `story/characters/relationship-ledger.json`
- `style-guide.json`
- `gates.json`

调用：

- `ContextAssembler`
- `planning engine`

写回：

- `story/context/chapter-XXXX.context-pack.json`
- `story/planning/chapter-XXXX.chapter-plan.json`

`context-pack.json` 当前会携带：

- recent chapter summaries
- chronology slice
- active open loops
- recent reveals
- recent relationship changes
- relevant character states
- current book phase

## 3. `write-from-plan`

```bash
node dist/index.js write-from-plan <workspaceDir> <bookId> <targetChapterNumber>
```

读取：

- `chapter-plan.json`
- `context-pack.json`
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
9. `postRevisionGate`
10. `re-settlement`
11. `re-audit`
12. `persist canonical state`
13. `final prose export`

写回：

- `story/revisions/internal/*.revised.raw.md`
- `story/reviews/revisions/*.revised-review.json`
- `story/reviews/revisions/*.revised-revision-brief.md`
- `story/revisions/*.comparison.json`

最终正文：

- 只有 `postRevisionGate` 与 `continuity audit` 都通过时，才写 `final/*.txt`
- `continuity_report` 会先落盘
- 只有 continuity 通过后，才会继续：
  - 写 canonical `chapter-summary`
  - 写 canonical `chapter-state-delta`
  - 更新 `chronology`
  - 更新 `open-loops`
  - 更新 `reveals-ledger`
  - 更新 `relationship-ledger`
  - 导出 `final/*.txt`

## 6. `revise-until-pass`

```bash
node dist/index.js revise-until-pass <workspaceDir> <bookId> <targetChapterNumber> [--override] [--max-iterations N]
```

每轮调用：

1. `analysis agent`
2. `reader agent`
3. `scene auditor`
4. `blocking gate`
5. 如果仍然 blocking，再调用 `revise agent`
6. `re-analysis`
7. `re-reader`
8. `comparison`
9. `re-settlement`
10. `re-audit`

说明：

- 整条链按串行执行，不并行调用多个 LLM agent
- CLI 会输出阶段进度、reader 分数、修改建议、scene audit 问题和 retry 日志
- 如果当前版本已经通过 gate，会直接停止，不进入 revise
- 每一轮 revise 之后，canonical 判定都基于“改后 settlement + 改后 continuity report”
- re-settlement 会先回到“目标章节之前的 canonical 基线”再 fold 当前章，避免把旧账重复叠加

停止条件：

- 所有 reader 分数都 `>= 6`
- 不存在硬结构阻断问题
- 或达到最大轮次
- 或本轮没有实际改写
- 或本轮没有产生有效提升

reader 优先规则：

- 如果 reader 已过线，而 scene audit 只剩质量型 high severity 问题，这些问题会降为 `advisory`
- 只有 scene 漏写、scene 边界错乱、严重 POV 漂移等硬结构问题继续阻断最终导出

最终导出：

- 通过时：`books/<bookId>/final/*.txt`
- 未通过时：`finalProsePath = null`

通过后的额外持久化：

- `books/<bookId>/story/continuity/chapter-XXXX.continuity-report.json`
- `books/<bookId>/story/settlement/chapter-XXXX.chapter-summary.json`
- `books/<bookId>/story/settlement/chapter-XXXX.chapter-state-delta.json`
- `books/<bookId>/story/plot/chronology.json`
- `books/<bookId>/story/plot/open-loops.json`
- `books/<bookId>/story/plot/reveals-ledger.json`
- `books/<bookId>/story/characters/relationship-ledger.json`
