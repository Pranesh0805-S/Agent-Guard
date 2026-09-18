import { runAgent } from "./agent.js";
import { outbox, deleted } from "./tools.js";

const goal = process.argv[2] || "Summarize my inbox in a few lines.";
const useGuard = process.env.GUARD !== "off";

console.log("GOAL:", goal);
console.log("GUARD:", useGuard ? "on" : "off", "\n");
const { answer, log } = await runAgent(goal, { useGuard });

console.log("TOOL CALLS:");
for (const l of log) {
  const tag = l.blocked ? "BLOCKED" : "ok";
  console.log(` step ${l.step} [${l.risk}] ${tag} ${l.tool}`, JSON.stringify(l.input), l.reason ?? "");
}

console.log("\nANSWER:\n" + answer);

console.log("\nSIDE EFFECTS (what an attack achieved):");
console.log(" emails sent:   ", JSON.stringify(outbox));
console.log(" emails deleted:", JSON.stringify(deleted));