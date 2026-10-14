// Words for the dots, shared by the tooltips, the accessible label and the legend so they cannot drift.
import type { DotState, TrackStage } from "@vantage/core/track";

/** Short words for a dot's tooltip and accessible label. */
export const DOT_WORDS: Record<DotState, string> = {
  done: "done",
  current: "in progress",
  no_proof: "no proof",
  needs_you: "needs you",
  skipped: "no source can measure this yet",
  not_yet: "not yet",
};

export const STATE_ORDER: readonly DotState[] = [
  "done",
  "current",
  "no_proof",
  "needs_you",
  "skipped",
  "not_yet",
];

export const STATE_LEGEND: Record<DotState, { shape: string; meaning: string }> = {
  done: { shape: "Filled", meaning: "Evidence exists." },
  current: { shape: "Ring", meaning: "This is the current stage." },
  no_proof: { shape: "Half filled, amber", meaning: "Edited, but no passing check since." },
  needs_you: { shape: "Ring with a dot", meaning: "A flag needs your look." },
  skipped: { shape: "Short dash", meaning: "No source can measure this yet." },
  not_yet: { shape: "Thin ring", meaning: "Will happen, and Vantage can measure it." },
};

export const STAGE_LEGEND: Record<TrackStage, { name: string; question: string }> = {
  asked: { name: "Asked", question: "Was this work requested?" },
  built: { name: "Built", question: "Did code change for it?" },
  proven: { name: "Proven", question: "Did a check pass after the last edit?" },
  reviewed: { name: "Reviewed", question: "Has someone else looked at it?" },
  shipped: { name: "Shipped", question: "Is it merged and released?" },
  verified: { name: "Verified", question: "Does it work in production?" },
};
