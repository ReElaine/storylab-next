import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BookRecord,
  ChapterDraft,
  ChapterPlan,
  CharacterHistory,
  CharacterSeed,
  HumanGate,
  StoryMemory,
  StyleGuide,
  ThemeHistory,
  ThemeSeed,
} from "../types.js";
import { toChapterSlug } from "../utils/text.js";

export class ProjectStore {
  constructor(private readonly workspaceRoot: string) {}

  bookDir(bookId: string): string {
    return join(this.workspaceRoot, "books", bookId);
  }

  storyDir(bookId: string): string {
    return join(this.bookDir(bookId), "story");
  }

  async loadBook(bookId: string): Promise<BookRecord> {
    return this.readJson<BookRecord>(join(this.bookDir(bookId), "book.json"));
  }

  async loadCharacterSeeds(bookId: string): Promise<ReadonlyArray<CharacterSeed>> {
    return this.readJson<ReadonlyArray<CharacterSeed>>(
      join(this.storyDir(bookId), "characters", "cast.json"),
    );
  }

  async loadThemeSeeds(bookId: string): Promise<ReadonlyArray<ThemeSeed>> {
    return this.readJson<ReadonlyArray<ThemeSeed>>(
      join(this.storyDir(bookId), "themes", "theme-manifest.json"),
    );
  }

  async loadStyleGuide(bookId: string): Promise<StyleGuide> {
    return this.readJson<StyleGuide>(join(this.storyDir(bookId), "style", "style-guide.json"));
  }

  async loadHumanGates(bookId: string): Promise<ReadonlyArray<HumanGate>> {
    return this.readJson<ReadonlyArray<HumanGate>>(
      join(this.storyDir(bookId), "human-gates", "gates.json"),
    );
  }

  async loadChapter(bookId: string, chapterNumber: number): Promise<string> {
    const chaptersDir = join(this.bookDir(bookId), "chapters");
    const prefix = String(chapterNumber).padStart(4, "0");
    const files = await readdir(chaptersDir);
    const match = files.find((file: string) => file.startsWith(prefix) && file.endsWith(".md"));
    if (!match) {
      throw new Error(`Chapter ${chapterNumber} not found for book ${bookId}`);
    }
    return readFile(join(chaptersDir, match), "utf-8");
  }

  async loadDraftContent(bookId: string, chapterNumber: number): Promise<string> {
    const draftsDir = join(this.bookDir(bookId), "drafts");
    const prefix = String(chapterNumber).padStart(4, "0");
    const files = await readdir(draftsDir);
    const match = files.find((file: string) => file.startsWith(prefix) && file.endsWith(".md"));
    if (!match) {
      throw new Error(`Draft ${chapterNumber} not found for book ${bookId}`);
    }

    const raw = await readFile(join(draftsDir, match), "utf-8");
    const lines = raw.split(/\r?\n/);
    const separatorIndex = lines.findIndex((line) => line.trim() === "---");
    const bodyLines = lines
      .slice(0, separatorIndex >= 0 ? separatorIndex : lines.length)
      .filter((line, index) => !(index === 0 && line.startsWith("# ")));

    return bodyLines.join("\n").trim();
  }

  async ensureStoryDirs(bookId: string): Promise<void> {
    const storyDir = this.storyDir(bookId);
    await Promise.all([
      mkdir(join(storyDir, "scenes"), { recursive: true }),
      mkdir(join(storyDir, "characters"), { recursive: true }),
      mkdir(join(storyDir, "themes"), { recursive: true }),
      mkdir(join(storyDir, "reviews"), { recursive: true }),
      mkdir(join(storyDir, "reviews", "drafts"), { recursive: true }),
      mkdir(join(storyDir, "style"), { recursive: true }),
      mkdir(join(storyDir, "human-gates"), { recursive: true }),
      mkdir(join(storyDir, "planning"), { recursive: true }),
      mkdir(join(storyDir, "memory"), { recursive: true }),
      mkdir(join(this.bookDir(bookId), "drafts"), { recursive: true }),
    ]);
  }

  async writeOutput(bookId: string, category: string, fileName: string, content: string): Promise<string> {
    const path = join(this.storyDir(bookId), category, fileName);
    await mkdir(join(this.storyDir(bookId), category), { recursive: true });
    await writeFile(path, content, "utf-8");
    return path;
  }

  chapterFileName(chapterNumber: number, suffix: string): string {
    return `${toChapterSlug(chapterNumber)}.${suffix}`;
  }

  async loadCharacterHistory(bookId: string): Promise<ReadonlyArray<CharacterHistory>> {
    return this.readJsonOrDefault(join(this.storyDir(bookId), "characters", "character-history.json"), []);
  }

  async loadThemeHistory(bookId: string): Promise<ThemeHistory> {
    return this.readJsonOrDefault(join(this.storyDir(bookId), "themes", "theme-history.json"), { timeline: [] });
  }

  async loadStoryMemory(bookId: string): Promise<StoryMemory> {
    return this.readJsonOrDefault(join(this.storyDir(bookId), "memory", "story-memory.json"), {
      lastAnalyzedChapter: 0,
      activeHooks: [],
      unresolvedRisks: [],
      readerTrajectory: {
        averageHookScore: 0,
        averageMomentumScore: 0,
        averageEmotionalPeakScore: 0,
      },
    });
  }

  async loadChapterPlan(bookId: string, chapterNumber: number): Promise<ChapterPlan | null> {
    return this.readJsonOrDefault<ChapterPlan | null>(
      join(this.storyDir(bookId), "planning", this.chapterFileName(chapterNumber, "chapter-plan.json")),
      null,
    );
  }

  async writeDraft(bookId: string, draft: ChapterDraft): Promise<string> {
    const draftsDir = join(this.bookDir(bookId), "drafts");
    await mkdir(draftsDir, { recursive: true });
    const fileName = `${String(draft.chapterNumber).padStart(4, "0")}_${this.sanitizeFileName(draft.title)}.md`;
    const path = join(draftsDir, fileName);
    const markdown = [
      `# 第${draft.chapterNumber}章 ${draft.title}`,
      "",
      draft.content,
      "",
      "---",
      `基于规划章节: ${draft.basedOnPlan}`,
      `摘要: ${draft.summary}`,
      "",
    ].join("\n");
    await writeFile(path, markdown, "utf-8");
    return path;
  }

  private async readJson<T>(path: string): Promise<T> {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  }

  private async readJsonOrDefault<T>(path: string, fallback: T): Promise<T> {
    try {
      return await this.readJson<T>(path);
    } catch {
      return fallback;
    }
  }

  private sanitizeFileName(input: string): string {
    return input.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_").slice(0, 50);
  }
}
