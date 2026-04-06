import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import { callApi, getClient, NORMAL_SYSTEM } from "../lib/api.js";
import { round1 } from "../lib/format.js";

const DEFAULT_MODEL = process.env.TERSE_MODEL ?? "claude-haiku-4-5-20251001";
const DEFAULT_LEVEL = (process.env.TERSE_LEVEL ?? "standard") as Level;

type Level = "lite" | "standard" | "ultra";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../");
const SKILL_PATH = process.env.TERSE_SKILL_PATH
  ? resolve(process.env.TERSE_SKILL_PATH)
  : resolve(REPO_ROOT, "skills/terse/SKILL.md");

function loadSkillAtLevel(level: Level): string {
  if (!existsSync(SKILL_PATH)) {
    console.error(`Error: SKILL.md not found at ${SKILL_PATH}`);
    console.error("Set TERSE_SKILL_PATH env var to override location.");
    process.exit(1);
  }
  const base = readFileSync(SKILL_PATH, "utf8");
  // Prepend level instruction so the skill knows which mode to use
  return `/terse ${level}\n\n${base}`;
}

function ruler(n = 72): string {
  return "-".repeat(n);
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function registerPreview(program: Command): void {
  program
    .command("preview <file>")
    .description("Show before/after comparison with terse system prompt")
    .option(
      "--level <lite|standard|ultra>",
      "Terse intensity level",
      DEFAULT_LEVEL
    )
    .option("--model <id>", "Claude model ID", DEFAULT_MODEL)
    .action(async (file: string, opts: { level: string; model: string }) => {
      const level = opts.level as Level;
      if (!["lite", "standard", "ultra"].includes(level)) {
        console.error(`Error: --level must be lite, standard, or ultra`);
        process.exit(1);
      }

      let prompt: string;
      try {
        prompt = readFileSync(file, "utf8").trim();
      } catch (err: unknown) {
        console.error(
          `Error reading file: ${err instanceof Error ? err.message : String(err)}`
        );
        process.exit(1);
      }

      const terseSystem = loadSkillAtLevel(level);
      const client = getClient();
      const model: string = opts.model;

      console.error(`Preview: ${file}`);
      console.error(`Level: ${level}  Model: ${model}`);
      console.error("Calling API (normal)...");
      const normalResult = await callApi(client, model, NORMAL_SYSTEM, prompt);

      console.error("Calling API (terse)...");
      const terseResult = await callApi(client, model, terseSystem, prompt);

      const savingsPct = round1(
        ((normalResult.outputTokens - terseResult.outputTokens) /
          normalResult.outputTokens) *
          100
      );

      console.log();
      console.log("PROMPT");
      console.log(ruler());
      console.log(prompt);
      console.log();

      console.log("NORMAL RESPONSE");
      console.log(ruler());
      console.log(normalResult.text);
      console.log();
      console.log(
        `Tokens: ${normalResult.outputTokens} output  |  Words: ${wordCount(normalResult.text)}`
      );
      console.log();

      console.log(`TERSE RESPONSE (level: ${level})`);
      console.log(ruler());
      console.log(terseResult.text);
      console.log();
      console.log(
        `Tokens: ${terseResult.outputTokens} output  |  Words: ${wordCount(terseResult.text)}`
      );
      console.log();

      console.log("SUMMARY");
      console.log(ruler());
      console.log(
        `Normal: ${normalResult.outputTokens} tokens  ->  Terse: ${terseResult.outputTokens} tokens  ->  Savings: ${savingsPct}%`
      );
      if (savingsPct < 0) {
        console.log("Note: terse response was longer than normal — check prompt and skill.");
      }
    });
}
