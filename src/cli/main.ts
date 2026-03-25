import { resolve } from "node:path";
import { StorylabRunner } from "../core/pipeline/storylab-runner.js";
import { createDemoWorkspace } from "../core/project/demo.js";

function printUsage(): void {
  process.stdout.write(
    [
      "Usage:",
      "  storylab-next init-demo <workspaceDir>",
      "  storylab-next run <workspaceDir> <bookId> <chapterNumber>",
      "  storylab-next plan-next <workspaceDir> <bookId> <targetChapterNumber>",
      "  storylab-next draft-from-plan <workspaceDir> <bookId> <targetChapterNumber>",
      "  storylab-next draft-cycle <workspaceDir> <bookId> <targetChapterNumber>",
      "",
    ].join("\n"),
  );
}

export async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (command === "init-demo") {
    const [workspaceDir] = rest;
    if (!workspaceDir) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const output = await createDemoWorkspace(resolve(workspaceDir));
    process.stdout.write(`Demo workspace created at ${output}\n`);
    return;
  }

  if (command === "run") {
    const [workspaceDir, bookId, chapterNumberRaw] = rest;
    if (!workspaceDir || !bookId || !chapterNumberRaw) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const chapterNumber = Number.parseInt(chapterNumberRaw, 10);
    if (Number.isNaN(chapterNumber)) {
      throw new Error(`Invalid chapter number: ${chapterNumberRaw}`);
    }

    const runner = new StorylabRunner(resolve(workspaceDir));
    const result = await runner.run(bookId, chapterNumber);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "plan-next") {
    const [workspaceDir, bookId, chapterNumberRaw] = rest;
    if (!workspaceDir || !bookId || !chapterNumberRaw) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const targetChapterNumber = Number.parseInt(chapterNumberRaw, 10);
    if (Number.isNaN(targetChapterNumber)) {
      throw new Error(`Invalid chapter number: ${chapterNumberRaw}`);
    }

    const runner = new StorylabRunner(resolve(workspaceDir));
    const result = await runner.planNext(bookId, targetChapterNumber);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "draft-from-plan") {
    const [workspaceDir, bookId, chapterNumberRaw] = rest;
    if (!workspaceDir || !bookId || !chapterNumberRaw) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const targetChapterNumber = Number.parseInt(chapterNumberRaw, 10);
    if (Number.isNaN(targetChapterNumber)) {
      throw new Error(`Invalid chapter number: ${chapterNumberRaw}`);
    }

    const runner = new StorylabRunner(resolve(workspaceDir));
    const result = await runner.draftFromPlan(bookId, targetChapterNumber);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "draft-cycle") {
    const [workspaceDir, bookId, chapterNumberRaw] = rest;
    if (!workspaceDir || !bookId || !chapterNumberRaw) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const targetChapterNumber = Number.parseInt(chapterNumberRaw, 10);
    if (Number.isNaN(targetChapterNumber)) {
      throw new Error(`Invalid chapter number: ${chapterNumberRaw}`);
    }

    const runner = new StorylabRunner(resolve(workspaceDir));
    const result = await runner.draftCycle(bookId, targetChapterNumber);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  printUsage();
  process.exitCode = 1;
}
