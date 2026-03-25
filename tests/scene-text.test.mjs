import test from "node:test";
import assert from "node:assert/strict";

import { parseSceneDocument, replaceSceneUnits } from "../dist/core/utils/scene-text.js";

test("replaceSceneUnits preserves prelude, untouched scenes, and postlude", () => {
  const original = [
    "# Prelude",
    "",
    "引子段落保持不变。",
    "",
    "【场景 1 / POV：林烬】",
    "scene one body",
    "",
    "【场景 2 / POV：林烬】",
    "scene two body",
    "",
    "---",
    "ending note / summary / appendix-like tail",
  ].join("\n");

  const document = parseSceneDocument(original);
  const replaced = replaceSceneUnits(document, [
    {
      sceneNumber: 2,
      marker: "【场景 2 / POV：林烬】",
      content: ["【场景 2 / POV：林烬】", "scene two body revised"].join("\n"),
    },
  ]);

  const rewritten = parseSceneDocument(replaced);

  assert.equal(rewritten.prelude, document.prelude);
  assert.equal(rewritten.postlude, document.postlude);
  assert.equal(rewritten.scenes[0]?.content, document.scenes[0]?.content);
  assert.notEqual(rewritten.scenes[1]?.content, document.scenes[1]?.content);
  assert.match(rewritten.postlude, /ending note \/ summary \/ appendix-like tail/u);
});
