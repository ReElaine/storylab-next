import type { SceneAuditIssue, SceneAuditReport, SceneBlueprintItem, ScenePlanItem } from "../types.js";

function normalize(value: string): string {
  return value.trim();
}

function hasSignal(value: string): boolean {
  return normalize(value).length > 0 && !normalize(value).includes("待补充");
}

export class SceneAuditor {
  audit(
    planScenes: ReadonlyArray<SceneBlueprintItem>,
    actualScenes: ReadonlyArray<ScenePlanItem>,
  ): SceneAuditReport {
    const issues: SceneAuditIssue[] = [];

    if (actualScenes.length < planScenes.length) {
      issues.push({
        sceneNumber: actualScenes.length + 1,
        severity: "high",
        problem: "草稿没有覆盖全部计划场景",
        recommendation: "补写缺失场景，并明确其目标、冲突、转折和结果。",
      });
    }

    for (const planned of planScenes) {
      const actual = actualScenes.find((scene) => scene.sceneNumber === planned.sceneNumber);
      if (!actual) {
        continue;
      }

      if (!hasSignal(actual.goal)) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "high",
          problem: "场景目标失焦",
          recommendation: `让该场景明确服务于目标：${planned.goal}`,
        });
      }

      if (!hasSignal(actual.conflict)) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "high",
          problem: "场景冲突不足",
          recommendation: `补强阻力与对抗，让冲突对齐计划中的要求：${planned.conflict}`,
        });
      }

      if (!hasSignal(actual.turn)) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "medium",
          problem: "场景缺少转折",
          recommendation: `补出转折点，使本场景产生位移：${planned.turn}`,
        });
      }

      if (!hasSignal(actual.result)) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "medium",
          problem: "场景结果不清晰",
          recommendation: `明确场景结束后的新状态：${planned.result}`,
        });
      }

      const joined = actual.sourceParagraphs.join("\n");
      if (!joined.includes("决定") && !joined.includes("选择")) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "high",
          problem: "场景缺少明确决策",
          recommendation: `补出由 ${planned.drivingCharacter} 做出的关键决策：${planned.decision}`,
        });
      }

      if (!joined.includes("代价") && !joined.includes("后果")) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "high",
          problem: "决策没有兑现代价",
          recommendation: `让本场景明确体现代价：${planned.cost}`,
        });
      }

      if (!joined.includes(planned.valuePositionA) && !joined.includes(planned.valuePositionB)) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "medium",
          problem: "场景只有剧情推进，没有主题冲突",
          recommendation: `让价值对立“${planned.valuePositionA} / ${planned.valuePositionB}”通过行为或对话显形。`,
        });
      }

      if (planned.pov !== "未明" && actual.pov !== planned.pov) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "medium",
          problem: "POV 与计划不一致",
          recommendation: `将该场景 POV 收拢到 ${planned.pov}，避免视角漂移。`,
        });
      }

      const repeatedInfo = actual.newInformation.filter((info, index, source) => source.indexOf(info) !== index);
      if (repeatedInfo.length > 0) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "low",
          problem: "场景出现重复信息",
          recommendation: "去掉重复揭示，保留一次最有效的呈现。",
        });
      }
    }

    return {
      sceneCoverageOk: actualScenes.length >= planScenes.length,
      issues,
    };
  }
}
