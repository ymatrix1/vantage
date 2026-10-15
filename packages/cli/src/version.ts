// `vantage --version` and the doctor version row. A released package carries `build-info.json`
// (written by tools/assemble-main-package.mjs); a checkout falls back to its own package.json and git.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export interface VersionInfo {
  version: string;
  /** Short git sha when known. */
  commit?: string;
}

const packageDir = fileURLToPath(new URL("../../", import.meta.url));

function readJson(path: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return typeof parsed === "object" && parsed !== null ? Object.fromEntries(Object.entries(parsed)) : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);

function checkoutCommit(dir: string): string | undefined {
  try {
    const sha = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
    return /^[0-9a-f]{7,40}$/.test(sha) ? sha : undefined;
  } catch {
    return undefined;
  }
}

export function readVersionInfo(env: NodeJS.ProcessEnv, dir: string = packageDir): VersionInfo {
  const built = readJson(`${dir}build-info.json`);
  const builtVersion = str(built?.["version"]);
  if (built && builtVersion) {
    const commit = str(built["commit"])?.slice(0, 7);
    return { version: builtVersion, ...(commit ? { commit } : {}) };
  }
  // Not a release build: a checkout. The version is the dev placeholder, the sha comes from the environment or git.
  const pkgVersion = str(readJson(`${dir}package.json`)?.["version"]) ?? "0.0.0";
  const commit = str(env["VANTAGE_GIT_SHA"])?.slice(0, 7) ?? checkoutCommit(dir);
  return { version: `${pkgVersion}-dev`, ...(commit ? { commit } : {}) };
}

export const formatVersion = (v: VersionInfo): string =>
  `vantage ${v.version}${v.commit ? ` (${v.commit})` : ""}`;
