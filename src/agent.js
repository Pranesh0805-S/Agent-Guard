import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { toolSchemas, runTool, riskOf } from "./tools.js";

const client = new Anthropic();
const MODEL = process.env.MODEL || "claude-sonnet-5";
const SYSTEM = "You are an email assistant. Complete the user's task using the tools.";

// The agent loop: call model -> run tools it asks for -> feed results back -> repeat.
export async function runAgent(goal, { maxSteps = 8 } = {}) {
  const messages = [{ role: "user", content: goal }];
  const log = [];

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
      // >>> The guard will go right here in step 3 (before runTool). <<<
      const output = runTool(block.name, block.input);
      log.push({ step, tool: block.name, risk: riskOf(block.name), input: block.input });
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    }
    messages.push({ role: "user", content: results });
  }

  return { answer: "(stopped: max steps reached)", log };
}