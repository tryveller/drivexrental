/**
 * Fails if any copy key is missing a supported language, or if a protected
 * English term was translated away. Run before shipping a feature.
 *
 *   bun run i18n:check
 */
import { COPY } from "../src/lib/i18n/keys";
import { LANG_CODES } from "../src/lib/i18n/languages";

const PROTECTED = ["DriveX", "Google Maps", "PIN", "OTP"];

const gaps: string[] = [];
const lost: string[] = [];

for (const [key, entry] of Object.entries(COPY)) {
  const row = entry as Record<string, string | undefined>;
  for (const code of LANG_CODES) {
    const value = row[code];
    if (!value || !value.trim()) gaps.push(`${key}.${code}`);
  }
  for (const term of PROTECTED) {
    if (!row.en?.includes(term)) continue;
    for (const code of LANG_CODES) {
      if (row[code] && !row[code]!.includes(term)) lost.push(`${key}.${code} lost "${term}"`);
    }
  }
}

if (gaps.length) console.error(`Missing copy (${gaps.length}):\n  ${gaps.join("\n  ")}`);
if (lost.length) console.error(`Protected terms changed (${lost.length}):\n  ${lost.join("\n  ")}`);

if (gaps.length || lost.length) process.exit(1);
console.log(`i18n OK — ${Object.keys(COPY).length} keys x ${LANG_CODES.length} languages.`);
