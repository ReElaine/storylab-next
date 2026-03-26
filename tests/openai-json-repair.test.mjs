import test from "node:test";
import assert from "node:assert/strict";

import { parseJsonObjectWithRepair } from "../dist/core/llm/openai-shared.js";

test("parseJsonObjectWithRepair handles fenced JSON with trailing commas", () => {
  const raw = [
    "```json",
    "{",
    '  "foo": 1,',
    '  "bar": ["x", "y",],',
    "}",
    "```",
  ].join("\n");

  const parsed = parseJsonObjectWithRepair(raw);
  assert.deepEqual(parsed, { foo: 1, bar: ["x", "y"] });
});

test("parseJsonObjectWithRepair repairs a missing comma between properties", () => {
  const raw = [
    "{",
    '  "foo": "ok"',
    '  "bar": {',
    '    "baz": 2',
    "  }",
    "}",
  ].join("\n");

  const parsed = parseJsonObjectWithRepair(raw);
  assert.deepEqual(parsed, { foo: "ok", bar: { baz: 2 } });
});
