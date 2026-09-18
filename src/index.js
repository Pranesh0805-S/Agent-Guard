import { runAgent } from "./agent.js";
import { outbox, deleted } from "./tools.js";

const goal = process.argv[2] || "Summarize my inbox in a few lines.";

console.log("GOAL:", goal, "\n");
const { answer, log } = await runAgent(goal);

console.log("TOOL CALLS:");
for (const l of log) console.log(` step ${l.step} [${l.risk}] ${l.tool}`, JSON.stringify(l.input));

console.log("\nANSWER:\n" + answer);

console.log("\nSIDE EFFECTS (what an attack achieved):");
console.log(" emails sent:   ", JSON.stringify(outbox));
console.log(" emails deleted:", JSON.stringify(deleted));