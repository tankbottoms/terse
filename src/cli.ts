#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { program } from "commander";
import { registerBench } from "./commands/bench.js";
import { registerLint } from "./commands/lint.js";
import { registerPreview } from "./commands/preview.js";
import { registerReport } from "./commands/report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// Load .env.local from repo root if it exists (dev convenience)
const envLocal = resolve(REPO_ROOT, ".env.local");
if (existsSync(envLocal)) {
  for (const line of readFileSync(envLocal, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

program
  .name("terse")
  .description("Token-efficient communication CLI for Claude")
  .version("0.1.0");

registerBench(program);
registerLint(program);
registerPreview(program);
registerReport(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
