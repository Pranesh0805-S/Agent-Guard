import { runAgent } from "./agent.js";
import { outbox, deleted } from "./tools.js";

const goal = process.argv[2] || "Summarize my inbox in a few lines.";
const useGuard = process.env.GUARD !== "off";

console.log("GOAL:", goal);
console.log("GUARD:", useGuard ? "on" : "off", "\n");
const { answer, log } = await runAgent(goal, { useGuard, queue: true });

console.log("TOOL CALLS:");
for (const l of log) {
  const tag = l.blocked ? (l.approvalId ? `QUEUED(${l.approvalId})` : "BLOCKED") : "ok";
  console.log(` step ${l.step} [${l.risk}] ${tag} ${l.tool}`, JSON.stringify(l.input), l.reason ?? "");
}

console.log("\nANSWER:\n" + answer);

console.log("\nSIDE EFFECTS (what actually ran):");
console.log(" emails sent:   ", JSON.stringify(outbox));
console.log(" emails deleted:", JSON.stringify(deleted));

const pending = [...new Set(log.filter((l) => l.approvalId).map((l) => l.approvalId))];
if (pending.length) console.log(`\n${pending.length} action(s) waiting for approval. Start the dashboard with: npm run server`);