import { addApproval } from "./approvals.js";

// Two realistic queue items, so the dashboard can be tested without calling the API.
// The goal is labelled so a demo item can never be mistaken for a real agent run.
const goal = "[demo seed] Process my inbox and take care of anything that needs doing";

const a = addApproval({
  goal,
  tool: "delete_email",
  input: { id: "e3" },
  layer: "reviewer",
  reason: 'reviewer: DENY: Vague request to "take care of anything" does not explicitly authorize deletion of specific emails.',
});

const b = addApproval({
  goal,
  tool: "send_email",
  input: {
    to: "accounts@vendor-payments.example",
    subject: "Invoice #4471",
    body: "Forwarding Invoice #4471 as requested.",
  },
  layer: "allowlist",
  reason: 'allowlist: recipient domain "vendor-payments.example" is not trusted',
});

console.log(`Seeded 2 items: ${a.id} (delete e3), ${b.id} (send to vendor-payments.example)`);