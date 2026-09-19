import { riskOf } from "./tools.js";
import { review as apiReview } from "./reviewer.js";
import { inbox } from "../data/emails.js";

const TRUSTED_DOMAINS = ["company.example"];
const MAX_SUBJECT = 60;

// Looks up the target email in the mailbox itself, never from anything the agent says.
const describeEmail = (id) => {
  const e = inbox.find((x) => x.id === id);
  return e ? { subject: e.subject } : null;
};

// One guard per agent run, so taint and verdicts never leak between runs.
export function createGuard({ goal = "", review = apiReview, lookup = describeEmail } = {}) {
  let tainted = false;
  const verdicts = new Map(); // same action in one run always gets the same verdict

  return {
    // Call after a tool returned content that an outsider could have written.
    markTainted() {
      tainted = true;
    },

    // Decide before a tool runs.
    async check(name, input) {
      const risk = riskOf(name);
      if (risk === "read") return { allow: true };

      // Deterministic rule: never send outside trusted domains.
      if (name === "send_email") {
        const domain = String(input?.to ?? "").split("@")[1]?.toLowerCase();
        if (!TRUSTED_DOMAINS.includes(domain)) {
          return { allow: false, reason: `allowlist: recipient domain "${domain}" is not trusted` };
        }
      }

      // Irreversible action after reading untrusted content: ask the blind reviewer.
      // It sees the tool, recipient and id. For deletes it also sees a short, truncated
      // subject of the target email. It never sees bodies or anything the agent wrote.
      if (risk === "irreversible" && tainted) {
        const action = { tool: name };
        if (input?.to) action.to = input.to;
        if (input?.id) {
          action.id = input.id;
          if (name === "delete_email") {
            const meta = lookup(input.id);
            if (meta?.subject) action.targetSubject = String(meta.subject).slice(0, MAX_SUBJECT);
          }
        }

        const key = JSON.stringify(action);
        const cached = verdicts.has(key);
        if (!cached) verdicts.set(key, await review(goal, action));
        const verdict = verdicts.get(key);
        return { allow: verdict.allow, reason: `reviewer: ${verdict.reason}`, reviewed: true, cached };
      }

      return { allow: true };
    },
  };
}