// `vantage tour`. Hermetic: synthetic text and data, temp dirs, ephemeral ports, loopback only. The demo
// tests prove it never reads or writes the real VANTAGE_HOME (a temp folder stands in for it).
import { createHash } from "node:crypto";
import { request } from "node:http";
import { createServer } from "node:net";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Store, itemSessionCounts, listItems } from "@vantage/daemon";
import { runCli, trackUrl } from "../src/cli.ts";
import { DEMO_ITEMS, DEMO_PREFIX, removeDemoHome, seedDemoHome } from "../src/tour/demo.ts";
import { en } from "../src/tour/en.ts";
import { pt } from "../src/tour/pt.ts";
import { TOURS, TOUR_STEPS, detectLang, runTour } from "../src/tour/tour.ts";

const count = (xs: string[], x: string): number => xs.filter((y) => y === x).length;

/** A promise and the function that resolves it, for the stop signal. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  const box: { resolve: () => void } = { resolve: () => undefined };
  const promise = new Promise<void>((r) => {
    box.resolve = r;
  });
  return { promise, resolve: () => box.resolve() };
}

let base = "";
let realHome = "";
let savedTemp: Record<string, string | undefined> = {};

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), "vantage-tour-test-"));
  realHome = join(base, "real-home");
  mkdirSync(join(realHome, "spool"), { recursive: true });
  writeFileSync(join(realHome, "sentinel.txt"), "real data, must stay as it is");
  // Demo homes are created under the temp dir; point it at a folder we can inspect.
  savedTemp = { TMP: process.env["TMP"], TEMP: process.env["TEMP"], TMPDIR: process.env["TMPDIR"] };
  mkdirSync(join(base, "tmp"));
  for (const k of ["TMP", "TEMP", "TMPDIR"]) process.env[k] = join(base, "tmp");
});
afterEach(() => {
  for (const [k, v] of Object.entries(savedTemp)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(base, { recursive: true, force: true });
});

const run = async (
  args: string[],
  env: NodeJS.ProcessEnv = { LANG: "en_US.UTF-8" },
  extra: { pause?: (p: string) => Promise<void>; stopSignal?: Promise<void> } = {},
): Promise<{ code: number; out: string[]; err: string[] }> => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runTour(
    args,
    { out: (l) => out.push(l), err: (l) => err.push(l), env, ...extra },
    { uiDir: undefined, url: trackUrl },
  );
  return { code, out, err };
};

describe("the tour text", () => {
  it("has the same eight steps in both languages", () => {
    expect(TOUR_STEPS).toBe(8);
    expect(en.steps).toHaveLength(8);
    expect(pt.steps).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      for (const t of [en, pt]) {
        const s = t.steps[i];
        expect(s?.title.length).toBeGreaterThan(3);
        expect(s?.lines.length).toBeGreaterThanOrEqual(5);
        expect(s?.lines.length).toBeLessThanOrEqual(9);
      }
    }
  });

  it("covers the required content in both languages", () => {
    for (const t of [en, pt]) {
      const all = t.steps.map((s) => s.lines.join("\n"));
      expect(all[1]).toContain("Asked → Built → Proven → Reviewed → Shipped → Verified");
      expect(all[3]).toContain("pnpm test || true");
      for (const cmd of ["start", "open", "doctor", "stats", "add", "remove"])
        expect(all[6]).toContain(`vantage ${cmd}`);
      expect(all[7]).toContain("~/.vantage");
      expect(all[7]).toContain("vantage uninstall");
    }
  });

  it("uses only invented names", () => {
    const text = JSON.stringify([en, pt]);
    expect(text).not.toMatch(/yuri|ymatrix|flip\.to|@[a-z]+\.(com|org)/i);
  });
});

describe("vantage tour", () => {
  it("--no-pause prints every step and the outro without waiting", async () => {
    let pauses = 0;
    const r = await run(["--no-pause", "--lang", "en"], {}, { pause: async () => void pauses++ });
    expect(r.code).toBe(0);
    expect(pauses).toBe(0);
    const text = r.out.join("\n");
    for (let n = 1; n <= 8; n++) expect(text).toContain(`Step ${n} of 8: ${en.steps[n - 1]?.title}`);
    expect(text).toContain("vantage tour --demo");
  });

  it("waits for Enter between steps when there is a terminal", async () => {
    const prompts: string[] = [];
    const r = await run(["--lang", "en"], {}, { pause: async (p) => void prompts.push(p) });
    expect(r.code).toBe(0);
    expect(prompts).toHaveLength(7);
    expect(prompts[0]).toBe(en.pressEnter);
  });

  it("prints everything when there is no terminal (no pause function)", async () => {
    const r = await run(["--lang", "pt"]);
    expect(r.out.join("\n")).toContain("Passo 8 de 8");
  });

  it("--step N starts at N", async () => {
    const r = await run(["--no-pause", "--lang", "en", "--step", "7"]);
    const text = r.out.join("\n");
    expect(text).not.toContain("Step 6 of 8");
    expect(text).toContain("Step 7 of 8");
    expect(text).toContain("Step 8 of 8");
    expect((await run(["--step", "9"])).code).toBe(2);
    expect((await run(["--step", "0"])).code).toBe(2);
    expect((await run(["--step", "x"])).code).toBe(2);
  });

  it("--lang picks the language; the default follows the locale", async () => {
    expect((await run(["--no-pause", "--lang", "pt"])).out.join("\n")).toContain("Passo 1 de 8");
    expect((await run(["--no-pause"], { LANG: "pt_BR.UTF-8" })).out.join("\n")).toContain("Passo 1 de 8");
    expect(
      (await run(["--no-pause"], { LC_ALL: "en_GB.UTF-8", LANG: "pt_BR.UTF-8" })).out.join("\n"),
    ).toContain("Step 1 of 8");
    expect(detectLang({ LANG: "pt_PT" })).toBe("pt");
    expect(detectLang({ LANG: "de_DE" })).toBe("en");
    expect((await run(["--lang", "fr"])).code).toBe(2);
    expect(Object.keys(TOURS)).toEqual(["en", "pt"]);
  });

  it("rejects unknown options", async () => {
    const r = await run(["--bogus"]);
    expect(r.code).toBe(2);
    expect(r.err.join("\n")).toContain("Usage: vantage tour");
  });

  it("is reachable from the CLI and writes nothing to the home", async () => {
    const before = readdirSync(realHome);
    const out: string[] = [];
    const code = await runCli(["tour", "--no-pause", "--lang", "en"], {
      out: (l) => out.push(l),
      err: () => undefined,
      env: { VANTAGE_HOME: realHome },
    });
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("Step 1 of 8");
    expect(readdirSync(realHome)).toEqual(before);
  });
});

describe("the demo store", () => {
  it("holds 12 invented items covering every stage and the required flags", () => {
    const home = join(base, "seed");
    seedDemoHome(home);
    const store = new Store(join(home, "vantage.db"));
    try {
      const items = listItems(store);
      expect(items).toHaveLength(12);
      expect(DEMO_ITEMS).toHaveLength(12);
      const by = <T>(f: (i: (typeof items)[number]) => T): T[] => items.map(f);
      const stages = by((i) => i.stage);
      expect({
        asked: count(stages, "asked"),
        built: count(stages, "built"),
        proven: count(stages, "proven"),
      }).toEqual({
        asked: 2,
        built: 8,
        proven: 2,
      });
      const flags = items.flatMap((i) => i.flags.map((f) => f.kind));
      expect(count(flags, "thrashing")).toBe(1);
      expect(count(flags, "unproven_claim")).toBe(1);
      expect(count(flags, "forgotten")).toBe(1);
      expect(items.filter((i) => i.proofStatus === "expired")).toHaveLength(1);
      expect(items.filter((i) => i.docsOnly)).toHaveLength(1);
      expect(items.filter((i) => i.proofLevel === 2)).toHaveLength(1);
      // The derived-session group: three sessions on one item.
      const group = items.find((i) => i.itemKey === "session:demo-s11a");
      const counts = itemSessionCounts(store, "session:demo-s11a").get("session:demo-s11a");
      expect(group?.title).toBe("Tidy the demo guide page");
      expect(counts?.sessionCount).toBe(3);
      expect(counts?.derivedCount).toBe(2);
      // A session with no ticket or branch gets the fallback title.
      expect(items.some((i) => i.itemKey === "session:demo-s12" && i.titleSource !== "anchor")).toBe(true);
    } finally {
      store.close();
    }
  });

  it("contains no real names: only demo repos, demo sessions and invented titles", () => {
    const home = join(base, "seed2");
    seedDemoHome(home);
    const store = new Store(join(home, "vantage.db"));
    try {
      const events = store.db.prepare("SELECT payload_json, session_id FROM events").all();
      expect(events.length).toBeGreaterThan(20);
      const payloads = events.map((e) => {
        const p: Record<string, unknown> = JSON.parse(String(e["payload_json"]));
        expect(String(e["session_id"])).toMatch(/^demo-s\d+[abc]?$/);
        // Paths point into the temp demo home (which holds the machine's temp path); check the rest of each.
        for (const k of ["cwd", "path"]) {
          const v = p[k];
          if (typeof v !== "string") continue;
          expect(v.startsWith(home)).toBe(true);
          p[k] = v.slice(home.length);
        }
        expect(typeof p["cwd"] === "string" ? p["cwd"] : "/demo-api").toMatch(/demo-(shop|api|docs)$/);
        return p;
      });
      const titles = store.db.prepare("SELECT title FROM session_titles").all();
      const items = listItems(store);
      const dump = JSON.stringify([payloads, titles, items]);
      expect(dump).not.toMatch(/yuri|ymatrix|flip|Users|\/home\//i);
      for (const i of items)
        expect(i.repo === null || i.repo.startsWith("github.com/demo-org/demo-")).toBe(true);
    } finally {
      store.close();
    }
  });
});

const demoDirs = (): string[] => readdirSync(join(base, "tmp")).filter((n) => n.startsWith(DEMO_PREFIX));
const hashTree = (dir: string): string => {
  const h = createHash("sha256");
  const walk = (d: string): void => {
    for (const n of readdirSync(d).toSorted()) {
      const p = join(d, n);
      h.update(p.slice(dir.length));
      if (statSync(p).isDirectory()) walk(p);
      else h.update(readFileSync(p));
    }
  };
  walk(dir);
  return h.digest("hex");
};

function get(port: number, path: string, token: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path,
        headers: { host: `127.0.0.1:${port}`, authorization: `Bearer ${token}` },
      },
      (res) => {
        let body = "";
        res.on("data", (c: Buffer) => (body += c.toString()));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("vantage tour --demo", () => {
  it("serves the synthetic home on a free port, leaves the real home alone, and cleans up on exit", async () => {
    const hashBefore = hashTree(realHome);
    const listingBefore = readdirSync(realHome).toSorted();
    const { promise: stopSignal, resolve: stop } = deferred();
    const out: string[] = [];
    // The real environment is hostile on purpose: the demo must ignore all three of these.
    const env = {
      VANTAGE_HOME: realHome,
      VANTAGE_REPOS: join(base, "real-repo"),
      VANTAGE_PROJECTS_DIR: join(base, "real-projects"),
      LANG: "en_US.UTF-8",
    };
    const done = runTour(
      ["--demo"],
      { out: (l) => out.push(l), err: () => undefined, env, stopSignal },
      { uiDir: undefined, url: trackUrl },
    );
    const urlLine = await waitFor(() => out.find((l) => l.startsWith("http://127.0.0.1:")));
    const m = /^http:\/\/127\.0\.0\.1:(\d+)\/#token=([0-9a-f]+)$/.exec(urlLine);
    expect(m).not.toBeNull();
    const port = Number(m?.[1]);
    const token = String(m?.[2]);
    expect(port).toBeGreaterThan(0);
    expect(port).not.toBe(4317);
    // The token is in the fragment only; the live page shows the 12 invented items.
    expect(urlLine).not.toContain("?");
    const dirs = demoDirs();
    expect(dirs).toHaveLength(1);
    const track = await get(port, "/api/track", token);
    expect(track.status).toBe(200);
    expect(track.body).toContain("github.com/demo-org/demo-api");
    expect(JSON.parse(track.body)).toBeTruthy();
    expect(out.join("\n")).toContain("Everything in it is invented");

    stop();
    expect(await done).toBe(0);
    // Cleanup on exit: the temp home is gone, the port is free, the real home is byte-identical.
    expect(demoDirs()).toEqual([]);
    expect(out.at(-1)).toBe(en.demo.cleaned);
    await expect(get(port, "/api/track", token)).rejects.toBeTruthy();
    expect(readdirSync(realHome).toSorted()).toEqual(listingBefore);
    expect(hashTree(realHome)).toBe(hashBefore);
    expect(existsSync(join(base, "real-repo"))).toBe(false);
    expect(existsSync(join(base, "real-projects"))).toBe(false);
  });

  it("rejects a bad port without creating anything", async () => {
    for (const p of ["abc", "-1", "70000", "1.5"]) {
      const r = await run(["--demo", "--port", p]);
      expect(r.code).toBe(2);
      expect(r.err.join("\n")).toContain("Not a valid port");
    }
    expect(demoDirs()).toEqual([]);
  });

  it("reports a port in use and still deletes its temp files", async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
    const addr = blocker.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    try {
      const r = await run(["--demo", "--port", String(port)]);
      expect(r.code).toBe(1);
      expect(r.err.join("\n")).toContain(`Port ${port} is in use`);
      expect(demoDirs()).toEqual([]);
    } finally {
      await new Promise<void>((resolve) => blocker.close(() => resolve()));
    }
  });

  it("removeDemoHome only deletes demo folders directly inside the temp dir", () => {
    const stranger = join(base, "tmp", "not-a-demo");
    mkdirSync(stranger);
    expect(removeDemoHome(stranger)).toBe(false);
    expect(removeDemoHome(realHome)).toBe(false);
    expect(existsSync(join(realHome, "sentinel.txt"))).toBe(true);
    const mine = join(base, "tmp", `${DEMO_PREFIX}x`);
    mkdirSync(mine);
    expect(removeDemoHome(mine)).toBe(true);
    expect(existsSync(mine)).toBe(false);
  });

  it("prints the demo text in Portuguese with --lang pt", async () => {
    const { promise: stopSignal, resolve: stop } = deferred();
    const out: string[] = [];
    const done = runTour(
      ["--demo", "--lang", "pt"],
      { out: (l) => out.push(l), err: () => undefined, env: {}, stopSignal },
      { uiDir: undefined, url: trackUrl },
    );
    await waitFor(() => out.find((l) => l.startsWith("http://127.0.0.1:")));
    stop();
    expect(await done).toBe(0);
    expect(out.join("\n")).toContain("Tudo nela é inventado");
  });
});

async function waitFor<T>(find: () => T | undefined, ms = 8000): Promise<T> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = find();
    if (v !== undefined) return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("timed out");
}
