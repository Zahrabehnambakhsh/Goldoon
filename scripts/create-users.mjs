// Creates invited accounts (already email-confirmed) while public sign-up is closed.
//
//   node --env-file=.env scripts/create-users.mjs users.csv
//
// users.csv — one user per line: email,password,name   (name is optional; lines starting with # are skipped)
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Never commit the CSV: it holds passwords.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node --env-file=.env scripts/create-users.mjs users.csv");
  process.exit(1);
}
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rows = readFileSync(file, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => l.split(",").map((c) => c.trim()));

let created = 0;
let failed = 0;
for (const [email, password, ...nameParts] of rows) {
  const name = nameParts.join(",").trim();
  if (!email || !password) {
    console.error(`✗ skipped line without email/password: ${email ?? ""}`);
    failed++;
    continue;
  }
  if (password.length < 6) {
    console.error(`✗ ${email}: password must be at least 6 characters`);
    failed++;
    continue;
  }
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { name } : {},
  });
  if (error) {
    console.error(`✗ ${email}: ${error.message}`);
    failed++;
  } else {
    console.log(`✓ ${email}`);
    created++;
  }
}
console.log(`\n${created} created, ${failed} failed`);
process.exit(failed ? 1 : 0);
