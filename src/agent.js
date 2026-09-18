import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { toolSchemas, runTool, riskOf, isUntrusted } from "./tools.js";
import { createGuard } from "./guard.js";

const client = new Anthropic();
const MODEL = process.env.MODEL || "claude-sonnet-5";
const SYSTEM = "You are an email assistant. Complete the user's task using the tools.";

// The agent loop: call model -> (guard) -> run tools it asks for -> feed results back -> repeat.
export async function runAgent(goal, { maxSteps = 8, useGuard = true } = {}) {
  const messages = [{ role: "user", content: goal }];
  const log = [];
  const guard = createGuard();

  for (let step = 0; step < maxSteps; step++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: toolSchemas,
      messages,
    });

    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason !== "tool_use") {
      const answer = res.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { answer, log };
    }

    const results = [];
    for (const block of res.content.filter((b) => b.type === "tool_use")) {
      const entry = { step, tool: block.name, risk: riskOf(block.name), input: block.input, blocked: false };

      const decision = useGuard ? guard.check(block.name, block.input) : { allow: true };

      if (!decision.allow) {
        entry.blocked = true;
        entry.reason = decision.reason;
        log.push(entry);
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Blocked by guard: ${decision.reason}`,
          is_error: true,
        });
        continue;
      }

      const output = runTool(block.name, block.input);
      if (isUntrusted(block.name)) guard.markTainted();
      log.push(entry);
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    }
    messages.push({ role: "user", content: results });
  }

  return { answer: "(stopped: max steps reached)", log };
}