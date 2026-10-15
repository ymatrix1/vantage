// Assembles the one installable Vantage npm package (D96). Does not publish.
// Usage: node tools/assemble-main-package.mjs <version> <outDir> [--commit <sha>]
//
// The workspace packages are not published on their own. Their built output is staged under the package's own
// `node_modules/@vantage/<name>` and listed in `bundledDependencies`, so one tarball carries them. The layout
// mirrors `packages/` (cli, core, daemon, hooks, ui side by side), which keeps every relative path the CLI uses
// to find the UI build and the hook entry (`../../../ui/dist`, `../../../hooks/dist/src`) valid after install.
// Needs `pnpm build` first (tsc -b and the UI build).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { optionalDependencies } from "./assemble-native-packages.mjs";
import { MAIN_NAME, REPOSITORY_URL } from "./package-names.mjs";

/** npm name of the product package; `vantage` is taken on npm, so it is scoped (D96). The names live in package-names.mjs. */
export const PACKAGE_NAME = MAIN_NAME;
/** Workspace packages staged inside the tarball, in `packages/` order. */
export const BUNDLED = ["cli", "core", "daemon", "hooks", "ui"];
/** Runtime files outside dist that a package reads from its own root (the daemon reads its SQL migrations at start). */
export const EXTRA_DIRS = { daemon: ["migrations"] };

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export const bundledName = (pkg) => `@vantage/${pkg}`;

export function rootManifest(version) {
  return {
    name: PACKAGE_NAME,
    version,
    description: "Local-first tracker that shows the true state of your AI-assisted work (the A2V track)",
    keywords: ["a2v", "claude-code", "ai-agents", "developer-tools"],
    type: "module",
    bin: { vantage: `node_modules/${bundledName("cli")}/dist/src/main.js` },
    files: ["README.md", "CHANGELOG.md"],
    engines: { node: ">=22.5.0" },
    // npm bundles a package only when it is also a dependency.
    dependencies: Object.fromEntries(BUNDLED.map((p) => [bundledName(p), version])),
    bundledDependencies: BUNDLED.map(bundledName),
    optionalDependencies: optionalDependencies(version),
    license: "UNLICENSED",
    repository: { type: "git", url: REPOSITORY_URL },
    homepage: `${REPOSITORY_URL}#readme`,
    bugs: { url: `${REPOSITORY_URL}/issues` },
    publishConfig: { access: "public" },
  };
}

/** Manifest of a staged workspace package: runtime fields only, no `types` condition and no dependencies. */
export function stagedManifest(pkg, source, version) {
  const exports = {};
  for (const [key, value] of Object.entries(source.exports ?? {})) {
    exports[key] = typeof value === "string" ? value : value.default;
  }
  return {
    name: bundledName(pkg),
    version,
    type: "module",
    ...(Object.keys(exports).length > 0 ? { exports } : {}),
  };
}

const keep = (src) => !/\.(map|d\.ts)$/.test(src);

export function assemble(version, outDir, { commit, root = repoRoot } = {}) {
  if (!SEMVER.test(version)) throw new Error(`bad version ${version}`);
  rmSync(outDir, { recursive: true, force: true });
  for (const pkg of BUNDLED) {
    const dist = pkg === "ui" ? join(root, "packages/ui/dist") : join(root, "packages", pkg, "dist/src");
    if (!existsSync(dist)) throw new Error(`${dist} is missing; run \`pnpm build\` first`);
    const target = join(outDir, "node_modules", "@vantage", pkg);
    cpSync(dist, pkg === "ui" ? join(target, "dist") : join(target, "dist/src"), {
      recursive: true,
      filter: keep,
    });
    for (const extra of EXTRA_DIRS[pkg] ?? []) {
      const from = join(root, "packages", pkg, extra);
      if (!existsSync(from)) throw new Error(`${from} is missing`);
      cpSync(from, join(target, extra), { recursive: true });
    }
    const source = JSON.parse(readFileSync(join(root, "packages", pkg, "package.json"), "utf8"));
    writeFileSync(
      join(target, "package.json"),
      JSON.stringify(stagedManifest(pkg, source, version), null, 2) + "\n",
    );
  }
  writeFileSync(
    join(outDir, "node_modules/@vantage/cli/build-info.json"),
    JSON.stringify({ version, ...(commit ? { commit } : {}) }, null, 2) + "\n",
  );
  for (const f of ["README.md", "CHANGELOG.md"]) {
    if (existsSync(join(root, f))) cpSync(join(root, f), join(outDir, f));
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "package.json"), JSON.stringify(rootManifest(version), null, 2) + "\n");
  return outDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, outDir, ...rest] = process.argv.slice(2);
  const i = rest.indexOf("--commit");
  console.log(assemble(version, outDir, { commit: i >= 0 ? rest[i + 1] : undefined }));
}
