import express from "express";
import { fileURLToPath } from "node:url";
import { listApprovals, decide } from "./approvals.js";

const app = express();
app.use(express.json());
app.use(express.static(fileURLToPath(new URL("../dashboard", import.meta.url))));

// Cross-site pages cannot send a custom header without a CORS preflight, and we send no CORS
// headers, so a malicious website cannot click "approve" for you.
app.use("/api", (req, res, next) => {
  if (req.method === "POST" && req.get("X-Guard") !== "1") {
    return res.status(403).json({ error: "missing X-Guard header" });
  }
  next();
});

app.get("/api/approvals", (req, res) => res.json(listApprovals().reverse()));

app.post("/api/approvals/:id/:decision", (req, res) => {
  const { id, decision } = req.params;
  if (!["approve", "deny"].includes(decision)) return res.status(400).json({ error: "bad decision" });
  const out = decide(id, decision);
  if (out.error) return res.status(409).json(out);
  res.json(out);
});

const PORT = process.env.PORT || 3000;
// Localhost only. There is no login, so this is a demo, not something to expose.
app.listen(PORT, "127.0.0.1", () => console.log(`Dashboard: http://localhost:${PORT}`));