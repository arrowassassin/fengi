import { CRAFT_SYSTEM_PROMPT, craftUserPrompt } from "../prompt";
import type { CraftAdapter, CraftRequest } from "./types";

export interface HostedApiConfig {
  /** OpenAI-compatible /chat/completions endpoint. */
  url: string;
  apiKey?: string;
  /** ~1B-class instruct model for the W1-2 gate (e.g. a Llama-3.2-1B host). */
  model: string;
  temperature?: number;
}

/**
 * Hosted-API adapter — the W1–2 go/no-go path (spec §10): evaluate craft
 * quality on a ~1B model server-side before investing in the in-browser path.
 */
export class HostedApiAdapter implements CraftAdapter {
  readonly name = "hosted-api";

  private readonly config: HostedApiConfig;

  constructor(config: HostedApiConfig) {
    this.config = config;
  }

  async invent(request: CraftRequest): Promise<string> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.config.apiKey !== undefined) {
      headers.authorization = `Bearer ${this.config.apiKey}`;
    }
    const response = await fetch(this.config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.config.model,
        temperature: this.config.temperature ?? 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CRAFT_SYSTEM_PROMPT },
          { role: "user", content: craftUserPrompt(request) },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`hosted craft API failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("hosted craft API returned no content");
    }
    return content;
  }
}
