# Rewrite Effectiveness

这份文档回答的是下一阶段的问题：

系统已经能证明“改了哪儿”，那它能不能进一步证明“改得值不值”？

这里要区分两件事：

## 1. 可追踪改写

可追踪改写回答的是：

- target scene 是哪个
- actual rewritten scene 是哪个
- comparison scene 是哪个
- 哪些 scene 没改
- prelude / postlude / unchanged scenes 是否保持稳定

这是“改写事实层”。

## 2. 有效改写

有效改写回答的是：

- 为什么这次改写值得做
- 改写是否解决了原问题
- 是否引入了新问题
- 改完之后到底是更好、更差，还是几乎没收益

这是“改写解释层”和“改写收益层”。

## 3. 当前 comparison 的两层结构

现在 `comparison.json` 已开始拆成两层：

### rewriteFacts

用于程序审计：

- `targetSceneNumbers`
- `actualRewrittenSceneNumbers`
- `comparisonSceneNumbers`
- `unchangedSceneNumbers`
- `reviewedButNotRewrittenSceneNumbers`
- `sceneRewriteMetadata`
- `sceneAlignment`

### rewriteInterpretation

用于人类阅读：

- `summary`
- `improved`
- `unresolved`
- `benefitSummary`

## 4. textualChangeEvidence 的新目标

`textualChangeEvidence` 不再只是“加入了决策”这种泛化说明，而是尽量提供更硬的文本级证据：

- `changeType`
- `locationHint`
- `beforeSnippet`
- `afterSnippet`
- `functionOfChange`

当前支持的 change type 包括：

- `decision_added`
- `cost_clarified`
- `conflict_strengthened`
- `thematic_tension_inserted`
- `dialogue_differentiated`
- `pacing_compressed`
- `style_tightened`

## 5. postRewriteAssessment 的新目标

`postRewriteAssessment` 现在开始回答：

- 原问题是否解决
- 是否只部分解决
- 是否没有解决
- 是否引入了新问题
- 这次改写整体收益如何

当前字段包括：

- `issueResolution`
- `newIssuesIntroduced`
- `rewriteOutcome`
- `benefitSummary`

`rewriteOutcome` 当前是最小分类判断：

- `worse`
- `unchanged`
- `slightly_better`
- `clearly_better`

## 6. 当前验证样例

这一轮新增的是一个 semi-controlled chapter sample：

- 不是纯 toy sample
- 保留了完整章节文本形态
- 仍然只有一个 blocking scene
- comparison 不只验证 traceability，也验证 rewrite benefit

测试文件：

- [tests/scene-rewrite-verification.test.mjs](/C:/Working/storylab-next/tests/scene-rewrite-verification.test.mjs)

当前断言包括：

- 只改一个 scene
- comparison 只解释该 scene
- evidence 中存在 `decision_added`
- evidence 中存在 `thematic_tension_inserted`
- 每条 evidence 都有 `beforeSnippet / afterSnippet`
- `issueResolution` 会标出问题已解决
- `rewriteOutcome` 会给出收益判断

## 7. 当前边界

这还不是成熟评分器。

现在的效果判断仍然是轻量的、规则化的，但它已经比“解释一下为什么改”前进了一步：

它开始判断：

- 这次改写到底有没有解决问题
- 这次改写有没有实际收益

下一步继续强化时，最值得做的是：

1. 让 `textualChangeEvidence` 更贴近真实 before/after diff
2. 让 `postRewriteAssessment` 能标记 `regressed`
3. 把这套能力继续迁移到更真实的章节样例中
