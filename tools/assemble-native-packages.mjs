// Assembles one npm package per native hook target (D72). Does not publish.
// Usage: node tools/assemble-native-packages.mjs <version> <outDir> <target>=<binary path> ...
// Writes <outDir>/hook-<target>/{package.json,bin/vantage-hook[.exe]} and <outDir>/optional-dependencies.json,
// the map the main package adds under `optionalDependencies`.
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const SCOPE = "@vantage";

/** npm `os` / `cpu` values and the Rust triple for each shipped target. */
export const TARGETS = {
  "win32-x64": { os: "win32", cpu: "x64", triple: "x86_64-pc-windows-msvc", exe: ".exe" },
  "darwin-arm64": { os: "darwin", cpu: "arm64", triple: "aarch64-apple-darwin", exe: "" },
  "darwin-x64": { os: "darwin", cpu: "x64", triple: "x86_64-apple-darwin", exe: "" },
  "linux-x64": { os: "linux", cpu: "x64", triple: "x86_64-unknown-linux-gnu", exe: "" },
  "linux-arm64": { os: "linux", cpu: "arm64", triple: "aarch64-unknown-linux-gnu", exe: "" },
};

export const packageName = (target) => `${SCOPE}/hook-${target}`;

export function manifest(target, version) {
  const t = TARGETS[target];
  if (!t) throw new Error(`unknown target ${target}`);
  return {
    name: packageName(target),
    version,
    description: `Vantage spool hook binary for ${target} (${t.triple})`,
    os: [t.os],
    cpu: [t.cpu],
    bin: { "vantage-hook": `bin/vantage-hook${t.exe}` },
    files: ["bin"],
    license: "UNLICENSED",
    // npm provenance checks that this matches the repository the build ran in.
    repository: {
      type: "git",
      url: "git+https://github.com/ymatrix1/vantage.git",
      directory: "packages/hooks-native",
    },
    publishConfig: { access: "public" },
  };
}

export function optionalDependencies(version) {
  return Object.fromEntries(Object.keys(TARGETS).map((t) => [packageName(t), version]));
}

export function assemble(version, outDir, binaries) {
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`bad version ${version}`);
  for (const target of Object.keys(TARGETS)) {
    if (!binaries[target]) throw new Error(`missing binary for ${target}`);
  }
  const dirs = [];
  for (const [target, binary] of Object.entries(binaries)) {
    const m = manifest(target, version);
    const dir = join(outDir, `hook-${target}`);
    mkdirSync(join(dir, "bin"), { recursive: true });
    copyFileSync(binary, join(dir, m.bin["vantage-hook"]));
    writeFileSync(join(dir, "package.json"), JSON.stringify(m, null, 2) + "\n");
    dirs.push(dir);
  }
  writeFileSync(
    join(outDir, "optional-dependencies.json"),
    JSON.stringify(optionalDependencies(version), null, 2) + "\n",
  );
  return dirs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [version, outDir, ...pairs] = process.argv.slice(2);
  const binaries = Object.fromEntries(pairs.map((p) => p.split("=")));
  console.log(assemble(version, outDir, binaries).join("\n"));
}
