// Keeps the terms + privacy policy text tied to a version.
//
// policy.lock.json holds a hash of the two pages users accept together and the
// version that text was published as. CI runs `check`: if the text changed
// and nobody recorded a version for it, the build fails. That's the moment
// to add a version in the API (gym-ledger/api src/config/policyVersions.ts:
// read its header; only material versions ask users to accept again, but err
// on the side of asking again) and then run `write` with it here.
//
//   npm run policy:check                  # CI: fail if the text isn't locked
//   npm run policy:lock -- 2026-11-02.2   # after adding that version in the API
//
// Changed only code or comments, nothing a user reads? Re-lock with the
// current version (no new version needed).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCK = join(ROOT, "policy.lock.json");
const FILES = ["src/app/terms/page.tsx", "src/app/privacy/page.tsx"];

function textHash() {
  const h = createHash("sha256");
  for (const f of FILES) {
    // Line endings don't change what anyone reads.
    h.update(`${f}\n${readFileSync(join(ROOT, f), "utf8").replace(/\r\n/g, "\n")}\n`);
  }
  return h.digest("hex");
}

function readLock() {
  try {
    return JSON.parse(readFileSync(LOCK, "utf8"));
  } catch {
    return null;
  }
}

const [mode, version] = process.argv.slice(2);

if (mode === "check") {
  const lock = readLock();
  const hash = textHash();
  if (lock?.sha256 === hash) {
    console.log(`policy text is locked as version ${lock.version}`);
    process.exit(0);
  }
  console.error(
    [
      "The terms of use / privacy policy text changed but no version was recorded for it.",
      "",
      "1. In gym-ledger/api, add a version to src/config/policyVersions.ts (read the header:",
      "   decide `reconsent`; when unsure, use \"everyone\").",
      "2. Here, run: npm run policy:lock -- <that version>",
      "",
      "Only code or comments changed? Re-lock with the current version.",
      `(expected ${lock?.sha256 ?? "a policy.lock.json"}, got ${hash})`,
    ].join("\n"),
  );
  process.exit(1);
}

if (mode === "write") {
  if (!/^\d{4}-\d{2}-\d{2}(\.\d+)?$/.test(version ?? "")) {
    console.error("usage: npm run policy:lock -- <version, e.g. 2026-11-02.2>");
    process.exit(2);
  }
  writeFileSync(LOCK, `${JSON.stringify({ version, sha256: textHash(), files: FILES }, null, 2)}\n`);
  console.log(`policy.lock.json: ${FILES.join(" + ")} locked as version ${version}`);
  process.exit(0);
}

console.error("usage: node scripts/policy-lock.mjs check | write <version>");
process.exit(2);
