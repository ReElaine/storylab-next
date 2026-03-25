# Chapter 2 修订示例

这份文档用 demo 中的第 2 章说明：

- 原始草稿是什么样
- revise 前评审指出了什么
- revise 后增加了什么
- 角色决策 / 主题冲突 / 风格变化分别在哪里发生

## 1. 相关文件

原始草稿：

- [0002_代价开始说话.md](/C:/Working/storylab-next/demo-workspace/books/ember-fall/drafts/0002_代价开始说话.md)

revise 前评审：

- [chapter-0002.draft-review.json](/C:/Working/storylab-next/demo-workspace/books/ember-fall/story/reviews/drafts/chapter-0002.draft-review.json)

revise 后草稿：

- [0002_当前草稿.revised.md](/C:/Working/storylab-next/demo-workspace/books/ember-fall/drafts/revised/0002_当前草稿.revised.md)

comparison：

- [chapter-0002.comparison.json](/C:/Working/storylab-next/demo-workspace/books/ember-fall/story/revisions/chapter-0002.comparison.json)

## 2. revise 前的问题

当前评审已经明确指出：

- scene 1 缺少明确决策
- scene 2 只有剧情推进，没有主题冲突
- 系统触发了 blocking gate

这意味着系统已经能够识别：

“发生了事件”不等于“戏剧成立”。

## 3. 这轮 revise 做了什么

这次修订不是整章重写，而是优先改有问题的 scene。

核心变化有三类：

- 补强 driving character 的主动决策
- 让 decision 与 cost 在 scene 内落地
- 把价值冲突和 style directive 真正写进 scene

## 4. 示例：scene 1

### 原问题

- 缺少明确决策

### revise 策略

- 让林烬必须在“继续推进 / 暂时后撤”之间做选择
- 让这个选择立刻带来代价
- 让阻力来自对手与情境，而不是说明句

### 改写后效果

- 角色不再只是信息载体
- scene 中出现了明确的“选择 -> 后果”
- 关系压力开始进入动作与对白

## 5. 示例：scene 2

### 原问题

- 只有事件推进，没有主题冲突

### revise 策略

- 把“代价与亲密 vs 力量可以无损获得”的价值冲突写进场景
- 让角色通过行为和对白站队
- 用对白差异而不是说明句体现 tension

### 改写后效果

- scene 不再只是情节连接段
- 主题冲突开始承担结构作用
- 风格控制开始进入正文内部

## 6. 角色、主题、风格分别怎么落地

角色决策：

- 看 revised draft 中每个场景的主动行动与代价兑现

主题冲突：

- 看 `comparison.json` 里的 `themeChange`
- 看 revised draft 里冲突是否通过行为和对白体现

风格变化：

- 看 `comparison.json` 里的 `styleChange`
- 看 revised draft 里节奏是否更紧、对白是否更分化

## 7. 这份示例证明了什么

这份示例还不能证明正文已经成熟，但它已经证明三件重要的事：

1. 系统开始能按 scene 改稿，而不是整章泛化修订
2. Character / Theme / Style 已经进入具体改写决策
3. comparison 不再只是 diff，而开始解释“为什么改、改了什么”

## 8. 仍然不够好的地方

当前 heuristic revise 仍偏“结构化重写器”，还不是自然成熟的小说改写器，所以仍能看到：

- 文本仍有模板感
- 局部语言质感还不够细
- 风格控制还没有完全隐入正文

但这份示例已经足够证明：

系统开始把中间层变成“会影响正文”的硬约束，而不是只增加报告。
