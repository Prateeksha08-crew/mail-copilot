import { describe, it, expect, vi } from "vitest";

// The parts of lib/assistant.ts worth unit-testing don't require a live
// Anthropic call: normalizeAction() is pure, and resolveCommand()'s
// contract (always returns a well-typed AssistantAction, never throws
// on malformed tool input) is what matters for the UI's safety. Import
// resolveCommand mocked at the SDK boundary rather than hitting the
// real API in CI.

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "tool_use",
              input: { type: "navigate", folder: "sent" },
            },
          ],
        }),
      };
    },
  };
});

import { resolveCommand } from "@/lib/assistant";

describe("resolveCommand", () => {
  it("normalizes a navigate tool call into a typed action", async () => {
    const action = await resolveCommand("show me sent mail", {
      currentFolder: "inbox",
      openMessage: null,
      visibleMessages: [],
      today: new Date().toISOString(),
    });
    expect(action).toEqual({ type: "navigate", folder: "sent" });
  });
});
