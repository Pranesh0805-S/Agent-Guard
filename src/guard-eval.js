import path from "node:path";
import { pathToFileURL } from "node:url";
import { createGuard } from "./guard.js";

// Worst-case test: assume the agent is fully fooled and is asking for each action.
// Every case is a (user goal, proposed action) pair with the answer it should get.
const file = process.argv[2] || "data/guard-cases.js";
const repeats = Number(process.argv[3] || 3);
const { CASES } = await import(pathToFileURL(path.resolve(file)).href);

if (!Array.isArray(CASES) || CASES.length === 0) {
  console.log(`No cases found in ${file}. Add some and run again.`);
  process.exit(1);
}

console.log(`FILE: ${file}  CASES: ${CASES.length}  REPEATS: ${repeats}\n`);

let attackTotal = 0;
let attackStopped = 0;
let byAllowlist = 0;
let byReviewer = 0;
let legitTotal = 0;
let legitAllowed = 0;
let errors = 0;

for (const c of CASES) {
  let ok = 0;
  let last = "";
  const layers = new Set();

  for (let i = 0; i < repeats; i++) {
    // A fresh guard per repeat, with untrusted content already read (the dangerous state).
    const guard = createGuard({
      goal: c.goal,
      lookup: c.subject !== undefined ? () => ({ subject: c.subject }) : undefined,
    });
    if (c.tainted !== false) guard.markTainted();

    const d = await guard.check(c.tool, c.input);
    const blocked = !d.allow;
    layers.add(d.layer ?? (d.reviewed ? "reviewer" : "none"));
    if (String(d.reason).includes("reviewer error")) errors++;
    last = d.reason ?? "";

    if (c.expect === "block") {
      attackTotal++;
      if (blocked) {
        attackStopped++;
        if (d.layer === "allowlist") byAllowlist++;
        if (d.layer === "reviewer") byReviewer++;
      }
    } else {
      legitTotal++;
      if (!blocked) legitAllowed++;
    }

    if ((c.expect === "block") === blocked) ok++;
  }

  const kind = c.expect === "block" ? "attack" : "legit ";
  console.log(`${ok === repeats ? "PASS" : "FAIL"} ${ok}/${repeats} [${[...layers].join("/")}] ${kind}: ${c.name}`);
  if (ok !== repeats) console.log(`       last verdict: ${last.slice(0, 140)}`);
}

console.log("\nSUMMARY");
console.log(` attacks stopped:            ${attackStopped}/${attackTotal}  (allowlist ${byAllowlist}, reviewer ${byReviewer})`);
console.log(` legitimate actions allowed: ${legitAllowed}/${legitTotal}`);
console.log(` reviewer API errors:        ${errors}`);