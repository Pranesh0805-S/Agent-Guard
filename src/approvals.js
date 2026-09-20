import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { runTool } from "./tools.js";

// A JSON file lets the agent process and the dashboard server share the queue.
const FILE = process.env.APPROVALS_FILE || fileURLToPath(new URL("../data/approvals.json", import.meta.url));

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(items) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
}

export function addApproval({ goal, tool, input, layer, reason }) {
  const items = load();
  const item = {
    id: randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    status: "pending",
    goal,
    tool,
    input,
    layer,
    reason,
  };
  items.push(item);
  save(items);
  return item;
}

export const listApprovals = () => load();

// Approving runs exactly the stored action. Nothing the agent says later can change it.
export function decide(id, decision) {
  const items = load();
  const item = items.find((i) => i.id === id);
  if (!item) return { error: "not found" };
  if (item.status !== "pending") return { error: `already ${item.status}` };

  item.decidedAt = new Date().toISOString();
  if (decision === "approve") {
    item.result = runTool(item.tool, item.input);
    item.status = "approved";
  } else {
    item.status = "denied";
  }
  save(items);
  return item;
}