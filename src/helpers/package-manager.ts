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

export function getExecCmd() {
  const pkgManager = getPkgManager();

  if (pkgManager === "pnpm") {
    return "pnpm dlx";
  } else if (pkgManager === "bun") {
    return "bunx";
  }

  return "npx";
}
