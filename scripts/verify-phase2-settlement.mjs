import { readFile } from "node:fs/promises";
import { SettlementAgent } from "../dist/core/modules/settlement-agent.js";
import { ProjectStore } from "../dist/core/project/project-store.js";

const workspaceRoot = "C:/Working/storylab-next/practice-workspace";
const bookId = "linfan-rebellion";
const chapterNumber = 1;

const store = new ProjectStore(workspaceRoot);
const settlementAgent = new SettlementAgent();

const finalPath = "C:/Working/storylab-next/practice-workspace/books/linfan-rebellion/final/0001_第1章工作稿.txt";
const rawFinal = await readFile(finalPath, "utf8");
const lines = rawFinal.split(/\r?\n/u);
const titleLine = lines[0] ?? "";
const title = titleLine.replace(/^#\s*第\d+章\s*/u, "").trim() || `第${chapterNumber}章工作稿`;
const dividerIndex = lines.findIndex((line) => line.trim() === "---");
const bodyLines = dividerIndex >= 0 ? lines.slice(2, dividerIndex) : lines.slice(2);
const content = bodyLines.join("\n").trim();

const analysisRaw = await readFile(
  "C:/Working/storylab-next/practice-workspace/books/linfan-rebellion/story/reviews/revisions/chapter-0001.revised-review.json",
  "utf8",
);
const analysisSource = JSON.parse(analysisRaw);
const analysis = {
  scenes: analysisSource.scenes,
  characterStates: analysisSource.characterStates,
  themeReport: analysisSource.themeReport,
  styleReport: analysisSource.styleReport,
  readerReport: analysisSource.readerReport,
  gateDecision: analysisSource.gateDecision,
  revisionBrief: "",
};

const plan = await store.loadChapterPlan(bookId, chapterNumber);
if (!plan) {
  throw new Error("Missing chapter 1 plan for practice-workspace");
}

const settlement = settlementAgent.settle({
  chapterNumber,
  draft: {
    chapterNumber,
    title,
    content,
    summary: "从既有最终正文补跑 settlement",
    basedOnPlan: chapterNumber,
  },
  plan,
  analysis,
  previousChronology: { events: [] },
  previousOpenLoops: { loops: [] },
});

await store.writeOutput(
  bookId,
  "settlement",
  store.chapterFileName(chapterNumber, "chapter-summary.json"),
  JSON.stringify(settlement.chapterSummary, null, 2),
);
await store.writeOutput(
  bookId,
  "settlement",
  store.chapterFileName(chapterNumber, "chapter-state-delta.json"),
  JSON.stringify(settlement.chapterStateDelta, null, 2),
);
await store.writeOutput(
  bookId,
  "plot",
  "chronology.json",
  JSON.stringify(settlement.chronology, null, 2),
);
await store.writeOutput(
  bookId,
  "plot",
  "open-loops.json",
  JSON.stringify(settlement.openLoops, null, 2),
);

console.log(JSON.stringify({
  chapterSummaryTitle: settlement.chapterSummary.title,
  chronologyEvents: settlement.chronology.events.length,
  openLoops: settlement.openLoops.loops.length,
  openedLoopIds: settlement.chapterSummary.openedLoopIds,
  advancedLoopIds: settlement.chapterSummary.advancedLoopIds,
}, null, 2));
