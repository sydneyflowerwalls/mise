import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import "./env";

/**
 * Is Claude usable on this machine?
 *
 * Two supported shapes, so moving to a remote host later needs no code change
 * (integration brief §2):
 *   - Local:  the owner's existing Claude Code login at ~/.claude/.credentials.json
 *   - Remote: CLAUDE_CODE_OAUTH_TOKEN, from `claude setup-token`
 */
export function isClaudeAvailable(): boolean {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return true;
  try {
    return existsSync(join(homedir(), ".claude", ".credentials.json"));
  } catch {
    return false;
  }
}

export type ClaudeAuthSource = "oauth-token" | "local-login" | "none";

export function claudeAuthSource(): ClaudeAuthSource {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return "oauth-token";
  try {
    if (existsSync(join(homedir(), ".claude", ".credentials.json"))) return "local-login";
  } catch {
    /* fall through */
  }
  return "none";
}

/**
 * The specific message to show when auth is the problem. Never a generic
 * error — the fix is a single command and the user should be told it
 * (integration brief §7).
 */
export const CLAUDE_AUTH_HINT =
  "Couldn't authenticate with the Claude plan — run `claude setup-token` and set CLAUDE_CODE_OAUTH_TOKEN.";
