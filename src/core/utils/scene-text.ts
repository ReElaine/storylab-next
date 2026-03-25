export interface SceneTextUnit {
  readonly sceneNumber: number;
  readonly marker: string;
  readonly content: string;
}

export interface SceneDocument {
  readonly prelude: string;
  readonly scenes: ReadonlyArray<SceneTextUnit>;
  readonly postlude: string;
}

const SCENE_MARKER = /^【场景\s*(\d+)\s*\/\s*POV[:：][^\n】]+】/gmu;
const POSTLUDE_MARKER =
  /^(?:---+\s*$|基于规划章节[:：]?|摘要[:：]?|尾注[:：]?|后记[:：]?|附录[:：]?|summary[:：]?|ending note[:：]?|appendix(?:-like)? tail[:：]?|postlude[:：]?|note[:：]?)/imu;

function findPostludeIndex(sceneTail: string): number {
  const lines = sceneTail.split("\n");
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const nextOffset = offset + line.length + (index < lines.length - 1 ? 1 : 0);
    if (index > 0 && POSTLUDE_MARKER.test(line.trim())) {
      return offset;
    }
    offset = nextOffset;
  }

  return -1;
}

function parseSceneNumber(marker: string, fallback: number): number {
  const match = marker.match(/【场景\s*(\d+)/u);
  return Number.parseInt(match?.[1] ?? String(fallback), 10);
}

export function parseSceneDocument(content: string): SceneDocument {
  const matches = Array.from(content.matchAll(SCENE_MARKER));
  if (matches.length === 0) {
    return {
      prelude: content,
      scenes: [],
      postlude: "",
    };
  }

  const firstMarkerIndex = matches[0]?.index ?? 0;
  const prelude = content.slice(0, firstMarkerIndex);
  const scenes: SceneTextUnit[] = [];
  let postlude = "";

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const start = current?.index ?? 0;
    const end = next?.index ?? content.length;
    const rawSceneBlock = content.slice(start, end);
    const marker = current?.[0] ?? `【场景 ${index + 1} / POV：未明】`;

    if (index === matches.length - 1) {
      const postludeIndex = findPostludeIndex(rawSceneBlock);
      if (postludeIndex >= 0) {
        scenes.push({
          sceneNumber: parseSceneNumber(marker, index + 1),
          marker,
          content: rawSceneBlock.slice(0, postludeIndex),
        });
        postlude = rawSceneBlock.slice(postludeIndex);
        continue;
      }
    }

    scenes.push({
      sceneNumber: parseSceneNumber(marker, index + 1),
      marker,
      content: rawSceneBlock,
    });
  }

  return {
    prelude,
    scenes,
    postlude,
  };
}

function preserveTrailingWhitespace(original: string, rewritten: string): string {
  const trailingWhitespace = original.match(/\s*$/u)?.[0] ?? "";
  return `${rewritten.trimEnd()}${trailingWhitespace}`;
}

export function replaceSceneUnits(
  document: SceneDocument,
  replacements: ReadonlyArray<SceneTextUnit>,
): string {
  const replacementMap = new Map<number, SceneTextUnit>();
  for (const replacement of replacements) {
    replacementMap.set(replacement.sceneNumber, replacement);
  }

  const sceneBlocks = document.scenes.map((scene) => {
    const replacement = replacementMap.get(scene.sceneNumber);
    if (!replacement) {
      return scene.content;
    }
    return preserveTrailingWhitespace(scene.content, replacement.content);
  });

  return `${document.prelude}${sceneBlocks.join("")}${document.postlude}`;
}

export function shortenSceneExcerpt(content: string, maxLength = 180): string {
  const normalized = content.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}
