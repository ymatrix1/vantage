// The tour text lives in one data file per language (en.ts, pt.ts) so it can be tested and translated
// (docs/specs/first-run.md#the-guided-tour). Every example in it is synthetic: invented items, no real data.

export type TourLang = "en" | "pt";

export interface TourStep {
  title: string;
  /** About 8 lines, each one idea. */
  lines: string[];
}

export interface TourText {
  /** Printed before step 1. */
  intro: string;
  /** "Step 3 of 8" with the numbers filled in. */
  stepLabel: (n: number, total: number) => string;
  /** Shown while waiting for Enter. */
  pressEnter: string;
  steps: TourStep[];
  /** Printed after the last step. */
  outro: string[];
  demo: {
    starting: string;
    /** The line that carries the URL is printed separately; this is the text before it. */
    open: string;
    fake: string;
    stop: string;
    cleaned: string;
  };
}
