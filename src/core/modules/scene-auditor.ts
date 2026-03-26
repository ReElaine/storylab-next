import type { SceneAuditIssue, SceneAuditReport, SceneBlueprintItem, ScenePlanItem } from "../types.js";
import { parseSceneDocument } from "../utils/scene-text.js";

function normalize(value: string): string {
  return value.trim();
}

function hasSignal(value: string): boolean {
  return normalize(value).length > 0 && !normalize(value).includes("待补充");
}

function buildSceneTextMap(chapterText: string): ReadonlyMap<number, string> {
  const parsed = parseSceneDocument(chapterText);
  return new Map(parsed.scenes.map((scene) => [scene.sceneNumber, scene.content]));
}

function extractSemanticHints(value: string): ReadonlyArray<string> {
  return value
    .split(/[，。、“”‘’：:；;（）()、\/\s-]+/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length >= 2 && entry !== "必须" && entry !== "场景" && entry !== "角色");
}

function hasPlannedSignal(text: string, ...plannedValues: ReadonlyArray<string>): boolean {
  return plannedValues.some((value) => {
    if (!value.trim()) {
      return false;
    }

    if (text.includes(value.trim())) {
      return true;
    }

    const hints = extractSemanticHints(value);
    return hints.some((hint) => text.includes(hint));
  });
}

export class SceneAuditor {
  audit(
    planScenes: ReadonlyArray<SceneBlueprintItem>,
    actualScenes: ReadonlyArray<ScenePlanItem>,
    chapterText = "",
  ): SceneAuditReport {
    const issues: SceneAuditIssue[] = [];
    const sceneTextMap = chapterText.trim().length > 0 ? buildSceneTextMap(chapterText) : new Map<number, string>();

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
          recommendation: `补强阻力与对抗，让冲突对齐计划要求：${planned.conflict}`,
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
      const fullSceneText = sceneTextMap.get(planned.sceneNumber) ?? joined;

      const hasDecisionSignal =
        /决定|选择|反击|反抗|夺回|出手|动手|顶回|抢回|不再解释|接招|迎上去|忍住|领受|伸出手|攥紧|盖住|没退/u.test(fullSceneText) ||
        hasPlannedSignal(fullSceneText, planned.decision, planned.goal, planned.turn);
      if (!hasDecisionSignal) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "high",
          problem: "场景缺少明确决策",
          recommendation: `补出由 ${planned.drivingCharacter} 做出的关键决策：${planned.decision}`,
        });
      }

      const hasCostSignal =
        /代价|后果|记恨|断供|危险|打压|眼中钉|结怨|没退路|付出|反噬|盯上|收回|罪名|克扣|默认|践踏/u.test(fullSceneText) ||
        hasPlannedSignal(fullSceneText, planned.cost, planned.result, planned.relationshipChange);
      if (!hasCostSignal) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "high",
          problem: "决策没有兑现代价",
          recommendation: `让本场景明确体现代价：${planned.cost}`,
        });
      }

      const hasThemeSignal =
        hasPlannedSignal(
          fullSceneText,
          planned.thematicTension,
          planned.valuePositionA,
          planned.valuePositionB,
          planned.sceneStance,
        ) || /忍耐|反抗|代价|命运|活路|后果|价值|规则/u.test(fullSceneText);
      if (!hasThemeSignal) {
        issues.push({
          sceneNumber: planned.sceneNumber,
          severity: "medium",
          problem: "场景只有剧情推进，没有主题冲突",
          recommendation: `让价值对立“${planned.valuePositionA} / ${planned.valuePositionB}”通过行为或对白显形。`,
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
          recommendation: "去掉重复揭示，只保留一次最有效的呈现。",
        });
      }
    }

    return {
      sceneCoverageOk: actualScenes.length >= planScenes.length,
      issues,
    };
  }
}
