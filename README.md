# storylab-next

`storylab-next` 是一个独立的中文小说写作系统原型，重点不是堆模块，而是把“规划 -> writer -> analysis -> reader -> revise -> gate -> final prose”这条主链做实。

当前项目已经具备：

- 独立的 `writer / analysis / reader / revise` 多 agent 架构
- scene-level 可追踪改写
- 读者体验独立评分
- 自动循环修订，直到过线或停止
- 只有全部关键环节通过后，才导出最终正文 `.txt`

## 当前工作流

### 主链

1. `plan-next`
2. `write-from-plan`
3. `writer-cycle`
4. `revise-cycle`
5. `revise-until-pass`

### agent 分工

- `writer agent`
  负责根据章节计划、角色状态、主题轨迹和风格约束生成工作稿
- `analysis agent`
  负责结构化分析 scene / character / theme / style
- `reader agent`
  负责独立给出 `hook / momentum / emotionalPeak / suspense / memorability` 评分与修改建议
- `revise agent`
  负责 scene-level 局部改写

## 快速开始

```bash
npm install
npm run typecheck
npm run build
node dist/index.js init-demo ./demo-workspace
node dist/index.js run ./demo-workspace ember-fall 1
node dist/index.js plan-next ./demo-workspace ember-fall 2
node dist/index.js write-from-plan ./demo-workspace ember-fall 2
node dist/index.js writer-cycle ./demo-workspace ember-fall 2
node dist/index.js revise-cycle ./demo-workspace ember-fall 2 --override
node dist/index.js revise-until-pass ./demo-workspace ember-fall 2 --override --max-iterations 3
```

## LLM 配置

当前支持的 provider 环节：

- `STORYLAB_ANALYSIS_PROVIDER`
- `STORYLAB_READER_PROVIDER`
- `STORYLAB_PLANNER_PROVIDER`
- `STORYLAB_WRITER_PROVIDER`
- `STORYLAB_REVISE_PROVIDER`

统一 OpenAI 兼容配置示例：

```bash
STORYLAB_ANALYSIS_PROVIDER=openai
STORYLAB_READER_PROVIDER=openai
STORYLAB_PLANNER_PROVIDER=openai
STORYLAB_WRITER_PROVIDER=openai
STORYLAB_REVISE_PROVIDER=openai
STORYLAB_OPENAI_API_KEY=your_key
STORYLAB_OPENAI_MODEL=your_model
STORYLAB_OPENAI_BASE_URL=https://your-compatible-endpoint/v1
```

项目也支持读取本地配置文件：

- `config/llm.local.json`

## 输出规则

当前项目严格区分两类产物：

- 内部工作稿
  - 用于 analysis / reader / revise / comparison
  - 保留 scene marker
  - 落在 `books/<bookId>/story/writers-internal/`
  - 修订稿落在 `books/<bookId>/story/revisions/internal/`

- 最终正文
  - 面向读者
  - 不显示 `场景 / POV` 标签
  - 只在所有关键 gate 通过后导出
  - 落在 `books/<bookId>/final/*.txt`

如果修订后仍未过线，则：

- 不导出最终正文
- `finalProsePath = null`

## 当前及格线

`reader agent` 的 5 项分数都必须至少为 `6`：

- `hook >= 6`
- `momentum >= 6`
- `emotionalPeak >= 6`
- `suspense >= 6`
- `memorability >= 6`

同时还必须满足：

- `scene audit` 没有 `high severity` 问题

## 文档

- [项目阶段总览](./docs/project-stages.md)
- [详细设计](./docs/design.md)
- [调用链说明](./docs/call-flows.md)
- [使用说明](./docs/usage.md)
- [LLM 接入矩阵](./docs/llm-adoption-matrix.md)
- [修订闭环](./docs/revision-loop.md)
- [改写有效性](./docs/rewrite-effectiveness.md)
- [scene rewrite 验证](./docs/scene-rewrite-verification.md)
- [架构分析](./docs/architecture-analysis.md)
- [Chapter 2 修订示例](./docs/chapter-2-walkthrough.md)
