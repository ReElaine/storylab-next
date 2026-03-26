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
      "  storylab-next write-from-plan <workspaceDir> <bookId> <targetChapterNumber>",
      "  storylab-next writer-cycle <workspaceDir> <bookId> <targetChapterNumber> [--override]",
      "  storylab-next revise-until-pass <workspaceDir> <bookId> <targetChapterNumber> [--override] [--max-iterations N]",
      "  storylab-next revise-cycle <workspaceDir> <bookId> <targetChapterNumber> [--override]",
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

  if (command === "draft-from-plan" || command === "write-from-plan") {
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
    const result = await runner.writeFromPlan(bookId, targetChapterNumber);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "draft-cycle" || command === "writer-cycle") {
    const [workspaceDir, bookId, chapterNumberRaw, ...flags] = rest;
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
    const result = await runner.writerCycle(bookId, targetChapterNumber, flags.includes("--override"));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "revise-cycle") {
    const [workspaceDir, bookId, chapterNumberRaw, ...flags] = rest;
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
    const result = await runner.reviseCycle(bookId, targetChapterNumber, flags.includes("--override"));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "revise-until-pass") {
    const [workspaceDir, bookId, chapterNumberRaw, ...flags] = rest;
    if (!workspaceDir || !bookId || !chapterNumberRaw) {
      printUsage();
      process.exitCode = 1;
      return;
    }

    const targetChapterNumber = Number.parseInt(chapterNumberRaw, 10);
    if (Number.isNaN(targetChapterNumber)) {
      throw new Error(`Invalid chapter number: ${chapterNumberRaw}`);
    }

    const maxIndex = flags.findIndex((flag) => flag === "--max-iterations");
    const maxIterations = maxIndex >= 0
      ? Number.parseInt(flags[maxIndex + 1] ?? "3", 10)
      : 3;

    const runner = new StorylabRunner(resolve(workspaceDir));
    const result = await runner.reviseUntilPass(bookId, targetChapterNumber, {
      override: flags.includes("--override"),
      maxIterations: Number.isNaN(maxIterations) ? 3 : maxIterations,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  printUsage();
  process.exitCode = 1;
}
