import test from "node:test";
import assert from "node:assert/strict";

import { SceneAuditor } from "../dist/core/modules/scene-auditor.js";

test("scene auditor uses full scene text instead of partial analysis excerpts", () => {
  const auditor = new SceneAuditor();

  const planScenes = [
    {
      sceneId: "scene-1",
      sceneAnchor: "scene-1-林凡",
      sceneNumber: 1,
      pov: "林凡",
      goal: "建立不公",
      conflict: "赵执事按资质压人",
      turn: "林凡发现灵石也保不住",
      result: "压抑建立",
      newInformation: [],
      emotionalShift: "压抑 -> 发闷",
      drivingCharacter: "林凡",
      opposingForce: "赵执事",
      decision: "林凡先忍住，盯住自己的灵石",
      cost: "继续忍让会让所有人默认他可以被随意践踏",
      relationshipChange: "与赵执事从服从转成对峙",
      thematicTension: "忍耐求生 vs 反抗夺路",
      valuePositionA: "忍耐求生",
      valuePositionB: "反抗夺路",
      sceneStance: "先压向忍耐",
      styleDirective: "动作和对话推进压迫感",
    },
    {
      sceneId: "scene-2",
      sceneAnchor: "scene-2-林凡",
      sceneNumber: 2,
      pov: "林凡",
      goal: "把冲突推进到公开抢夺",
      conflict: "陈师兄当众抢走灵石",
      turn: "林凡意识到再忍就抬不起头",
      result: "反抗从念头变成选择",
      newInformation: [],
      emotionalShift: "发闷 -> 怒意上冲",
      drivingCharacter: "林凡",
      opposingForce: "陈师兄",
      decision: "林凡决定当众把灵石夺回来",
      cost: "只要反抗，就会被赵执事和陈师兄记成眼中钉",
      relationshipChange: "与陈师兄公开撕破脸",
      thematicTension: "弱者想要改变命运，必须付出代价",
      valuePositionA: "忍下羞辱换暂时安稳",
      valuePositionB: "顶回去并接受后果",
      sceneStance: "把读者推到必须选边的节点",
      styleDirective: "对白要带羞辱性和地位差",
    },
  ];

  const actualScenes = [
    {
      sceneId: "scene-1",
      sceneAnchor: "scene-1-林凡",
      sceneNumber: 1,
      pov: "林凡",
      goal: "建立不公",
      conflict: "赵执事按资质压人",
      turn: "林凡发现灵石也保不住",
      result: "压抑建立",
      newInformation: [],
      emotionalShift: "压抑 -> 发闷",
      sourceParagraphs: ["林凡先忍住，没有当场发作。"],
    },
    {
      sceneId: "scene-2",
      sceneAnchor: "scene-2-林凡",
      sceneNumber: 2,
      pov: "林凡",
      goal: "把冲突推进到公开抢夺",
      conflict: "陈师兄当众抢走灵石",
      turn: "林凡意识到再忍就抬不起头",
      result: "反抗从念头变成选择",
      newInformation: [],
      emotionalShift: "发闷 -> 怒意上冲",
      // Intentionally incomplete excerpts to mimic LLM analysis summaries.
      sourceParagraphs: ["陈师兄抢走灵石，林凡盯着他的手。"],
    },
  ];

  const chapterText = [
    "【场景 1 / POV：林凡】",
    "林凡先忍住，没有当场发作。他知道继续忍让，会让所有人默认他可以被随意践踏。",
    "",
    "【场景 2 / POV：林凡】",
    "陈师兄抢走灵石，林凡盯着他的手。",
    "他没有再低头，而是当众把灵石夺了回来。",
    "赵执事冷笑着记下这一幕。林凡很清楚，只要反抗，自己立刻就会变成眼中钉。",
    "这是他第一次真正用反抗夺路，而不是继续忍下羞辱。",
  ].join("\n");

  const report = auditor.audit(planScenes, actualScenes, chapterText);

  const scene2Problems = report.issues.filter((issue) => issue.sceneNumber === 2).map((issue) => issue.problem);
  assert.equal(scene2Problems.includes("场景缺少明确决策"), false);
  assert.equal(scene2Problems.includes("决策没有兑现代价"), false);
  assert.equal(scene2Problems.includes("场景只有剧情推进，没有主题冲突"), false);
});
