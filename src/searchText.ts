const ABBREV: Record<string, string> = {
  st: 'street',
  str: 'street',
  ave: 'avenue',
  av: 'avenue',
  blvd: 'boulevard',
  rd: 'road',
  dr: 'drive',
  ln: 'lane',
  ct: 'court',
  pl: 'place',
  sq: 'square',
  nyc: 'new york',
  ny: 'new york',
};

export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchTokens(text: string): string[] {
  return normalizeSearchText(text)
    .split(' ')
    .filter((t) => t.length > 1 || /^\d+$/.test(t));
}

function expandAbbreviations(text: string): string {
  let out = normalizeSearchText(text);
  for (const [abbr, full] of Object.entries(ABBREV)) {
    out = out.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function matchesSearchQuery(haystack: string, query: string): boolean {
  const tokens = searchTokens(query);
  if (!tokens.length) return false;
  const normalized = normalizeSearchText(haystack);
  return tokens.every((token) => normalized.includes(token));
}

export function relevanceScore(name: string, addr: string, query: string): number {
  const q = normalizeSearchText(query);
  const qTokens = searchTokens(query);
  if (!q || !qTokens.length) return 0;

  const nameNorm = normalizeSearchText(name);
  const addrNorm = normalizeSearchText(addr ?? '');
  const combined = `${nameNorm} ${addrNorm}`.trim();

  let score = 0;

  if (nameNorm === q) score += 250;
  else if (nameNorm.startsWith(q)) score += 180;
  else if (nameNorm.includes(q)) score += 120;

  if (combined.includes(q)) score += 60;

  const matchedTokens = qTokens.filter((t) => combined.includes(t));
  if (matchedTokens.length === qTokens.length) {
    score += 100 + qTokens.length * 15;
    if (nameNorm.startsWith(qTokens[0])) score += 30;
  } else {
    score += matchedTokens.length * 25;
  }

  return score;
}

export function buildSearchQueries(raw: string, field: 'name' | 'addr'): string[] {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return [];

  const normalized = normalizeSearchText(trimmed);
  const expanded = expandAbbreviations(trimmed);
  const variants = new Set<string>([trimmed, normalized, expanded]);

  variants.add(normalized.replace(/\band\b/g, ' ').replace(/\s+/g, ' ').trim());
  variants.add(normalized.replace(/\band\b/g, '&').replace(/\s+/g, ' ').trim());

  if (field === 'addr') {
    const hasCity =
      /\b(new york|toronto|montreal|tokyo|kyoto|manhattan|brooklyn|queens)\b/.test(normalized);
    if (!hasCity) {
      for (const city of ['new york', 'toronto', 'montreal', 'tokyo', 'kyoto']) {
        variants.add(`${expanded} ${city}`.trim());
        variants.add(`${normalized} ${city}`.trim());
      }
    }
  }

  if (field === 'name') {
    const hasCity = /\b(new york|nyc|toronto|montreal|tokyo|kyoto|manhattan|brooklyn|queens)\b/.test(
      expanded,
    );
    if (!hasCity) {
      for (const city of ['new york', 'nyc', 'toronto', 'montreal', 'tokyo', 'kyoto']) {
        variants.add(`${normalized} ${city}`.trim());
      }
    }
  }

  return [...variants].filter((v) => v.length >= 2);
}
