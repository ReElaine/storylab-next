# Chapter 2 修订示例

这份文档用 demo 中的第 2 章说明：

- 原始草稿长什么样
- revise 前评审指出了什么
- revise 后增加了什么
- 角色决策 / 主题冲突 / 风格变化分别在哪里发生

## 1. 相关文件

原始草稿：

- [drafts/0002_代价开始说话.md](/C:/Working/storylab-next/demo-workspace/books/ember-fall/drafts/0002_代价开始说话.md)

revise 前评审：

- [chapter-0002.draft-review.json](/C:/Working/storylab-next/demo-workspace/books/ember-fall/story/reviews/drafts/chapter-0002.draft-review.json)

revise 后草稿：

- [drafts/revised/0002_当前草稿.revised.md](/C:/Working/storylab-next/demo-workspace/books/ember-fall/drafts/revised/0002_当前草稿.revised.md)

comparison：

- [chapter-0002.comparison.json](/C:/Working/storylab-next/demo-workspace/books/ember-fall/story/revisions/chapter-0002.comparison.json)

## 2. revise 前问题

revise 前的评审已经明确指出：

- scene 1 缺少明确决策
- scene 2 只有剧情推进，没有主题冲突
- 系统进入了 blocking gate

也就是说，当前系统已经能识别“只是发生事件，不等于戏剧成立”。

## 3. revise 后增加了什么

revise 后草稿最明显的新增，是每个场景都出现了更明确的修订锚点：

- 驱动角色
- 必须发生的决定
- 必须兑现代价
- 关系变化
- 主题冲突
- 风格执行

这说明 revise 已经不再只是泛泛补句子，而是在 scene 级别进行结构化补强。

## 4. 角色决策在哪里发生

主要看 revised draft 中每个 `【场景 X 修订锚点】` 和随后的场景正文。

例如：

- `场景 1` 明确要求“林烬必须决定是继续推进，还是暂时后撤”
- `场景 2` 明确要求“林烬必须在隐瞒、求助或抢先行动之间做决定”
- `场景 3` 明确要求“林烬必须接受代价已经发生，而不是继续自我合理化”

这意味着 Character Engine 已经开始进入：

- scene blueprint
- draft
- revise

## 5. 主题冲突在哪里发生

主要看 revised draft 中每个场景的这些字段：

- `thematicTension`
- `valuePositionA`
- `valuePositionB`
- `sceneStance`

例如：

- 主题冲突从“代价与亲密 vs 力量可以无损获得”进入具体 scene
- scene 2 开始明确要求“价值冲突通过选择体现”
- scene 3 要求“让主题暂时占上风，但保留反主题诱惑”

这说明 Theme Tracker 已经开始进入冲突设计，而不只是章后总结。

## 6. 风格变化在哪里发生

主要看 revised draft 最前面的：

- `【风格控制】`

以及每个场景里的：

- `styleDirective`

目前它已经开始影响：

- 叙述方式
- 对白差异化要求
- 节奏说明
- 描写密度要求

这还不是最终成熟的 style controller，但它已经从“评审提示”进入“生成输入”。

## 7. 当前效果如何判断

这一版还不能说正文已经成熟，但它已经证明了三件重要的事：

1. Character 不再只停留在设定表  
它开始约束谁做决定、付什么代价。

2. Theme 不再只是总结  
它开始进入 scene 的价值冲突设计。

3. Style 不再只是事后分析  
它开始作为 draft / revise 的显式控制输入。

## 8. 这份示例还不够好的地方

当前 heuristic revise 仍然比较“结构化提示式”，不是真正自然的高质量重写，因此你还能明显看到：

- 结构标签很多
- 文本仍有模板感
- 风格控制还偏显式注入

但这份示例足够证明：

系统已经开始把中间层转成“会影响正文”的硬约束，而不是只增加报告。
