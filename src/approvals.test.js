import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// Use a throwaway file so the tests never touch your real queue.
const tmp = path.join(os.tmpdir(), `approvals-test-${Date.now()}.json`);
process.env.APPROVALS_FILE = tmp;

const { addApproval, decide } = await import("./approvals.js");
const { deleted, outbox, resetState } = await import("./tools.js");

async function test(name, fn) {
  try {
    await fn();
    console.log("PASS", name);
  } catch (e) {
    console.log("FAIL", name, "-", e.message);
    process.exitCode = 1;
  }
}

const newDelete = () =>
  addApproval({ goal: "g", tool: "delete_email", input: { id: "e3" }, layer: "reviewer", reason: "r" });

await test("new items start pending and nothing is executed", async () => {
  resetState();
  const item = newDelete();
  assert.equal(item.status, "pending");
  assert.deepEqual(deleted, []);
});

await test("deny executes nothing", async () => {
  resetState();
  const out = decide(newDelete().id, "deny");
  assert.equal(out.status, "denied");
  assert.deepEqual(deleted, []);
});

await test("approve runs exactly the stored action", async () => {
  resetState();
  const item = addApproval({
    goal: "g",
    tool: "send_email",
    input: { to: "hr@company.example", subject: "s", body: "b" },
    layer: "reviewer",
    reason: "r",
  });
  const out = decide(item.id, "approve");
  assert.equal(out.status, "approved");
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "hr@company.example");
});

await test("an item can only be decided once", async () => {
  resetState();
  const item = newDelete();
  decide(item.id, "deny");
  const again = decide(item.id, "approve");
  assert.ok(again.error);
  assert.deepEqual(deleted, []);
});

await test("unknown id is rejected", async () => {
  assert.ok(decide("nope", "approve").error);
});

fs.rmSync(tmp, { force: true });