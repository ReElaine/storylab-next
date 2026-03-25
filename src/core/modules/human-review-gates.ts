import type { GateDecision, HumanGate } from "../types.js";

export class HumanReviewGatekeeper {
  decide(chapterNumber: number, gates: ReadonlyArray<HumanGate>): GateDecision {
    const exact = gates.find((gate) => gate.triggerChapter === chapterNumber) ?? null;
    if (exact) {
      return {
        chapterNumber,
        gate: exact,
        required: true,
        rationale: `章节达到人工检查点：${exact.label}`,
      };
    }

    const nextGate = gates.find((gate) => gate.triggerChapter > chapterNumber) ?? null;
    return {
      chapterNumber,
      gate: nextGate,
      required: false,
      rationale: nextGate
        ? `下一个人工介入点在第 ${nextGate.triggerChapter} 章：${nextGate.label}`
        : "当前已越过全部预设人工检查点",
    };
  }
}
