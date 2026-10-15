#!/usr/bin/env node
// The `vantage` command.
import { createInterface } from "node:readline";
import { runCli } from "./cli.ts";

const stopSignal = new Promise<void>((resolve) => {
  process.once("SIGINT", resolve);
  process.once("SIGTERM", resolve);
});

const confirm = process.stdin.isTTY
  ? async (question: string): Promise<boolean> => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>((resolve) => rl.question(`${question} [y/N] `, resolve));
      rl.close();
      return /^y(es)?$/i.test(answer.trim());
    }
  : undefined;

const pause = process.stdin.isTTY
  ? async (prompt: string): Promise<void> => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      await new Promise<string>((resolve) => rl.question(`${prompt} `, resolve));
      rl.close();
    }
  : undefined;

const code = await runCli(process.argv.slice(2), {
  out: (l) => process.stdout.write(`${l}\n`),
  err: (l) => process.stderr.write(`${l}\n`),
  env: process.env,
  stopSignal,
  ...(confirm ? { confirm } : {}),
  ...(pause ? { pause } : {}),
});
process.exit(code);
