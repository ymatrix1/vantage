#!/usr/bin/env node
// The `vantage` command.
import { runCli } from "./cli.ts";

const stopSignal = new Promise<void>((resolve) => {
  process.once("SIGINT", resolve);
  process.once("SIGTERM", resolve);
});

const code = await runCli(process.argv.slice(2), {
  out: (l) => process.stdout.write(`${l}\n`),
  err: (l) => process.stderr.write(`${l}\n`),
  env: process.env,
  stopSignal,
});
process.exit(code);
