# storylab-next 路线图

## 总体目标

把 `storylab-next` 从“独立架构原型”推进成“可持续迭代的高质量小说写作系统”。

当前不是去做一个庞杂平台，而是按最直接影响产出质量的路径推进。

## 阶段一：单章增强分析

状态：

- 已完成

内容：

- Scene Planner
- Character Engine
- Theme Tracker
- Style Engine
- Reader Experience Critic
- Human Review Gates

## 阶段二：跨章累计状态

状态：

- 已完成基础版

已完成：

- `character-history.json`
- `theme-history.json`
- `story-memory.json`
- `plan-next`

未完成：

- `scene-history.json`

## 阶段三：章节主链打通

目标：

- `plan -> draft -> review -> revise`

当前状态：

- `plan-next` 已完成
- `draft-from-plan` 已完成
- `draft-cycle` 已完成第一版

还未完成：

- 正式 revise 阶段
- revise 后再分析与状态回写

## 阶段四：可插拔智能引擎

目标：

- 让 heuristic 与 LLM 能平滑切换
- 让每条主链都有独立引擎层

当前状态：

- `run` 已支持 `heuristic / openai`
- `plan-next` 已支持 `heuristic / openai`
- `draft-from-plan` / `draft-cycle` 已支持 `heuristic / openai`

下一步重点：

- 强化 OpenAI prompt
- 明确 JSON schema
- 增加更稳的 fallback 与校验
- 评估 hybrid 模式

## 阶段五：人类协作工作流

目标：

- 让 human gate 成为真正的流程节点
- 让关键时刻必须人工确认

计划包括：

- 开书前 gate
- 前几章 gate
- 中盘 gate
- 结尾 gate
- gate 阻断与恢复机制

## 阶段六：质量增强

重点方向：

1. scene history
2. scene auditor
3. 更强的人物状态迁移
4. 更强的主题推进逻辑
5. 更强的风格控制
6. 更成熟的 revision loop

## 当前优先级

如果按“最值得投入”排序，建议是：

1. 提升 `OpenAIAnalysisEngine` 的评审质量
2. 提升 `OpenAIPlanningEngine` 的规划质量
3. 提升 `OpenAIDraftWriter` 的正文质量
4. 增加 scene history
5. 增加 scene auditor
6. 做真正的 human gate 中断机制
