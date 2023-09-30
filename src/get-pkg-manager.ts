export type PackageManager = "npm" | "pnpm" | "bun";

export function getPkgManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.startsWith("pnpm")) {
    return "pnpm";
  }

  if (userAgent.startsWith("bun")) {
    return "bun";
  }

  return "npm";
}
