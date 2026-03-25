# Scene Rewrite Verification

这份文档对应第三轮修正意见里最关键的要求：

不是“看起来像只改了一个 scene”，而是要能严格证明：

- 只有一个 blocking scene
- 只有这个 scene 被改
- 其他 scenes 不变
- comparison 只解释这个 scene
- scene 边界在前后保持稳定

## 1. 三组 scene 集合的区别

### targetSceneNumbers

runner 决定“准备修哪些 scene”。

这是一组意图，不代表一定真的改到了。

### actualRewrittenSceneNumbers

revise engine 实际成功替换了哪些 scene。

这是一组事实，必须由 revise engine 在执行替换时显式记录。

### comparisonSceneNumbers

comparison 实际解释哪些 scene。

当前规则是：

`comparisonSceneNumbers === actualRewrittenSceneNumbers`

也就是说，comparison 不再用 issue 并集冒充“本次改写的 scene”。

## 2. 当前新增的证据字段

在 `comparison.json` 和 revise trace 里，当前会明确输出：

- `targetSceneNumbers`
- `actualRewrittenSceneNumbers`
- `comparisonSceneNumbers`
- `unchangedSceneNumbers`
- `reviewedButNotRewrittenSceneNumbers`
- `sceneRewriteMetadata`

其中 `sceneRewriteMetadata` 会记录：

- `reason`
- `strategy`

## 3. 自动化验证样例

自动化验证在：

- [tests/scene-rewrite-verification.test.mjs](/C:/Working/storylab-next/tests/scene-rewrite-verification.test.mjs)
- [tests/scene-text.test.mjs](/C:/Working/storylab-next/tests/scene-text.test.mjs)

运行方式：

```bash
npm test
```

## 4. 验证样例内容

这个样例是一个受控章节文本，结构如下：

```text
prelude
scene 1
scene 2
scene 3
postlude
```

其中：

- scene 1 正常，包含决策、代价、主题冲突
- scene 2 是唯一 blocking scene，缺少明确决策与主题冲突
- scene 3 正常，包含决策与代价

## 5. 核心断言

测试里会严格验证：

1. blocking gate 只命中 scene 2
2. `targetSceneNumbers === [2]`
3. `actualRewrittenSceneNumbers === [2]`
4. `comparisonSceneNumbers === [2]`
5. scene 1 字节级不变
6. scene 3 字节级不变
7. prelude 不变
8. postlude 不变
9. `stableByParsedScenes === true`
10. `stableByAnalysisScenes === true`

## 6. 对 comparison 的要求

当前 comparison 已经不再只做模板化解释，而是建立在这几层信息交叉上：

- 原 scene 文本
- revised scene 文本
- revise 前问题
- 实际采用的 rewrite strategy
- revise 后 assessment

每个 `sceneChanges` 条目至少包含：

- `beforeProblems`
- `appliedRewriteStrategy`
- `textualChangeEvidence`
- `postRewriteAssessment`
- `beforeExcerpt`
- `afterExcerpt`

## 7. scene-text 边界修复

这轮同时修复了 `scene-text.ts` 的边界问题。

当前 parser 会明确区分：

- `prelude`
- `scene blocks`
- `postlude`

并且 `replaceSceneUnits()` 会保证：

- prelude 原样保留
- 未改 scene 原样保留
- postlude 原样保留

这部分由：

- [src/core/utils/scene-text.ts](/C:/Working/storylab-next/src/core/utils/scene-text.ts)
- [tests/scene-text.test.mjs](/C:/Working/storylab-next/tests/scene-text.test.mjs)

共同验证。

## 8. 当前结论

到这一步，系统才算真正跨过了“看起来像 scene-level revise”的门槛，进入：

`可以严格证明只改了某一个 scene`

这也是后续继续增强 character-driven rewrite、theme-driven rewrite、style local rewrite 的基础。
