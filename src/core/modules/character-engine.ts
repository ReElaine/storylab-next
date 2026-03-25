import type { CharacterSeed, CharacterState } from "../types.js";

function extractDecision(text: string, name: string): string {
  if (!text.includes(name)) return "本章未直接行动";
  if (text.includes("决定")) return `${name}做出了带风险的明确选择`;
  if (text.includes("伸了手")) return `${name}选择主动触发未知力量`;
  return `${name}维持推进并暴露其当前策略`;
}

function extractCost(text: string, name: string): string {
  if (!text.includes(name)) return "暂无";
  if (text.includes("疼") || text.includes("烫")) return "身体代价已经显性出现";
  if (text.includes("发冷")) return "心理代价开始显性化";
  return "代价仍在累积";
}

function inferArcProgress(text: string, seed: CharacterSeed): string {
  if (!text.includes(seed.name)) return "本章无更新";
  if (text.includes("不敢承认") || text.includes("还是")) return "角色继续按照旧误判行动，但裂缝已经出现";
  return "角色弧线处于起步阶段";
}

function inferRelationshipShifts(text: string, seed: CharacterSeed): string[] {
  return seed.relationshipMap
    .filter((entry) => text.includes(seed.name) && text.includes(entry.target))
    .map((entry) => `${seed.name}与${entry.target}从${entry.status}向高压协作移动`);
}

export class CharacterEngine {
  update(chapterText: string, cast: ReadonlyArray<CharacterSeed>): ReadonlyArray<CharacterState> {
    return cast.map((seed) => {
      const present = chapterText.includes(seed.name);
      return {
        name: seed.name,
        desire: present ? seed.baselineDesire : "本章未触发",
        fear: present && chapterText.includes("失控") ? "失控并伤害他人" : seed.baselineFear,
        misbelief: seed.baselineMisbelief,
        recentDecision: extractDecision(chapterText, seed.name),
        decisionCost: extractCost(chapterText, seed.name),
        relationshipShift: inferRelationshipShifts(chapterText, seed),
        arcProgress: inferArcProgress(chapterText, seed),
        presentInChapter: present,
      };
    });
  }
}
