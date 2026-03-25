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

const SCENE_MARKER = /【场景\s*(\d+)\s*\/\s*POV[:：][^】]*】/g;

export function parseSceneDocument(content: string): SceneDocument {
  const matches = Array.from(content.matchAll(SCENE_MARKER));
  if (matches.length === 0) {
    return {
      prelude: content.trim(),
      scenes: [],
      postlude: "",
    };
  }

  const prelude = content.slice(0, matches[0]?.index ?? 0).trim();
  const scenes: SceneTextUnit[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const start = current?.index ?? 0;
    const end = next?.index ?? content.length;
    const raw = content.slice(start, end).trim();
    const marker = current?.[0] ?? `【场景 ${index + 1} / POV：未明】`;
    const sceneNumber = Number.parseInt(current?.[1] ?? String(index + 1), 10);
    scenes.push({
      sceneNumber,
      marker,
      content: raw,
    });
  }

  return {
    prelude,
    scenes,
    postlude: "",
  };
}

export function replaceSceneUnits(
  document: SceneDocument,
  replacements: ReadonlyArray<SceneTextUnit>,
): string {
  const replacementMap = new Map<number, SceneTextUnit>();
  for (const replacement of replacements) {
    replacementMap.set(replacement.sceneNumber, replacement);
  }

  const sceneBlocks = document.scenes.map((scene) => replacementMap.get(scene.sceneNumber)?.content ?? scene.content);
  return [document.prelude, ...sceneBlocks, document.postlude]
    .filter((entry) => entry.trim().length > 0)
    .join("\n\n")
    .trim();
}

export function shortenSceneExcerpt(content: string, maxLength = 180): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}
