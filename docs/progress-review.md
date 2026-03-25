# storylab-next 阶段进展评审包

这份文档用于让外部评审者快速判断项目当前进度、完成度和下一步重点。

## 一句话结论

`storylab-next` 已经完成了“独立架构骨架 + 跨章状态 + 章节规划 + 草稿生成 + 草稿评审闭环 + 可插拔引擎层”的第一阶段核心建设，但离“高质量小说生成系统”还有明显距离。

## 当前已经完成

### 架构与工程

- 独立项目，不依附 Inkos
- 单包 TypeScript，规避 workspace 解析问题
- 中文文档优先
- CLI、pipeline、store、modules、engines 分层清晰

### 叙事模块

- Reader Experience Critic
- Character Engine
- Scene Planner
- Theme Tracker
- Style Engine
- Human Review Gates

### 状态体系

- `character-history.json`
- `theme-history.json`
- `story-memory.json`
- 章节评审结果与草稿评审结果落盘

### 主流程

- `run`
- `plan-next`
- `draft-from-plan`
- `draft-cycle`

### 引擎抽象

- `analysis engine`
- `planning engine`
- `draft engine`

三者都支持：

- `heuristic`
- `openai`

## 当前部分完成

### LLM 化

已经完成：

- 三条主链的 OpenAI-compatible 接口

仍不足：

- prompt 还只是第一版
- schema 约束还不够细
- 质量收益尚未充分验证

### 草稿生成

已经完成：

- 基于 chapter plan 生成草稿
- 草稿可回接评审

仍不足：

- 正文仍有模板感
- 场景差异化不足
- 角色声音还不够强

### 人工介入

已经完成：

- gate 配置与提示

仍不足：

- 还没有真实阻断
- 还没有“确认后继续”机制

## 当前还没开始或基本没开始

- scene history
- scene auditor
- revise 正式阶段
- revise 后再分析与状态对齐
- 强执行式 style control
- 阻断式 human gate workflow

## 适合外部评审重点看的问题

建议评审者重点看以下问题：

1. 当前数据结构是否足够支撑后续扩展
2. `run / plan-next / draft-from-plan / draft-cycle` 这条主链是否合理
3. 可插拔引擎层的边界是否清楚
4. 哪些能力应继续保持 heuristic，哪些应尽快彻底 LLM 化
5. 下一阶段优先做 scene history 还是 revise loop
6. 当前状态目录设计是否合理

## 建议评审入口

建议优先阅读：

1. [README.md](/C:/Working/storylab-next/README.md)
2. [design.md](/C:/Working/storylab-next/docs/design.md)
3. [architecture-analysis.md](/C:/Working/storylab-next/docs/architecture-analysis.md)
4. [storylab-runner.ts](/C:/Working/storylab-next/src/core/pipeline/storylab-runner.ts)
5. [analysis-engine.ts](/C:/Working/storylab-next/src/core/llm/analysis-engine.ts)
6. [planning-engine.ts](/C:/Working/storylab-next/src/core/llm/planning-engine.ts)
7. [draft-engine.ts](/C:/Working/storylab-next/src/core/llm/draft-engine.ts)

## 当前最重要的判断

如果目标是“验证新架构方向是否成立”，当前答案是：

- 成立

如果目标是“现在就得到稳定高质量小说正文”，当前答案是：

- 还没有达到

## 下一步建议

最推荐的顺序是：

1. 提升 analysis/planning 的 LLM 质量
2. 提升 draft 的正文质量
3. 增加 scene history
4. 增加 scene auditor
5. 做 revise loop
6. 做真正的 human gate 中断机制
