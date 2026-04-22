const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ANTHROPIC_API_KEY",
] as const;

let missing = 0;
for (const name of REQUIRED) {
  const present = typeof process.env[name] === "string" && process.env[name]!.length > 0;
  console.log(`${present ? "OK     " : "MISSING"}  ${name}`);
  if (!present) missing++;
}

if (missing > 0) {
  console.error(`\n${missing} required env var(s) missing.`);
  process.exit(1);
}
console.log("\nAll required env vars present.");
