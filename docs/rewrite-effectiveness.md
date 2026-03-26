# 改写有效性

这份文档回答的是当前主阶段的问题：

系统已经能证明“改了哪儿”，那它能不能继续证明“改得值不值”？

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
- 改完之后到底是更好、更差，还是几乎没有收益

这是“改写解释层”和“改写收益层”。

## 3. 当前 comparison 的两层结构

现在 `comparison.json` 已经拆成两层：

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

## 4. textualChangeEvidence 当前做到了什么

`textualChangeEvidence` 不再只是“加入了决策”这种泛化说明，而是开始提供更硬的文本级证据：

- `changeType`
- `locationHint`
- `beforeSnippet`
- `afterSnippet`
- `functionOfChange`

当前支持的主要 `changeType` 包括：

- `decision_added`
- `cost_clarified`
- `conflict_strengthened`
- `thematic_tension_inserted`
- `dialogue_differentiated`
- `pacing_compressed`
- `style_tightened`

这意味着 comparison 已经开始回答：

- 到底哪一小段文本发生了变化
- 这次变化承担了什么结构功能

## 5. postRewriteAssessment 当前做到了什么

`postRewriteAssessment` 当前开始回答：

- 原问题是否解决
- 是否只是部分解决
- 是否没有解决
- 是否引入了新问题
- 这次改写整体收益如何

当前关键字段包括：

- `issueResolution`
- `newIssuesIntroduced`
- `rewriteOutcome`
- `benefitSummary`

其中 `rewriteOutcome` 当前是最小分类判断：

- `worse`
- `unchanged`
- `slightly_better`
- `clearly_better`

## 6. 当前验证样例

当前验证使用的是一个 semi-controlled chapter sample：

- 不是纯 toy sample
- 保留了完整章节文本结构
- 仍然只设一个主要 blocking scene
- comparison 不只验证 traceability，也验证 rewrite benefit

测试文件：

- [tests/scene-rewrite-verification.test.mjs](/C:/Working/storylab-next/tests/scene-rewrite-verification.test.mjs)

当前已验证：

- 只改一个 scene
- comparison 只解释该 scene
- evidence 中存在 `beforeSnippet / afterSnippet`
- `decision_added`
- `thematic_tension_inserted`
- `issueResolution` 会标出问题是否解决
- `rewriteOutcome` 会给出收益判断

## 7. 当前边界

这还不是成熟的收益评估器。

目前的效果判断仍然是轻量、规则化的，但它已经比“解释一下为什么改”更进一步，开始判断：

- 这次改写到底有没有解决问题
- 这次改写到底有没有实际收益

## 8. 下一步应该继续强化什么

最值得继续做的是：

1. 让 `textualChangeEvidence` 更贴近真实 before/after diff
2. 让 `postRewriteAssessment` 支持更明确的 `regressed`
3. 把这套能力迁移到更真实的章节样例中继续验证

