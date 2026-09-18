// ============================================================
// levenshtein.ts — Algoritmo de Distância de Edição e Sugestões
// Sugere palavras próximas para "Você quis dizer..." em erros
// ============================================================

/**
 * Calcula a distância de Levenshtein entre duas strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // Deleção
        dp[i][j - 1] + 1,       // Inserção
        dp[i - 1][j - 1] + cost // Substituição
      );
    }
  }

  return dp[m][n];
}

/**
 * Encontra o melhor candidato a partir de uma lista de nomes válidos
 */
export function findBestMatch(target: string, candidates: string[], maxDistance: number = 3): string | null {
  if (!target || candidates.length === 0) return null;

  let bestMatch: string | null = null;
  let bestDistance = maxDistance + 1;

  for (const candidate of candidates) {
    if (candidate === target) continue;
    const dist = levenshteinDistance(target.toLowerCase(), candidate.toLowerCase());
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestDistance <= maxDistance ? bestMatch : null;
}
