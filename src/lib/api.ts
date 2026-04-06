import Anthropic from "@anthropic-ai/sdk";

const RETRY_DELAYS = [5000, 10000, 20000]; // ms
const MAX_RETRIES = 3;

export interface ApiCallResult {
  inputTokens: number;
  outputTokens: number;
  text: string;
  stopReason: string;
}

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("Error: ANTHROPIC_API_KEY environment variable not set.");
      console.error("Set it or add to ~/.config/terse/config.json");
      process.exit(1);
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function callApi(
  client: Anthropic,
  model: string,
  system: string,
  prompt: string,
  maxTokens = 4096
): Promise<ApiCallResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0,
        system,
        messages: [{ role: "user", content: prompt }],
      });

      const block = response.content[0];
      const text = block.type === "text" ? block.text : "";

      return {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        text,
        stopReason: response.stop_reason ?? "unknown",
      };
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Anthropic.RateLimitError ||
        (err instanceof Error && err.message.includes("rate_limit"));

      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        console.error(
          `  Rate limited, retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const NORMAL_SYSTEM =
  "You are a helpful assistant. Answer clearly and accurately.";
