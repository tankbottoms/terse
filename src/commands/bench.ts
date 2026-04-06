import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import { callApi, getClient, NORMAL_SYSTEM } from "../lib/api.js";
import { formatBenchTable, injectBenchTable, median, round1 } from "../lib/format.js";
import type { BenchRow, BenchSummary } from "../lib/format.js";

const DEFAULT_MODEL = process.env.TERSE_MODEL ?? "claude-haiku-4-5-20251001";

// Resolve paths relative to CLI location
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../");
const SKILL_PATH = process.env.TERSE_SKILL_PATH
  ? resolve(process.env.TERSE_SKILL_PATH)
  : resolve(REPO_ROOT, "skills/terse/SKILL.md");
const PROMPTS_PATH = resolve(REPO_ROOT, "benchmarks/prompts.json");
const RESULTS_DIR = resolve(REPO_ROOT, "benchmarks/results");
const README_PATH = resolve(REPO_ROOT, "README.md");

interface PromptEntry {
  id: string;
  category: string;
  prompt: string;
}

interface TrialResult {
  inputTokens: number;
  outputTokens: number;
  text: string;
  stopReason: string;
}

interface BenchmarkEntry {
  id: string;
  category: string;
  prompt: string;
  normal: TrialResult[];
  terse: TrialResult[];
}

function sha256File(path: string): string {
  const data = readFileSync(path);
  return createHash("sha256").update(data).digest("hex");
}

