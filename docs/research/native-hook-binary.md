# Research: native hook binary

> **Bean:** `vantage-xex6`. **Measured:** 2026-10-14 on the dev laptop (Windows 11, Node 24.6, Go 1.25.1, Rust 1.91.0). Numbers only; the spike code is in [tools/spike-native-hook](../../tools/spike-native-hook/README.md).

## Question

Built JS leaves the spool hook at a median 95 to 99 ms and p95 130 ms (D67), over the 100 ms budget (D21) at p95. Is a native binary worth a toolchain and per-OS builds, given the npm install of D63 (Q28)?

## Answer

**Yes, a native hook is the only option that clears the budget, and Rust is the better fit: same speed as Go, 13 times smaller.** Both are about 3 times faster than built JS at the median and at p95 52 ms or less in all four runs.

## Measurement

Setup: 3 warm-ups, then 40 runs per launcher, interleaved (every round runs all four), 1 spawn per run with a 4-field JSON object on stdin, spool on local disk (`VANTAGE_HOME` in the temp dir), release flags. Four full runs; ranges below. Run 3 had a busier machine (control median rose to 100 ms), so read it as a bound, not as the typical case.

| Launcher | Median (4 runs) | p95 (4 runs) | Size |
|---|---|---|---|
| `node -e ''` (floor) | 77.5, 83.3, 100.4, 80.8 ms | 97.1, 106.1, 123.7, 107.8 ms | n/a |
| `node dist/src/bin.js` (control) | 91.2, 98.2, 118.8, 100.8 ms | 122.1, 133.9, 146.9, 118.4 ms | n/a |
| Go (`-ldflags="-s -w"`) | 27.2, 28.7, 37.0, 30.3 ms | 39.5, 38.8, 48.1, 46.8 ms | 2.14 MB |
| Rust (`opt-level=s`, LTO, `panic=abort`, `strip`, `serde_json`) | 26.1, 28.3, 32.7, 29.1 ms | 43.8, 46.8, 44.8, 51.9 ms | 0.16 MB |

Go and Rust are within noise of each other (median gap 0.3 to 4.3 ms, p95 gap 7 ms or less either way). Both match the Go spike recorded in D67 (median 32 to 33 ms, p95 41 to 47 ms).

Contract check (all four launchers, 129 spooled lines): every line parses with `v` 1, an ISO `receivedAt` and the hook object; the inputs `not json`, `[1]` and empty stdin exit 0 and write nothing; an unwritable spool directory exits 0.

## Distribution

Not measured; this is the design, using the `optionalDependencies` pattern that esbuild, swc and Biome use.

| Option | Keeps `npx` (D63) | Package size to the user | Windows signing and antivirus | Installer registration |
|---|---|---|---|---|
| **npm per-OS optional packages** (`@vantage/hook-win32-x64`, `-darwin-arm64`, `-linux-x64`, ...; each with `os` and `cpu` fields) | Yes | One platform's binary: 0.16 MB (Rust) or 2.14 MB (Go) | Files written by npm carry no download mark, so SmartScreen's reputation prompt is not expected; an unsigned new `.exe` can still get a first-run antivirus scan and a heuristic flag | Installer resolves the path with `require.resolve("@vantage/hook-<os>-<cpu>/package.json")` and writes the absolute path into the hook command |
| Download on first run | Yes | Same | A downloaded file carries a mark, so SmartScreen applies; needs a signature and a hosted release plus checksum verification | Installer downloads, verifies, stores under `~/.vantage/bin/`, registers that path |
| Build from source | Needs Rust or Go on the user's machine | Toolchain, not binary | Locally built files have no reputation; no mark | Installer runs `cargo build` and registers the output; fails on machines without the toolchain |

Five targets cost about 0.8 MB of registry space in Rust (about 10.7 MB in Go); each user downloads one. A fallback keeps the product working if the optional package is missing: the installer registers `node dist/src/bin.js` (D67) when no native package resolves.

## Not verified

- Windows Defender and SmartScreen behavior of an unsigned Rust binary after npm install: not tested.
- Code signing cost and process: not researched.
- macOS and Linux timings: only Windows was measured.
- Build time of per-OS CI: not measured (local Rust release build with a cold cache: about 30 s).
