import { spawnSync } from "node:child_process";

// Preview builds must never change the production manifest structure.
if (process.env.VERCEL_ENV === "production") {
  const result = spawnSync(
    "einblick-sdk",
    ["content", "sync", "--manifest", "content/einblick.content.ts"],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
