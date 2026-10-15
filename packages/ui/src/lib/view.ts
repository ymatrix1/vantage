// The Track view state: what the toolbar controls, the URL query string and the API request all share.
// Pure, no DOM. The token is never part of this state (D75): it stays in the Authorization header.
import {
  FLAG_VALUES,
  GROUP_VALUES,
  PAGE_SIZES,
  PROOF_VALUES,
  Q_MAX,
  SINCE_VALUES,
  SORT_VALUES,
  STAGE_VALUES,
  type Facets,
  type GroupBy,
  type Order,
  type Since,
  type Sort,
} from "./contract";

export type FilterKey = "org" | "repo" | "branch" | "stage" | "proof" | "flag";
export const FILTER_KEYS: readonly FilterKey[] = ["org", "repo", "branch", "stage", "proof", "flag"];

export interface ViewState {
  q: string;
  org: string[];
  repo: string[];
  branch: string[];
  stage: string[];
  proof: string[];
  flag: string[];
  since: Since;
  /** true = only items with code edits; null = no filter. */
  hasEdits: boolean | null;
  sort: Sort;
  order: Order;
  group: GroupBy;
  page: number;
  pageSize: number;
}

export const DEFAULT_VIEW: ViewState = {
  q: "",
  org: [],
  repo: [],
  branch: [],
  stage: [],
  proof: [],
  flag: [],
  since: "7d",
  hasEdits: null,
  sort: "activity",
  order: "desc",
  group: "repo",
  page: 1,
  pageSize: 25,
};

/** The direction a sort starts in: newest, furthest and most flags first; names A to Z. */
export const defaultOrder = (s: Sort): Order => (s === "title" || s === "repo" ? "asc" : "desc");

const MAX_VALUES = 50;
const MAX_VALUE_LEN = 120;
const ALLOWED: Record<"stage" | "proof" | "flag", readonly string[]> = {
  stage: STAGE_VALUES,
  proof: PROOF_VALUES,
  flag: FLAG_VALUES,
};

const pick = <T extends string>(v: string | null, all: readonly T[], fallback: T): T =>
  all.find((a) => a === v) ?? fallback;

function list(v: string | null, key: FilterKey): string[] {
  if (!v) return [];
  const out: string[] = [];
  for (const part of v.split(",")) {
    const s = part.trim().slice(0, MAX_VALUE_LEN);
    if (!s || out.includes(s)) continue;
    const allowed = key === "org" || key === "repo" || key === "branch" ? null : ALLOWED[key];
    if (allowed && !allowed.includes(s)) continue;
    out.push(s);
    if (out.length >= MAX_VALUES) break;
  }
  return out;
}

function int(v: string | null, fallback: number): number {
  const n = v !== null && /^\d{1,6}$/.test(v) ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : fallback;
}

/** Reads a query string (anything after `?`). Unknown or invalid values fall back to the default. */
export function parseView(search: string): ViewState {
  const p = new URLSearchParams(search);
  const size = int(p.get("pageSize"), DEFAULT_VIEW.pageSize);
  const sort = pick(p.get("sort"), SORT_VALUES, DEFAULT_VIEW.sort);
  const order = pick(p.get("order"), ["asc", "desc"] as const, defaultOrder(sort));
  const he = p.get("hasEdits");
  return {
    q: (p.get("q") ?? "").trim().slice(0, Q_MAX),
    org: list(p.get("org"), "org"),
    repo: list(p.get("repo"), "repo"),
    branch: list(p.get("branch"), "branch"),
    stage: list(p.get("stage"), "stage"),
    proof: list(p.get("proof"), "proof"),
    flag: list(p.get("flag"), "flag"),
    since: pick(p.get("since"), SINCE_VALUES, DEFAULT_VIEW.since),
    hasEdits: he === "true" ? true : he === "false" ? false : null,
    sort,
    order,
    group: pick(p.get("group"), GROUP_VALUES, DEFAULT_VIEW.group),
    page: int(p.get("page"), 1),
    pageSize: PAGE_SIZES.find((s) => s === size) ?? DEFAULT_VIEW.pageSize,
  };
}

const enc = (vals: string[]): string => vals.map(encodeURIComponent).join(",");

/**
 * Builds the query string. `full` writes every parameter (the API request, so the daemon's defaults
 * can change without surprising the page); otherwise only what differs from the default (the URL).
 */
export function toQuery(s: ViewState, full = false): string {
  const parts: string[] = [];
  const add = (k: string, v: string, isDefault: boolean): void => {
    if (full || !isDefault) parts.push(`${k}=${v}`);
  };
  for (const k of FILTER_KEYS) if (s[k].length > 0) parts.push(`${k}=${enc(s[k])}`);
  if (s.q) parts.push(`q=${encodeURIComponent(s.q)}`);
  add("since", s.since, s.since === DEFAULT_VIEW.since);
  if (s.hasEdits !== null) parts.push(`hasEdits=${String(s.hasEdits)}`);
  add("sort", s.sort, s.sort === DEFAULT_VIEW.sort);
  add("order", s.order, s.order === defaultOrder(s.sort));
  add("group", s.group, s.group === DEFAULT_VIEW.group);
  if (s.page > 1) parts.push(`page=${s.page}`);
  add("pageSize", String(s.pageSize), s.pageSize === DEFAULT_VIEW.pageSize);
  return parts.join("&");
}

/** Filters that narrow the result (everything except sort, group and paging). */
export function activeFilters(s: ViewState): string[] {
  const out: string[] = [];
  if (s.q) out.push("search");
  for (const k of FILTER_KEYS) if (s[k].length > 0) out.push(k);
  if (s.since !== DEFAULT_VIEW.since) out.push("since");
  if (s.hasEdits !== null) out.push("hasEdits");
  return out;
}

/** Back to the default filters; keeps how the user sorts, groups and pages. */
export function clearFilters(s: ViewState): ViewState {
  return { ...DEFAULT_VIEW, sort: s.sort, order: s.order, group: s.group, pageSize: s.pageSize };
}

const sum = (c: Record<string, number>): number => Object.values(c).reduce((a, b) => a + b, 0);

/**
 * Which active filters, taken away on their own, would bring results back. Facets are counted without
 * their own filter, so a dimension's total is what the page would show without it.
 */
export function blockers(s: ViewState, f: Facets): { filter: string; wouldShow: number | null }[] {
  const out: { filter: string; wouldShow: number | null }[] = [];
  for (const k of FILTER_KEYS) if (s[k].length > 0) out.push({ filter: k, wouldShow: sum(f[k]) });
  if (s.hasEdits !== null) out.push({ filter: "hasEdits", wouldShow: f.hasEdits.true + f.hasEdits.false });
  if (s.q) out.push({ filter: "search", wouldShow: null });
  if (s.since !== "all") out.push({ filter: "since", wouldShow: f.age.today + f.age.week + f.age.older });
  return out;
}
