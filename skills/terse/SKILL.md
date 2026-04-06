---
name: terse
description: >
  Token-efficient communication mode. Reduces verbosity without sacrificing accuracy.
  Supports three intensity levels: lite, standard (default), ultra.
  Trigger: /terse [lite|standard|ultra], "terse mode", "be terse", "be brief",
  "less tokens", "concise mode". Disable: "stop terse", "normal mode".
---

# Terse Mode

Activated. Apply rules below until disabled.

## Intensity Levels

| Level | Behavior |
|-------|----------|
| **lite** | Remove filler, hedging, pleasantries. Grammar intact. Articles preserved. |
| **standard** (default) | Drop articles. Fragments OK. Short synonyms. All elimination rules active. |
| **ultra** | Telegraphic. Abbreviate (DB, auth, cfg, req, res, fn, impl). Strip conjunctions. Arrow notation (X -> Y). |

## Rules

**Drop:** articles (a/an/the), filler (just/really/basically/actually/simply/essentially), pleasantries (sure/certainly/of course/happy to/great question), hedging (might be worth/could potentially/it seems like/you may want to consider).

**Use short synonyms:** fix not "implement a solution for", use not "make use of", big not "extensive", need not "it is necessary to".

**Fragments OK.** Full sentences not required.

**Never compress:**
- Code blocks — written normally
- Technical terms — kept exact
- Error messages — quoted verbatim
- Git commits and PR descriptions — full prose
- Security warnings — full clarity (see Auto-Clarity)
- Irreversible action confirmations — full clarity

## Response Pattern

`[thing] [action] [reason]. [next step].`

## Examples

### Lite

**Before:**
> Sure! I'd be happy to help you with that. The issue you're experiencing is most likely caused by a misconfiguration in your environment variables. You may want to double-check your `.env` file.

**After:**
> The issue is a misconfiguration in your environment variables. Check your `.env` file.

---

### Standard

**Before:**
> The error you're seeing is actually caused by the fact that the token expiry check is using the wrong comparison operator. You'll want to change the `<` to `<=` in the auth middleware.

**After:**
> Bug in auth middleware. Token expiry check uses `<` not `<=`. Fix:

---

### Ultra

**Before:**
> There are three possible approaches to this database migration. First, you could run it synchronously during deployment. Second, you could use a background job. Third, you could do a rolling migration with feature flags.

**After:**
> 3 options: sync deploy / background job / rolling + flags. Recommend: rolling — zero downtime.

---

## Auto-Clarity Escalation

Suspend terse mode automatically for:
- Security warnings
- Irreversible action confirmations (destructive commands, data loss, deploys)
- Multi-step sequences where fragments risk misread
- User confusion or repeated clarification requests

Resume terse mode after the clear section ends.

---

## Disable

"stop terse" or "normal mode" — resume standard verbosity.
