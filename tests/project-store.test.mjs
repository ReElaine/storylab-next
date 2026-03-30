import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ProjectStore } from "../dist/core/project/project-store.js";

test("project store can load canonical state before a target chapter", async () => {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "storylab-store-"));
  try {
    const bookId = "test-book";
    const storyDir = join(workspaceRoot, "books", bookId, "story");
    await Promise.all([
      mkdir(join(storyDir, "plot"), { recursive: true }),
      mkdir(join(storyDir, "characters"), { recursive: true }),
      mkdir(join(storyDir, "settlement"), { recursive: true }),
    ]);

    await Promise.all([
      writeFile(
        join(storyDir, "plot", "chronology.json"),
        JSON.stringify({
          events: [
            { eventId: "ch1", chapterNumber: 1, sceneNumber: 1, actors: ["林凡"], summary: "第一章事件", consequence: "第一章后果" },
            { eventId: "ch2", chapterNumber: 2, sceneNumber: 1, actors: ["林凡"], summary: "第二章事件", consequence: "第二章后果" },
            { eventId: "ch3", chapterNumber: 3, sceneNumber: 1, actors: ["林凡"], summary: "第三章事件", consequence: "第三章后果" },
          ],
        }, null, 2),
        "utf-8",
      ),
      writeFile(
        join(storyDir, "plot", "open-loops.json"),
        JSON.stringify({
          loops: [
            {
              loopId: "loop-1",
              type: "threat",
              introducedInChapter: 1,
              owner: "赵执事",
              description: "赵执事断供威胁",
              expectedPayoffWindow: "soon",
              urgency: "high",
              status: "closed",
              payoffConstraints: [],
              relatedEntities: ["林凡", "赵执事"],
              evidenceRefs: ["scene-1"],
              lastUpdatedChapter: 3,
            },
            {
              loopId: "loop-2",
              type: "mystery",
              introducedInChapter: 3,
              owner: "林凡",
              description: "第三章才出现的新谜题",
              expectedPayoffWindow: "mid",
              urgency: "medium",
              status: "open",
              payoffConstraints: [],
              relatedEntities: ["林凡"],
              evidenceRefs: ["scene-1"],
              lastUpdatedChapter: 3,
            },
          ],
        }, null, 2),
        "utf-8",
      ),
      writeFile(
        join(storyDir, "plot", "reveals-ledger.json"),
        JSON.stringify({
          entries: [
            {
              revealId: "reveal-1",
              chapterNumber: 2,
              sceneNumber: 1,
              sourceLoopId: "loop-1",
              category: "promise",
              subject: "断供方式",
              revealedTruth: "赵执事先断供再逼去深井",
              revealStrength: "partial",
              knownByReader: true,
              knownByCharacters: ["林凡"],
              evidenceRefs: ["scene-1"],
            },
            {
              revealId: "reveal-2",
              chapterNumber: 3,
              sceneNumber: 1,
              sourceLoopId: "loop-2",
              category: "mystery",
              subject: "第三章新真相",
              revealedTruth: "第三章才知道的内容",
              revealStrength: "explicit",
              knownByReader: true,
              knownByCharacters: ["林凡"],
              evidenceRefs: ["scene-1"],
            },
          ],
        }, null, 2),
        "utf-8",
      ),
      writeFile(
        join(storyDir, "characters", "relationship-ledger.json"),
        JSON.stringify({
          entries: [
            {
              relationshipId: "linfan::zhao",
              characters: ["林凡", "赵执事"],
              status: "公开对立",
              polarity: "hostile",
              tension: "high",
              lastChange: "林凡与赵执事公开对立",
              lastUpdatedChapter: 2,
              evidenceRefs: ["scene-1"],
            },
            {
              relationshipId: "linfan::chen",
              characters: ["林凡", "陈师兄"],
              status: "第三章才恶化",
              polarity: "hostile",
              tension: "medium",
              lastChange: "第三章新增冲突",
              lastUpdatedChapter: 3,
              evidenceRefs: ["scene-1"],
            },
          ],
        }, null, 2),
        "utf-8",
      ),
      writeFile(
        join(storyDir, "settlement", "chapter-0001.chapter-summary.json"),
        JSON.stringify({ chapterNumber: 1, title: "第一章", summary: "第一章摘要", keyEvents: [], changedCharacters: [], openedLoopIds: [], advancedLoopIds: [], closedLoopIds: [] }, null, 2),
        "utf-8",
      ),
      writeFile(
        join(storyDir, "settlement", "chapter-0002.chapter-summary.json"),
        JSON.stringify({ chapterNumber: 2, title: "第二章", summary: "第二章摘要", keyEvents: [], changedCharacters: [], openedLoopIds: [], advancedLoopIds: [], closedLoopIds: [] }, null, 2),
        "utf-8",
      ),
      writeFile(
        join(storyDir, "settlement", "chapter-0003.chapter-summary.json"),
        JSON.stringify({ chapterNumber: 3, title: "第三章", summary: "第三章摘要", keyEvents: [], changedCharacters: [], openedLoopIds: [], advancedLoopIds: [], closedLoopIds: [] }, null, 2),
        "utf-8",
      ),
    ]);

    const store = new ProjectStore(workspaceRoot);
    const [chronology, openLoops, reveals, relationships, summaries] = await Promise.all([
      store.loadChronologyBeforeChapter(bookId, 3),
      store.loadOpenLoopsBeforeChapter(bookId, 3),
      store.loadRevealsBeforeChapter(bookId, 3),
      store.loadRelationshipsBeforeChapter(bookId, 3),
      store.loadRecentChapterSummariesBeforeChapter(bookId, 3, 5),
    ]);

    assert.deepEqual(chronology.events.map((event) => event.chapterNumber), [1, 2]);
    assert.deepEqual(reveals.entries.map((entry) => entry.chapterNumber), [2]);
    assert.deepEqual(relationships.entries.map((entry) => entry.lastUpdatedChapter), [2]);
    assert.deepEqual(summaries.map((entry) => entry.chapterNumber), [1, 2]);
    assert.equal(openLoops.loops.length, 1);
    assert.equal(openLoops.loops[0].loopId, "loop-1");
    assert.equal(openLoops.loops[0].status, "open");
    assert.equal(openLoops.loops[0].lastUpdatedChapter, 2);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
