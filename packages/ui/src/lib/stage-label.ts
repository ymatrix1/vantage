// The short text beside a row's dots: the current stage and the one thing that matters about it.
// Pure; every input comes from the item, never from what an agent said (D3).
import type { TrackItem } from "@vantage/core/track";

type LabelInput = Pick<TrackItem, "stage" | "proofStatus" | "proofLevel" | "docsOnly"> & {
  flags: readonly unknown[];
};

const PROOF_NOTE: Record<string, string> = {
  none: "no proof yet",
  expired: "proof expired",
  failed: "proof failed",
  weak: "proof weak",
};

const name = (stage: string): string => (stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : "Unknown");

/** "Asked", "Built · no proof yet", "Built · needs you", "Proven · L1", "Built · docs only, proof not required". */
export function stageLabel(item: LabelInput): string {
  const stage = name(item.stage);
  const flagged = item.flags.length > 0;
  const docs = item.docsOnly || item.proofStatus === "not_required";
  if (item.stage === "proven") {
    const level = item.proofLevel > 0 ? `L${item.proofLevel}` : "";
    return [stage, level, flagged ? "needs you" : ""].filter(Boolean).join(" · ");
  }
  if (flagged) return `${stage} · needs you`;
  if (item.stage === "built") {
    if (docs) return `${stage} · docs only, proof not required`;
    return `${stage} · ${PROOF_NOTE[item.proofStatus] ?? "no proof yet"}`;
  }
  return stage;
}
