import { riskOf } from "./tools.js";

const TRUSTED_DOMAINS = ["company.example"];

// One guard per agent run, so taint never leaks between runs.
export function createGuard() {
  let tainted = false;

  return {
    // Call after a tool returned content that an outsider could have written.
    markTainted() {
      tainted = true;
    },

    // Decide before a tool runs.
    check(name, input) {
      const risk = riskOf(name);
      if (risk === "read") return { allow: true };

      if (name === "send_email") {
        const domain = String(input?.to ?? "").split("@")[1]?.toLowerCase();
        if (!TRUSTED_DOMAINS.includes(domain)) {
          return { allow: false, reason: `recipient domain "${domain}" is not on the allowlist` };
        }
      }

      if (risk === "irreversible" && tainted) {
        return { allow: false, reason: "irreversible action requested after reading untrusted content" };
      }

      return { allow: true };
    },
  };
}