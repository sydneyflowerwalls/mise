/**
 * Claude smoke test — integration brief §12.1, the first thing to run.
 *
 *   curl http://localhost:3000/api/claude/smoke
 *
 * Confirms three things in one round trip:
 *   1. The Agent SDK can spawn its bundled binary on this machine.
 *   2. Auth resolves (local Claude Code login, or CLAUDE_CODE_OAUTH_TOKEN).
 *   3. Billing is going where you think it is.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { claudeAuthSource, isClaudeAvailable } from "@/lib/claude/availability";
import { isMeteredBillingActive } from "@/lib/claude/env";
import { oneShot } from "@/lib/claude/one-shot";

// §3: the SDK spawns a subprocess, so this can never run on the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SmokeSchema = z.object({
  ok: z.literal(true),
  echo: z.string(),
});

export async function GET() {
  const authSource = claudeAuthSource();
  const metered = isMeteredBillingActive();

  const diagnostics = {
    authSource,
    available: isClaudeAvailable(),
    /**
     * If this is ever true, ANTHROPIC_API_KEY has leaked into the environment
     * and calls are being billed per token instead of using the subscription.
     */
    meteredBillingActive: metered,
    platform: process.platform,
    node: process.version,
  };

  if (!diagnostics.available) {
    return NextResponse.json(
      {
        status: "no-auth",
        diagnostics,
        hint: "On this PC, log in with Claude Code first. On a remote host, run `claude setup-token` and set CLAUDE_CODE_OAUTH_TOKEN.",
      },
      { status: 503 },
    );
  }

  const result = await oneShot({
    systemPrompt:
      'You are a JSON API. Reply with only a JSON object and no other text.',
    prompt: 'Reply with exactly: {"ok": true, "echo": "mise"}',
    schema: SmokeSchema,
    model: "sonnet",
    timeoutMs: 45_000,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "failed", diagnostics, failure: result.failure },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: "ok",
    diagnostics,
    roundTrip: {
      echo: result.data.echo,
      durationMs: result.durationMs,
      /**
       * On a subscription this is what the call WOULD have cost on metered
       * billing — it is not a charge. If meteredBillingActive is true, it is.
       */
      reportedCostUsd: result.costUsd,
    },
  });
}
