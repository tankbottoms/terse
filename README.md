# terse

Token-efficient communication for Claude.

[![Stars](https://img.shields.io/github/stars/tankbottoms/terse?style=flat-square)](https://github.com/tankbottoms/terse/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/tankbottoms/terse?style=flat-square)](https://github.com/tankbottoms/terse/commits/main)
[![License](https://img.shields.io/github/license/tankbottoms/terse?style=flat-square)](LICENSE)

`terse` is a Claude Code skill and Bun/TypeScript CLI that reduces Claude's output token usage through systematic elimination of linguistic waste. It preserves full technical accuracy — code, error messages, and technical terms are never altered — while stripping articles, filler, hedging, and pleasantries that add length without adding meaning.

## Before / After

| Prompt | Default response | terse (standard) |
|--------|-----------------|------------------|
| Explain a React re-render bug | "I'd be happy to help with that! The reason this is happening is because React re-renders whenever state or props change. You might want to consider using `React.memo`..." | "Re-render triggered by state/props change. Wrap component in `React.memo` to skip if props unchanged." |
| Set up a Postgres connection pool | "Sure! Let me walk you through setting up a PostgreSQL connection pool. First, you'll want to install the pg package, which provides..." | "Install `pg`. Create pool: `new Pool({ connectionString, max: 10 })`. Export and reuse — never create per-request." |
| Fix auth middleware token expiry | "Great question! The issue you're seeing is likely related to how token expiry is being handled. I would recommend that you consider adding a refresh check before..." | "Token expiry not refreshed before check. Add `if (isExpired(token)) await refresh(token)` before auth validation." |

### Intensity levels

| Level | Trigger | Behavior |
|-------|---------|----------|
| lite | `/terse lite` | Remove filler, hedging, pleasantries. Full grammar preserved. |
| standard | `/terse` | Drop articles, use fragments, short synonyms. All elimination rules active. |
| ultra | `/terse ultra` | Telegraphic. Abbreviations (DB, auth, fn, impl). Arrow notation (X -> Y). Minimum viable communication. |

---

## Install

```bash
npx skills add tankbottoms/terse
```

---

## Usage

Activate with any of:

- `/terse [lite|standard|ultra]`
- "terse mode", "be terse", "be brief", "less tokens", "concise mode"

Stop with: `stop terse` or `normal mode`

Intensity persists until changed or the session ends.

> Note: terse only affects output tokens. Reasoning and thinking tokens are unchanged.

Auto-clarity: terse suspends automatically for security warnings, irreversible action confirmations, and multi-step sequences where fragments risk misread. It resumes after.

---

## CLI

```bash
terse <command> [flags]
```

| Command | Description |
|---------|-------------|
| `bench` | Run benchmark suite against the 10 test prompts; report token savings per prompt and average |
| `lint <file\|stdin>` | Scan text for verbosity patterns — articles, filler, hedging, redundant phrases — and report a verbosity score |
| `preview <file>` | Send a prompt through Claude twice (default vs. terse) and display side-by-side output with token counts |
| `report` | Generate a markdown benchmark report suitable for CI output or PR comments |

### Key flags

| Flag | Commands | Description |
|------|----------|-------------|
| `--level <lite\|standard\|ultra>` | `bench`, `preview` | Intensity level (default: standard) |
| `--model <id>` | `bench`, `preview` | Claude model to use (default: claude-haiku-4-5-20251001) |
| `--trials <n>` | `bench` | Number of trials per prompt (default: 3) |
| `--json` | `bench`, `report` | Output results as JSON |
| `--threshold <pct>` | `bench` | Fail if average savings fall below this percentage (default: 50) |

### Environment

```bash
ANTHROPIC_API_KEY=...     # Required for bench and preview
TERSE_MODEL=...           # Override default model
TERSE_LEVEL=...           # Override default intensity level
```

Config: `~/.config/terse/config.json` - Cache: `~/.cache/terse/`

---

## Benchmarks

<!-- BENCHMARK-TABLE-START -->
<!-- BENCHMARK-TABLE-END -->

Benchmarks run automatically on changes to `skills/terse/SKILL.md`. CI fails if average savings fall below 50%. Run locally with `terse bench`.

---

## How It Works

Standard LLM output spends tokens on constructs that carry no information:

- Pleasantries: "I'd be happy to help you with that" (8 tokens)
- Filler: "The reason this is happening is because" (7 tokens)
- Hedging: "You might want to consider" (5 tokens)
- Articles and connectives distributed throughout

`terse` instructs Claude to eliminate these categories systematically. At `standard` level, articles are dropped and fragments replace full sentences. At `ultra`, output is telegraphic — conjunctions stripped, abbreviations used, relationships expressed with arrow notation.

The elimination rules have a hard boundary: code blocks, technical terms, error messages, and git commit messages are written normally regardless of intensity level. Compression applies only to prose.

---

## Build

```bash
bun install
bun run build              # macOS ARM64
bun run build:linux        # Linux ARM64 (for Spark nodes)
```

---

## License

MIT - M.P.
