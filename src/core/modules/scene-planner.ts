import type { ScenePlanItem } from "../types.js";
import { splitParagraphs } from "../utils/text.js";

function inferPov(paragraphs: ReadonlyArray<string>): string {
  const joined = paragraphs.join("\n");
  if (joined.includes("林炽")) return "林炽";
  if (joined.includes("沈砚")) return "沈砚";
  return "未明";
}

function inferGoal(text: string): string {
  if (text.includes("想")) return "主角主动追索某个答案";
  if (text.includes("决定")) return "主角在压力下做出选择";
  return "推进当前悬念";
}

function inferConflict(text: string): string {
  if (text.includes("代价") || text.includes("失控")) return "目标与代价正面冲撞";
  if (text.includes("不")) return "角色意图受到阻力";
  return "信息不足制造阻力";
}

function inferTurn(text: string): string {
  if (text.includes("却") || text.includes("但是") || text.includes("可")) return "场景中段出现逆转";
  return "场景以内压推进，没有明显反转";
}

function inferResult(text: string): string {
  if (text.includes("开始") || text.includes("钻进")) return "场景结束时状态不可逆地改变";
  return "场景结束时获得有限推进";
}

function extractNewInformation(text: string): string[] {
  const facts: string[] = [];
  if (text.includes("母亲")) facts.push("章节把主角行动与母亲遗留问题绑定");
  if (text.includes("火")) facts.push("出现具备主动性的火种或超自然媒介");
  if (text.includes("门")) facts.push("门被塑造成关键入口意象");
  return facts;
}

function inferEmotion(text: string): string {
  if (text.includes("发冷") || text.includes("疼")) return "好奇 -> 疼痛与寒意";
  if (text.includes("心里一沉")) return "试探 -> 不安";
  return "紧张逐步上升";
}

export class ScenePlanner {
  plan(chapterText: string): ReadonlyArray<ScenePlanItem> {
    const paragraphs = splitParagraphs(chapterText).filter((entry) => !entry.startsWith("#"));
    const scenes: ScenePlanItem[] = [];

    for (let index = 0; index < paragraphs.length; index += 3) {
      const chunk = paragraphs.slice(index, index + 3);
      const joined = chunk.join("\n");
      scenes.push({
        sceneNumber: scenes.length + 1,
        pov: inferPov(chunk),
        goal: inferGoal(joined),
        conflict: inferConflict(joined),
        turn: inferTurn(joined),
        result: inferResult(joined),
        newInformation: extractNewInformation(joined),
        emotionalShift: inferEmotion(joined),
        sourceParagraphs: chunk,
      });
    }

    return scenes;
  }
}
