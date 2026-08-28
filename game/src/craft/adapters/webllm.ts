import { CRAFT_SYSTEM_PROMPT, craftUserPrompt } from "../prompt";
import type { CraftAdapter, CraftRequest } from "./types";

/** Small instruct model for in-browser crafting (re-gated in W13, spec §10). */
export const DEFAULT_WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export type WebLlmProgress = (progressText: string) => void;

interface ChatEngine {
  chat: {
    completions: {
      create(args: {
        messages: { role: "system" | "user"; content: string }[];
        temperature: number;
        response_format?: { type: "json_object" };
      }): Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
}

/**
 * In-browser adapter over @mlc-ai/web-llm. The library is imported lazily so
 * the multi-MB runtime never loads until the player opts into on-device
 * crafting; model weights stream into the browser cache on first use.
 */
export class WebLlmAdapter implements CraftAdapter {
  readonly name = "webllm";
  private enginePromise: Promise<ChatEngine> | undefined;

  private readonly model: string;
  private readonly onProgress: WebLlmProgress | undefined;

  constructor(model: string = DEFAULT_WEBLLM_MODEL, onProgress?: WebLlmProgress) {
    this.model = model;
    this.onProgress = onProgress;
  }

  private init(): Promise<ChatEngine> {
    this.enginePromise ??= (async () => {
      const webllm = await import("@mlc-ai/web-llm");
      const engine = await webllm.CreateMLCEngine(this.model, {
        initProgressCallback: (report) => this.onProgress?.(report.text),
      });
      return engine as unknown as ChatEngine;
    })();
    return this.enginePromise;
  }

  async invent(request: CraftRequest): Promise<string> {
    const engine = await this.init();
    const reply = await engine.chat.completions.create({
      messages: [
        { role: "system", content: CRAFT_SYSTEM_PROMPT },
        { role: "user", content: craftUserPrompt(request) },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });
    const content = reply.choices[0]?.message.content;
    if (content === null || content === undefined) {
      throw new Error("webllm returned no content");
    }
    return content;
  }
}
