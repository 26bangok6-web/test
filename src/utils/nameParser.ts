/**
 * Utility for parsing and normalizing Korean staff/teacher names with optional departments.
 * E.g., "홍길동 (교무부)" -> normalized: "홍길동"
 */

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .replace(/\(.*?\)/g, '')   // Remove round parentheses content: (교무부)
    .replace(/\[.*?\]/g, '')   // Remove square brackets content: [1학년부]
    .replace(/<.*?>/g, '')     // Remove angle brackets
    .replace(/\{.*?\}/g, '')   // Remove curly brackets
    .replace(/[0-9]/g, '')     // Remove trailing numbers if any
    .replace(/\s+/g, '')       // Remove all internal and outer whitespace
    .trim();
}

export function parseRosterInput(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Split by newlines, commas, semicolons, or tabs
  const items = rawText
    .split(/[\r\n,;\t]+/)
    .map(line => {
      // Remove leading bullet characters or numbering like "1. ", "- ", "* "
      return line.replace(/^[\s\d.\-*•#]+\s*/, '').trim();
    })
    .filter(line => line.length > 0);

  // Deduplicate while preserving original order
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }

  return result;
}

export function searchRoster(query: string, roster: string[]): string[] {
  if (!query || !query.trim()) return roster.slice(0, 10);
  const qClean = query.trim().toLowerCase();
  const qNorm = normalizeName(query).toLowerCase();

  return roster.filter(name => {
    const rawLower = name.toLowerCase();
    const norm = normalizeName(name).toLowerCase();
    return rawLower.includes(qClean) || norm.includes(qNorm) || (qNorm.length > 0 && norm.includes(qNorm));
  });
}
