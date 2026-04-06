import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import { formatReport } from "../lib/format.js";
import type { BenchRow, BenchSummary } from "../lib/format.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../");
const RESULTS_DIR = resolve(REPO_ROOT, "benchmarks/results");

interface ResultFile {
  metadata: {
    script_version: string;
    model: string;
    date: string;
    trials: number;
    skill_md_sha256: string;
  };
  summary: BenchSummary;
  rows: BenchRow[];
}

function findLatestResult(): string | null {
  if (!existsSync(RESULTS_DIR)) return null;

  const files = readdirSync(RESULTS_DIR)
    .filter((f) => f.startsWith("benchmark_") && f.endsWith(".json"))
    .sort()
    .reverse();

  return files.length > 0 ? resolve(RESULTS_DIR, files[0]) : null;
}

export function registerReport(program: Command): void {
  program
    .command("report [file]")
    .description(
      "Generate markdown report from most recent benchmark results (or a specific JSON file)"
    )
    .action((file: string | undefined) => {
      const path = file ?? findLatestResult();

      if (!path) {
        console.error(
          `Error: No benchmark results found in ${RESULTS_DIR}`
        );
        console.error("Run `terse bench` first to generate results.");
        process.exit(1);
      }

      if (!existsSync(path)) {
        console.error(`Error: File not found: ${path}`);
        process.exit(1);
      }

      let data: ResultFile;
      try {
        data = JSON.parse(readFileSync(path, "utf8")) as ResultFile;
      } catch (err: unknown) {
        console.error(
          `Error parsing results file: ${err instanceof Error ? err.message : String(err)}`
        );
        process.exit(1);
      }

      const report = formatReport({
        model: data.metadata.model,
        date: data.metadata.date,
        trials: data.metadata.trials,
        skillHash: data.metadata.skill_md_sha256,
        rows: data.rows,
        summary: data.summary,
      });

      console.log(report);
    });
}
