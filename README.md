# storylab-next

`storylab-next` 是一个独立的小说写作增强架构项目。

它会参考 Inkos 这类系统中已经被证明有效的方法，例如文件系统状态、分层 pipeline、章节级持久化和模块化 agent 思路，但不会依附原项目，也不复用原仓库的包结构与运行方式。这个项目的目标不是“在旧系统上补功能”，而是重构出一套更适合高质量小说生产的新架构。

## 项目定位

- 独立项目
- 中文优先
- 架构先行
- 质量导向

当前版本已经具备：

- 单章增强分析
- 跨章累计状态
- 下一章规划
- 基于规划生成草稿
- 草稿生成后的评审闭环
- 可切换的 analysis / planner / draft 引擎

## 独立性原则

本项目保持独立：

- 不依赖 `@actalk/inkos-core`
- 不嵌入原仓库
- 不沿用原 monorepo workspace 包组织
- 不把新增能力作为原项目附属模块挂回去

可以借鉴的是架构方法，不是依附关系。

## 当前能力

当前原型已经实现：

- `Reader Experience Critic`
- `Character Engine`
- `Scene Planner`
- `Theme Tracker`
- `Style Engine`
- `Human Review Gates`
- `story-memory`
- `plan-next`
- `draft-from-plan`
- `draft-cycle`
- 可切换的 `analysis / planning / draft generation engine`

## 快速开始

```bash
npm install
npm run typecheck
npm run build
node dist/index.js init-demo ./demo-workspace
node dist/index.js run ./demo-workspace ember-fall 1
node dist/index.js plan-next ./demo-workspace ember-fall 2
node dist/index.js draft-from-plan ./demo-workspace ember-fall 2
node dist/index.js draft-cycle ./demo-workspace ember-fall 2
```

## 输出目录

运行后会生成：

- `books/<bookId>/story/scenes/`
- `books/<bookId>/story/characters/`
- `books/<bookId>/story/themes/`
- `books/<bookId>/story/reviews/`
- `books/<bookId>/story/reviews/drafts/`
- `books/<bookId>/story/style/`
- `books/<bookId>/story/human-gates/`
- `books/<bookId>/story/memory/`
- `books/<bookId>/story/planning/`
- `books/<bookId>/drafts/`

## 草稿生成引擎

当前支持三类可切换引擎：

- `STORYLAB_ANALYSIS_PROVIDER`
- `STORYLAB_PLANNER_PROVIDER`
- `STORYLAB_DRAFT_PROVIDER`

可选值：

- `heuristic`
- `openai`

默认使用 `heuristic`。如果要切换到 OpenAI-compatible LLM，可以配置环境变量：

```bash
STORYLAB_ANALYSIS_PROVIDER=openai
STORYLAB_PLANNER_PROVIDER=openai
STORYLAB_DRAFT_PROVIDER=openai

STORYLAB_OPENAI_API_KEY=your_key
STORYLAB_OPENAI_MODEL=your_model

# 也可以分别单独配置：
# STORYLAB_ANALYSIS_OPENAI_API_KEY=your_key
# STORYLAB_ANALYSIS_OPENAI_MODEL=your_model
# STORYLAB_PLANNER_OPENAI_API_KEY=your_key
# STORYLAB_PLANNER_OPENAI_MODEL=your_model
# STORYLAB_DRAFT_OPENAI_API_KEY=your_key
# STORYLAB_DRAFT_OPENAI_MODEL=your_model

# 可选
STORYLAB_OPENAI_BASE_URL=https://your-compatible-endpoint/v1
```

如果只想先切换其中一个环节，例如只让 `plan-next` 用 LLM，也可以只设置该环节的 provider 和对应 model 配置。

## 当前阶段

当前版本仍然属于独立新架构的前几阶段：

1. 单章增强分析闭环
2. 跨章累计状态与下一章规划
3. 基于规划生成草稿
4. `plan -> draft -> review` 第一版闭环

后续会继续推进到：

5. 更高质量的正文生成主链
6. 更强的 planner / critic LLM 化
7. 真正可阻断流程的人类 Gate
8. 完整的 revision loop

## 文档

- [架构分析](./docs/architecture-analysis.md)
- [详细设计](./docs/design.md)
- [使用说明](./docs/usage.md)
- [路线图](./docs/roadmap.md)
- [阶段进展评审包](./docs/progress-review.md)
