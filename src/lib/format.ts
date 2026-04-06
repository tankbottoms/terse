// Table formatting and markdown output utilities

export interface BenchRow {
  id: string;
  category: string;
  normalTokens: number;
  terseTokens: number;
  savingsPct: number;
}

export interface BenchSummary {
  avgNormal: number;
  avgTerse: number;
  avgSavings: number;
  minSavings: number;
  maxSavings: number;
}

/**
 * Format benchmark results as a markdown table matching the Python reference output.
 */
export function formatBenchTable(rows: BenchRow[], summary: BenchSummary): string {
  const lines: string[] = [];

  lines.push("| Prompt | Category | Normal tokens | Terse tokens | Savings |");
  lines.push("|--------|----------|:-------------:|:------------:|:-------:|");

  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${row.category} | ${row.normalTokens} | ${row.terseTokens} | ${row.savingsPct}% |`
    );
  }

  lines.push(
    `| **Average** | | **${summary.avgNormal}** | **${summary.avgTerse}** | **${summary.avgSavings}%** |`
  );
  lines.push("");
  lines.push(
    `*Range: ${summary.minSavings}%–${summary.maxSavings}% savings across prompts.*`
  );

  return lines.join("\n");
}

/**
 * Inject markdown table between benchmark markers in a string.
 */
export const BENCHMARK_START = "<!-- BENCHMARK-TABLE-START -->";
export const BENCHMARK_END = "<!-- BENCHMARK-TABLE-END -->";

export function injectBenchTable(content: string, tableMarkdown: string): string {
  const startIdx = content.indexOf(BENCHMARK_START);
  const endIdx = content.indexOf(BENCHMARK_END);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Benchmark markers not found in content.\nExpected: ${BENCHMARK_START} ... ${BENCHMARK_END}`
    );
  }

  const before = content.slice(0, startIdx + BENCHMARK_START.length);
  const after = content.slice(endIdx);
  return before + "\n" + tableMarkdown + "\n" + after;
}

/**
 * Generate a full markdown benchmark report.
 */
export function formatReport(opts: {
  model: string;
  date: string;
  trials: number;
  skillHash: string;
  rows: BenchRow[];
  summary: BenchSummary;
}): string {
  const { model, date, trials, skillHash, rows, summary } = opts;
  const lines: string[] = [];

  lines.push("# Terse Benchmark Report");
  lines.push("");
  lines.push("## Metadata");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Model | \`${model}\` |`);
  lines.push(`| Date | ${date} |`);
  lines.push(`| Trials per prompt | ${trials} |`);
  lines.push(`| SKILL.md SHA-256 | \`${skillHash.slice(0, 16)}...\` |`);
  lines.push("");
  lines.push("## Results");
  lines.push("");
  lines.push(formatBenchTable(rows, summary));

  return lines.join("\n");
}

/**
 * Compute median of a numeric array.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * Round to one decimal place.
 */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
