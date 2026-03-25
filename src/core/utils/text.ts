export function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").trim();
}

export function splitParagraphs(input: string): string[] {
  return normalizeText(input)
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

export function average(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  return text.split(needle).length - 1;
}

export function toChapterSlug(chapterNumber: number): string {
  return `chapter-${String(chapterNumber).padStart(4, "0")}`;
}
