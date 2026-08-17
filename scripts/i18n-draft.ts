/**
 * Fills in missing languages for copy keys, using Lovable AI.
 *
 *   bun run i18n:draft
 *
 * It asks the model for how a native speaker would SAY each line to a
 * first-time bike renter, not for a literal translation, then writes the
 * result back into src/lib/i18n/keys.ts so the copy is versioned in code and
 * reviewable in the diff. Always read the printed table before committing.
 */
import { COPY } from "../src/lib/i18n/keys";
import { LANGUAGES, LANG_CODES, type Lang } from "../src/lib/i18n/languages";

const KEYS_FILE = "src/lib/i18n/keys.ts";
const apiKey = process.env["LOVABLE_API_KEY"];
if (!apiKey) throw new Error("LOVABLE_API_KEY is not set");

const rows = Object.entries(COPY) as [string, Record<string, string | undefined>][];
const todo = rows.filter(([, row]) => LANG_CODES.some((code) => !row[code]?.trim()));

if (!todo.length) {
  console.log("Nothing to draft — every key already has all languages.");
  process.exit(0);
}

const targets = LANGUAGES.filter((meta) => meta.code !== "en");

const guardrails = `You are writing UI copy for DriveX Rental, an Indian two-wheeler rental app used by first-time renters and gig-economy riders.

For each key below, write the line in these languages: ${targets.map((m) => `${m.code} = ${m.label}`).join(", ")}.

Rules:
- Do NOT translate word for word. Write how a native speaker would naturally SAY this to a first-time bike renter: everyday spoken register, never official or bureaucratic language.
- Keep it short. Buttons and labels stay to a few words; no line over ~140 characters.
- Keep these EXACTLY in English inside the sentence: DriveX, Google Maps, PIN, OTP, Driving Licence, address proof, plan names (Daily / Weekly / Monthly / Rent-to-own), vehicle model names, registration numbers and any ₹ amounts or digits.
- Native script only. No Latin transliteration.
- Prefer the common everyday word over a Sanskritised or formal one.

Return ONLY JSON: { "<key>": { ${targets.map((m) => `"${m.code}": "..."`).join(", ")} }, ... } covering every key.`;

const drafted: Record<string, Record<string, string>> = {};
const CHUNK = 12;

for (let i = 0; i < todo.length; i += CHUNK) {
  const chunk = todo.slice(i, i + CHUNK);
  const payload = Object.fromEntries(chunk.map(([key, row]) => [key, row.en]));
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: `${guardrails}\n\nCopy:\n${JSON.stringify(payload, null, 2)}` }],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    throw new Error(`AI gateway ${response.status}: ${await response.text()}`);
  }
  const body = (await response.json()) as { choices: { message: { content: string } }[] };
  Object.assign(drafted, JSON.parse(body.choices[0].message.content));
  console.log(`drafted ${Math.min(i + CHUNK, todo.length)}/${todo.length}`);
}

let source = await Bun.file(KEYS_FILE).text();

for (const [key, row] of todo) {
  const suggestion = drafted[key];
  if (!suggestion) {
    console.warn(`no draft returned for ${key}`);
    continue;
  }
  for (const code of LANG_CODES) {
    if (row[code]?.trim()) continue;
    const value = suggestion[code as Exclude<Lang, "en">];
    if (!value) continue;
    console.log(`${key}.${code}: ${value}`);
    const block = new RegExp(`(\\n  ${key}: \\{)`);
    source = source.replace(block, `$1\n    ${code === "or" ? '"or"' : code}: ${JSON.stringify(value)},`);
  }
}

await Bun.write(KEYS_FILE, source);
console.log(`\nWrote ${KEYS_FILE}. Review the diff, then run: bun run i18n:check`);
