import { readFileSync } from "node:fs";
import type { Command } from "commander";
import { lintText } from "../lib/patterns.js";
import type { PatternMatch } from "../lib/patterns.js";

function formatLintOutput(
  text: string,
  filePath: string | undefined
): void {
  const result = lintText(text);
  const source = filePath ?? "<stdin>";

  console.log(`\nTerse lint: ${source}`);
  console.log(`Words: ${result.wordCount}  Matches: ${result.totalMatches}  Verbosity score: ${result.score}/100`);
  console.log();

  const categories: Array<{ label: string; key: keyof typeof result.byCategory }> = [
    { label: "Pleasantries", key: "pleasantry" },
    { label: "Hedging phrases", key: "hedging" },
    { label: "Redundant phrases", key: "redundant" },
    { label: "Filler words", key: "filler" },
    { label: "Articles", key: "article" },
  ];

  let anyMatches = false;
  for (const { label, key } of categories) {
    const matches = result.byCategory[key];
    if (matches.length === 0) continue;
    anyMatches = true;

    const total = matches.reduce((s: number, m: PatternMatch) => s + m.count, 0);
    console.log(`${label} (${total} match${total !== 1 ? "es" : ""})`);

    for (const m of matches) {
      if (m.replacement !== undefined && m.replacement !== null) {
        const rep = m.replacement === "" ? "(remove)" : `"${m.replacement}"`;
        console.log(`  "${m.pattern}" -> ${rep}  [${m.count}x]`);
      } else {
        console.log(`  "${m.pattern}"  [${m.count}x]`);
      }
    }
    console.log();
  }

  if (!anyMatches) {
    console.log("No verbosity patterns detected.");
    console.log();
  }

  if (result.suggestions.length > 0) {
    console.log("Suggestions:");
    for (const s of result.suggestions) {
      console.log(`  - ${s}`);
    }
    console.log();
  }

  // Score bar
  const barLen = 40;
  const filled = Math.round((result.score / 100) * barLen);
  const bar = "#".repeat(filled) + ".".repeat(barLen - filled);
  const label =
    result.score < 20 ? "Terse" : result.score < 50 ? "Moderate" : "Verbose";
  console.log(`Score [${bar}] ${result.score}/100 (${label})`);
  console.log();
}

export function registerLint(program: Command): void {
  program
    .command("lint [file]")
    .description("Detect verbosity patterns in a file or stdin")
    .action(async (file: string | undefined) => {
      let text: string;

      if (file) {
        try {
          text = readFileSync(file, "utf8");
        } catch (err: unknown) {
          console.error(
            `Error reading file: ${err instanceof Error ? err.message : String(err)}`
          );
          process.exit(1);
        }
        formatLintOutput(text, file);
      } else {
        // Read from stdin
        const chunks: Buffer[] = [];
        process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
        process.stdin.on("end", () => {
          text = Buffer.concat(chunks).toString("utf8");
          formatLintOutput(text, undefined);
        });
        process.stdin.on("error", (err) => {
          console.error(`Error reading stdin: ${err.message}`);
          process.exit(1);
        });
      }
    });
}
