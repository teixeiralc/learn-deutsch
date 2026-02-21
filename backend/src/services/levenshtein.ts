/**
 * Levenshtein distance and string similarity utilities
 */

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeSimilarity(a: string, b: string): number {
  const na = normalizeString(a);
  const nb = normalizeString(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(na, nb);
  return 1 - dist / maxLen;
}

export interface TokenComparison {
  word: string;
  correct: boolean;
}

export function compareTokens(expected: string, actual: string): TokenComparison[] {
  const expTokens = normalizeString(expected).split(' ');
  const actTokens = normalizeString(actual).split(' ');
  return expTokens.map((word, i) => ({
    word,
    correct: actTokens[i] === word,
  }));
}
