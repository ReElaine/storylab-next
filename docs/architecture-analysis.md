# storylab-next 架构分析

## 1. 项目定位

`storylab-next` 是一个独立的小说写作增强架构项目。

它参考了 Inkos 一类系统中已经被证明有效的做法，例如文件系统状态、pipeline 编排、模块职责拆分，但并不依附原项目，也不复用原仓库结构。它的目标不是“在旧系统上加几个模块”，而是重构一套更适合高质量小说生产的新系统。

当前阶段的重点不是直接追求“一键出成品”，而是先把影响产出质量的中间层搭清楚：

- 读者体验评审
- 角色动态状态
- 场景级规划
- 主题推进
- 风格约束
- 人类介入点
- 跨章累计状态

## 2. 为什么独立实现

这次没有继续沿用 Inkos 的 monorepo/workspace 方式，而是采用单包 TypeScript 项目，主要出于两个原因：

1. 之前在参考仓库的实际调试中，CLI package 出现过 workspace 解析问题，容易把实验性架构工作拖进工程联动问题里。
2. 当前阶段更适合先验证“架构闭环”是否成立，而不是先承担复杂仓库组织成本。

因此 `storylab-next` 目前采用：

- 单包 TypeScript
- 相对路径导入
- 无 workspace alias
- 无对外部核心包的强依赖

这样做的好处是结构简单、编译路径短、调试成本低，便于快速验证新架构。

## 3. 顶层目录

```text
storylab-next/
  docs/
    architecture-analysis.md
    design.md
    roadmap.md
    usage.md
    progress-review.md
  src/
    cli/
      main.ts
    core/
      llm/
        analysis-engine.ts
        draft-engine.ts
        openai-shared.ts
        planning-engine.ts
      modules/
        chapter-planner.ts
        character-engine.ts
        draft-generator.ts
        history-builder.ts
        human-review-gates.ts
        reader-experience-critic.ts
        revision-brief.ts
        scene-planner.ts
        style-engine.ts
        theme-tracker.ts
      pipeline/
        storylab-runner.ts
      project/
        demo.ts
        project-store.ts
      utils/
        text.ts
      types.ts
  demo-workspace/
  README.md
  package.json
  tsconfig.json
```

## 4. 系统分层

### CLI 层

入口文件：

- [main.ts](/C:/Working/storylab-next/src/cli/main.ts)

职责：

- 解析命令
- 初始化 demo 工作区
- 调用 runner
- 输出 JSON 结果

### Pipeline 层

核心文件：

- [storylab-runner.ts](/C:/Working/storylab-next/src/core/pipeline/storylab-runner.ts)

职责：

- 统一编排 `run / plan-next / draft-from-plan / draft-cycle`
- 调度 store、engines、modules
- 负责落盘顺序与结果聚合

### Store 层

核心文件：

- [project-store.ts](/C:/Working/storylab-next/src/core/project/project-store.ts)

职责：

- 读写书籍、章节、规划、草稿与 story 子目录
- 管理输出目录结构
- 提供统一文件命名约定

### Module 层

位于：

- [modules](/C:/Working/storylab-next/src/core/modules)

职责：

- 每个模块只负责一类叙事能力
- heuristic 版本的分析、规划、草稿生成都在这里实现

### Engine 层

位于：

- [llm](/C:/Working/storylab-next/src/core/llm)

职责：

- 给 `run / plan-next / draft-from-plan` 提供统一的可插拔引擎接口
- 当前支持 `heuristic` 与 `openai`

## 5. 当前状态目录设计

项目延续了“文件系统即状态层”的思路，但把新架构能力拆成了新的 story 子目录：

```text
books/<bookId>/story/
  scenes/
  characters/
  themes/
  reviews/
    drafts/
  style/
  human-gates/
  memory/
  planning/
books/<bookId>/drafts/
```

这样做的价值是：

- 各模块状态边界清楚
- 人类可直接查看和编辑
- heuristic 与 LLM 输出可以共存
- 后续更容易扩展 scene history、scene auditor、revision loop

## 6. 当前主流程

### `run`

1. 读取章节正文与基础配置
2. 调用 analysis engine
3. 产出：
   - scene plan
   - character state
   - theme report
   - style report
   - reader experience report
   - revision brief
   - gate decision
4. 合并跨章状态：
   - character history
   - theme history
   - story memory
5. 统一落盘

### `plan-next`

1. 读取累计状态
2. 调用 planning engine
3. 输出下一章 `chapter-plan.json`

### `draft-from-plan`

1. 读取 chapter plan
2. 读取人物历史与主题历史
3. 调用 draft engine
4. 输出草稿 markdown

### `draft-cycle`

1. 调用 `draft-from-plan`
2. 读取已落盘草稿正文
3. 再次走 analysis engine
4. 输出草稿评审结果
5. 输出草稿 revision brief

## 7. 已完成的关键增强能力

### Reader Experience Critic

已具备：

- 钩子感评分
- 推进感评分
- 情绪峰值评分
- 悬念评分
- 记忆点评分
- 风险与修订建议

### Character Engine

已具备：

- 当前欲望
- 当前恐惧
- 当前误判
- 最近决策
- 决策代价
- 关系变化
- 弧线进度

### Scene Planner

已具备：

- 场景拆分
- POV
- 目标
- 冲突
- 转折
- 结果
- 新信息
- 情绪变化

### Theme Tracker

已具备：

- theme
- anti-theme
- value conflict
- 主题信号计数
- 反主题信号计数
- 基础解释

### Style Engine

已具备：

- 平均句长
- 对白占比
- 描写占比
- 节奏提示
- 风格一致性说明

### Human Review Gates

已具备：

- gate 配置
- 指定章节触发
- 当前是否命中
- 下一个人类介入点提示

## 8. 当前架构的优点

- 工程结构简单，便于快速迭代
- 文件状态清晰，便于人工检查
- 章节分析、章节规划、草稿生成已经形成主链
- `run / plan-next / draft-from-plan` 都已具备可插拔引擎层
- 为后续接入更强 LLM 或混合模式留出了稳定接口

## 9. 当前不足

当前项目仍是“高质量写作架构原型”，不是成品系统。主要不足包括：

- LLM prompt/schema 还只是第一版
- scene history 还未实现
- scene auditor 还未实现
- 风格控制还偏分析，未形成强执行
- human gate 还未真正阻断流程
- revision loop 还未形成完整闭环
- 正文生成质量仍有模板感

## 10. 当前最适合继续强化的方向

最值得继续投入的是：

1. 强化 `OpenAIAnalysisEngine` 的评审质量
2. 强化 `OpenAIPlanningEngine` 的章节规划质量
3. 提升 `OpenAIDraftWriter` 的正文质量
4. 增加 scene history 与 scene auditor
5. 把 human gate 做成真正的中断式工作流
