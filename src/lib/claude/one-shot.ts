/**
 * Pattern A — one-shot structured extraction (integration brief §5).
 *
 * "Text in, JSON out." No tools, single turn, zod-validated. This is the
 * workhorse: recipe parsing, ingredient canonicalisation, auto-tagging.
 *
 * Every call here is wrapped in a timeout, parsed defensively, and returns a
 * discriminated result rather than throwing — because every Claude-backed
 * feature in this app must have a working non-Claude path (§7).
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { z } from "zod";

import "./env";
import { CLAUDE_AUTH_HINT, isClaudeAvailable } from "./availability";

export type ClaudeFailure =
  | { kind: "unavailable"; message: string }
  | { kind: "auth"; message: string }
  | { kind: "timeout"; message: string }
  | { kind: "invalid-output"; message: string; raw?: string }
  | { kind: "error"; message: string };

export type ClaudeResult<T> =
  | { ok: true; data: T; costUsd: number; durationMs: number }
  | { ok: false; failure: ClaudeFailure };

export interface OneShotOptions<T> {
  systemPrompt: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Tier alias — tracks the current release rather than pinning a dated id. */
  model?: "sonnet" | "opus" | "haiku";
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;

export async function oneShot<T>({
  systemPrompt,
  prompt,
  schema,
  model = "sonnet",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: OneShotOptions<T>): Promise<ClaudeResult<T>> {
  if (!isClaudeAvailable()) {
    return { ok: false, failure: { kind: "auth", message: CLAUDE_AUTH_HINT } };
  }

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const stream = query({
      prompt,
      options: {
        model,
        systemPrompt,
        tools: [],            // no filesystem, no bash — pure reasoning
        settingSources: [],   // ignore any local .claude/ settings
        permissionMode: "bypassPermissions", // headless; nobody is here to approve
        maxTurns: 1,
        abortController: abort,
      },
    });

    for await (const message of stream) {
      if (message.type !== "result") continue;

      if (message.subtype !== "success") {
        return {
          ok: false,
          failure: {
            kind: "error",
            message: message.errors?.join("; ") || `Claude returned ${message.subtype}.`,
          },
        };
      }

      const parsed = parseJson(message.result);
      if (!parsed.ok) {
        return {
          ok: false,
          failure: {
            kind: "invalid-output",
            message: "Claude's response wasn't valid JSON.",
            raw: message.result.slice(0, 2000),
          },
        };
      }

      const validated = schema.safeParse(parsed.value);
      if (!validated.success) {
        return {
          ok: false,
          failure: {
            kind: "invalid-output",
            message: validated.error.issues
              .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
              .join("; "),
            raw: message.result.slice(0, 2000),
          },
        };
      }

      return {
        ok: true,
        data: validated.data,
        costUsd: message.total_cost_usd,
        durationMs: Date.now() - startedAt,
      };
    }

    return { ok: false, failure: { kind: "error", message: "Claude produced no result." } };
  } catch (err) {
    if (abort.signal.aborted) {
      return {
        ok: false,
        failure: { kind: "timeout", message: `Claude didn't respond within ${timeoutMs / 1000}s.` },
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    if (/auth|credential|token|unauthor/i.test(message)) {
      return { ok: false, failure: { kind: "auth", message: CLAUDE_AUTH_HINT } };
    }
    return { ok: false, failure: { kind: "error", message } };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Models wrap JSON in prose or fences more often than you'd like. Strip the
 * common cases before giving up.
 */
function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  const candidates = [text.trim()];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidates.push(fenced[1].trim());

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return { ok: true, value: JSON.parse(candidate) };
    } catch {
      /* try the next shape */
    }
  }
  return { ok: false };
}