function loadPrompts(): PromptEntry[] {
  if (!existsSync(PROMPTS_PATH)) {
    console.error(`Error: prompts file not found at ${PROMPTS_PATH}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(PROMPTS_PATH, "utf8"));
  return data.prompts as PromptEntry[];
}

function loadSkill(): string {
  if (!existsSync(SKILL_PATH)) {
    console.error(`Error: SKILL.md not found at ${SKILL_PATH}`);
    console.error("Set TERSE_SKILL_PATH env var to override location.");
    process.exit(1);
  }
  return readFileSync(SKILL_PATH, "utf8");
}

function computeStats(results: BenchmarkEntry[]): {
  rows: BenchRow[];
  summary: BenchSummary;
} {
  const rows: BenchRow[] = [];
  const allSavings: number[] = [];

  for (const entry of results) {
    const normalMedian = median(entry.normal.map((r) => r.outputTokens));
    const terseMedian = median(entry.terse.map((r) => r.outputTokens));
    const savingsPct =
      normalMedian > 0
        ? round1(((normalMedian - terseMedian) / normalMedian) * 100)
        : 0;

    rows.push({
      id: entry.id,
      category: entry.category,
      normalTokens: normalMedian,
      terseTokens: terseMedian,
      savingsPct,
    });
    allSavings.push(savingsPct);
  }

  const avgNormal = Math.round(
    rows.reduce((s, r) => s + r.normalTokens, 0) / rows.length
  );
  const avgTerse = Math.round(
    rows.reduce((s, r) => s + r.terseTokens, 0) / rows.length
  );
  const avgSavings = round1(
    allSavings.reduce((s, v) => s + v, 0) / allSavings.length
  );
  const minSavings = Math.min(...allSavings);
  const maxSavings = Math.max(...allSavings);

  return {
    rows,
    summary: { avgNormal, avgTerse, avgSavings, minSavings, maxSavings },
  };
}

function saveResults(
  results: BenchmarkEntry[],
  rows: BenchRow[],
  summary: BenchSummary,
  model: string,
  trials: number,
  skillHash: string
): string {
  const tsFormatted = new Date()
    .toISOString()
    .slice(0, 19)
    .replace("T", "_")
    .replace(/:/g, "")
    .replace(/-/g, "");

  mkdirSync(RESULTS_DIR, { recursive: true });
  const path = `${RESULTS_DIR}/benchmark_${tsFormatted}.json`;

  const output = {
    metadata: {
      script_version: "1.0.0",
      model,
      date: new Date().toISOString(),
      trials,
      skill_md_sha256: skillHash,
    },
    summary,
    rows,
    raw: results,
  };

  writeFileSync(path, JSON.stringify(output, null, 2));
  return path;
}

function updateReadme(tableMarkdown: string): void {
  if (!existsSync(README_PATH)) {
    console.error(`Error: README.md not found at ${README_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(README_PATH, "utf8");
  try {
    const updated = injectBenchTable(content, tableMarkdown);
    writeFileSync(README_PATH, updated);
    console.error("README.md updated.");
  } catch (err: unknown) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function printDryRun(prompts: PromptEntry[], model: string, trials: number): void {
  console.log(`Model:  ${model}`);
  console.log(`Trials: ${trials}`);
  console.log(`Prompts: ${prompts.length}`);
  console.log(`Total API calls: ${prompts.length * 2 * trials}`);
  console.log(`SKILL.md: ${SKILL_PATH}`);
  console.log();
  for (const p of prompts) {
    const preview = p.prompt.length > 80 ? p.prompt.slice(0, 80) + "..." : p.prompt;
    console.log(`  [${p.id}] (${p.category})`);
    console.log(`    ${preview}`);
  }
  console.log();
  console.log("Dry run complete. No API calls made.");
}

export function registerBench(program: Command): void {
  program
    .command("bench")
    .description("Benchmark terse vs normal Claude token usage")
    .option("--trials <n>", "Runs per prompt per mode (median used)", "3")
    .option("--model <id>", "Claude model ID", DEFAULT_MODEL)
    .option("--dry-run", "Print config without making API calls")
    .option("--update-readme", "Inject results table into README.md")
    .option("--json", "Output raw JSON results to stdout")
    .option("--threshold <pct>", "Minimum savings % to pass (exit 1 if below)", "50")
    .action(async (opts) => {
      const trials = parseInt(opts.trials, 10);
      const threshold = parseFloat(opts.threshold);
      const model: string = opts.model;
      const prompts = loadPrompts();

      if (opts.dryRun) {
        printDryRun(prompts, model, trials);
        return;
      }

      const terseSystem = loadSkill();
      const skillHash = sha256File(SKILL_PATH);
      const client = getClient();

      console.error(
        `Running benchmarks: ${prompts.length} prompts x 2 modes x ${trials} trials`
      );
      console.error(`Model: ${model}`);
      console.error();

      const results: BenchmarkEntry[] = [];
      const total = prompts.length;

      for (let i = 0; i < prompts.length; i++) {
        const entry = prompts[i];
        const benchEntry: BenchmarkEntry = {
          id: entry.id,
          category: entry.category,
          prompt: entry.prompt,
          normal: [],
          terse: [],
        };

        for (const [mode, system] of [
          ["normal", NORMAL_SYSTEM],
          ["terse", terseSystem],
        ] as [string, string][]) {
          for (let t = 1; t <= trials; t++) {
            console.error(
              `  [${i + 1}/${total}] ${entry.id} | ${mode} | trial ${t}/${trials}`
            );
            const result = await callApi(client, model, system, entry.prompt);
            benchEntry[mode as "normal" | "terse"].push(result);
            // Brief pause between calls
            if (!(i === prompts.length - 1 && mode === "terse" && t === trials)) {
              await new Promise((r) => setTimeout(r, 500));
            }
          }
        }

        results.push(benchEntry);
      }

      const { rows, summary } = computeStats(results);
      const tableMarkdown = formatBenchTable(rows, summary);
      const jsonPath = saveResults(results, rows, summary, model, trials, skillHash);

      console.error(`\nResults saved to ${jsonPath}`);

      if (opts.updateReadme) {
        updateReadme(tableMarkdown);
      }

      if (opts.json) {
        console.log(
          JSON.stringify({ metadata: { model, trials, skillHash }, rows, summary, raw: results }, null, 2)
        );
      } else {
        console.log(tableMarkdown);
      }

      if (summary.avgSavings < threshold) {
        console.error(
          `\nFAIL: Average savings ${summary.avgSavings}% is below the ${threshold}% threshold.`
        );
        process.exit(1);
      }
    });
}
