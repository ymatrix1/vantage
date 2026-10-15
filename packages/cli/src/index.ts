export type { VantageEvent } from "@vantage/core";
export { openUrl, runCli, trackUrl } from "./cli.ts";
export type { CliIo } from "./cli.ts";
export { runChecks, runDoctor } from "./doctor.ts";
export type { Check, CheckStatus } from "./doctor.ts";
export {
  MANAGED,
  mergeSettings,
  findNativeBinary,
  resolveHookCommands,
  resolvePaths,
  runAdd,
  runRemove,
  stripSettings,
} from "./install.ts";
export { formatVersion, readVersionInfo } from "./version.ts";
export type { VersionInfo } from "./version.ts";
export { GOALS, computeStats, renderStats, runStats } from "./stats.ts";
export type { Stats, StatsOptions } from "./stats.ts";
