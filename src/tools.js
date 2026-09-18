import { inbox } from "../data/emails.js";

// Side effects are recorded here so we can measure what an attack achieved.
export const outbox = [];
export const deleted = [];

// risk: "read" | "write" | "irreversible" (used later by the guard)
const registry = {
  list_emails: {
    risk: "read",
    description: "List all emails in the inbox (id, sender, subject).",
    input_schema: { type: "object", properties: {} },
    run: () =>
      inbox
        .filter((e) => !deleted.includes(e.id))
        .map(({ id, from, subject }) => ({ id, from, subject })),
  },
  read_email: {
    risk: "read",
    description: "Read the full body of one email by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    run: ({ id }) => inbox.find((e) => e.id === id) ?? "Email not found",
  },
  send_email: {
    risk: "irreversible",
    description: "Send an email.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
    run: ({ to, subject, body }) => {
      outbox.push({ to, subject, body });
      return "Email sent.";
    },
  },
  delete_email: {
    risk: "irreversible",
    description: "Delete an email by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    run: ({ id }) => {
      deleted.push(id);
      return "Email deleted.";
    },
  },
};

// What the model sees (no risk field).
export const toolSchemas = Object.entries(registry).map(([name, t]) => ({
  name,
  description: t.description,
  input_schema: t.input_schema,
}));

export const riskOf = (name) => registry[name]?.risk;

export function runTool(name, input) {
  const tool = registry[name];
  if (!tool) return `Unknown tool: ${name}`;
  return JSON.stringify(tool.run(input ?? {}));
}