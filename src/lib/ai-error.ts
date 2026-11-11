import type { TokenUsage } from "@/lib/ai-config";

export class AiServiceError extends Error {
  readonly kind: "timeout" | "upstream" | "invalid-response" | "budget-exhausted";
  readonly status?: number;
  readonly usage?: TokenUsage;

  constructor(message: string, kind: AiServiceError["kind"], status?: number, usage?: TokenUsage) {
    super(message);
    this.name = "AiServiceError";
    this.kind = kind;
    this.status = status;
    this.usage = usage;
  }
}
