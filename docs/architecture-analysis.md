# storylab-next 架构分析

## 1. 项目定位

`storylab-next` 是一个独立的小说写作系统原型。当前关注点是把多 agent 写作主链做实：

- 文件系统状态外置
- pipeline runner 统一编排
- writer / analysis / reader / revise 解耦
- 审计与修订闭环
- 自动循环修订与最终正文导出

当前重点不是“一键出成品”，而是把真正影响正文质量的中间层做硬：

- scene planning
- character-driven conflict
- theme-driven tension
- style control
- scene-level revise
- rewrite traceability
- rewrite effectiveness

## 2. 为什么独立实现

`storylab-next` 没有沿用原 monorepo/workspace 方式，而是采用单包 TypeScript 项目，原因有两个：

1. 之前在参考仓库的实际调试中，workspace 解析带来过工程联动问题，不适合新架构快速实验。
2. 当前阶段更需要验证“主链是否成立、证据链是否可靠”，而不是先承担复杂仓库组织成本。

因此当前项目采用：

- 单包 TypeScript
- 相对路径导入
- 无 workspace alias
- 无对原项目核心包的依赖

## 3. 当前目录摘要

```text
storylab-next/
  docs/
  src/
    cli/
    core/
      llm/
      modules/
      pipeline/
      project/
      utils/
      types.ts
  tests/
  demo-workspace/
  README.md
  package.json
  tsconfig.json
```

核心代码路径：

- CLI 入口：[main.ts](/C:/Working/storylab-next/src/cli/main.ts)
- 主编排器：[storylab-runner.ts](/C:/Working/storylab-next/src/core/pipeline/storylab-runner.ts)
- 状态存取：[project-store.ts](/C:/Working/storylab-next/src/core/project/project-store.ts)
- 引擎层：[llm](/C:/Working/storylab-next/src/core/llm)
- 叙事模块层：[modules](/C:/Working/storylab-next/src/core/modules)

## 4. 系统分层

### CLI 层

职责：

- 解析命令
- 初始化 demo 工作区
- 调用 runner
- 返回运行结果

### Pipeline 层

职责：

- 编排 `run / plan-next / write-from-plan / writer-cycle / revise-cycle / revise-until-pass`
- 统一调度 engine、store、modules
- 组织 analysis、writer、reader、revise、comparison、persist 顺序

### Store 层

职责：

- 读写书籍、章节、planning、writer working、review、revision
- 维护 `story/` 子目录状态
- 维护 writer working / revised writer working 输出

### Module 层

职责：

- 承担 heuristic 叙事能力
- 提供 scene / character / theme / style / review 等模块化能力

### Engine 层

职责：

- 对外提供可切换引擎接口
- 当前支持 `heuristic / openai`
- 让 analysis / planning / writer / reader / revise 可以按环节切换

## 5. 状态目录设计

项目延续“文件系统即状态层”的思路，当前核心目录为：

```text
books/<bookId>/story/
  scenes/
  characters/
  themes/
  style/
  reviews/
    writer/
    revisions/
  human-gates/
  memory/
  planning/
  revisions/
books/<bookId>/story/writers-internal/
books/<bookId>/story/revisions/internal/
books/<bookId>/final/
```

这套结构的价值在于：

- 模块状态边界清楚
- 人类可以直接审阅中间状态
- heuristic 与 LLM 输出可以共存
- comparison / verification / traceability 可以独立落盘

## 6. 当前主流程

### `run`

`chapter text -> analysis -> review outputs -> history merge -> persist`

### `plan-next`

`history + memory -> chapter plan`

### `write-from-plan`

`chapter plan + history -> writer working`

### `writer-cycle`

`writer working -> analysis -> reader -> scene audit -> blocking gate -> review artifacts`

### `revise-cycle`

`writer working -> before analysis -> reader -> scene audit -> scene-level revise -> re-analysis -> re-reader -> comparison -> persist`

## 7. 已落地的关键能力

已经落地的核心能力包括：

- Reader Experience Critic
- Character Engine
- Scene Planner
- Theme Tracker
- Style Engine
- Human Review Gates
- Scene Auditor
- scene-level revise
- rewrite traceability
- rewrite effectiveness 第一版

## 8. 当前优势

- 独立项目结构简单，便于持续试验
- scene planning、writer、revise 已形成真实主链
- scene-level rewrite 已可追踪、可验证
- comparison 已开始区分事实层与解释层
- LLM 接入已打通，但不会破坏 deterministic 证据链

## 9. 当前边界

当前还不是成品级写作系统，主要边界包括：

- 默认仍以 heuristic 为主，不是默认全链路 LLM
- LLM prompt / schema 仍是第一版
- rewrite effectiveness 还在继续强化
- human gate 还没有形成完整协作工作流
- style local rewrite 还可以继续做细
- 更成熟的收益判断和 regression detection 仍未完成

## 10. 现在最适合看哪些文档

- 阶段状态：[项目阶段总览](/C:/Working/storylab-next/docs/project-stages.md)
- LLM 现状：[LLM 接入现状对照表](/C:/Working/storylab-next/docs/llm-adoption-matrix.md)
- 主链调用：[调用链说明](/C:/Working/storylab-next/docs/call-flows.md)
- revise 主链：[修订闭环](/C:/Working/storylab-next/docs/revision-loop.md)
- 当前主阶段：[改写有效性](/C:/Working/storylab-next/docs/rewrite-effectiveness.md)


