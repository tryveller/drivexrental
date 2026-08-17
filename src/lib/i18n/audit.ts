import { COPY } from "./keys";
import { LANG_CODES } from "./languages";

/**
 * Dev-only completeness check. A feature that ships copy in English only is a
 * bug for most of our riders, so we make it loud in the console immediately.
 */
export function auditCopy(): string[] {
  const gaps: string[] = [];
  for (const [key, entry] of Object.entries(COPY)) {
    for (const code of LANG_CODES) {
      const value = (entry as Record<string, string | undefined>)[code];
      if (!value || !value.trim()) gaps.push(`${key}.${code}`);
    }
  }
  return gaps;
}
