import type { MilestoneStatus } from "@prisma/client";

export function isMilestoneLocked(status: MilestoneStatus) {
  return status === "APPROVED";
}

export function canRequestSignOff(status: MilestoneStatus) {
  return status === "DRAFT" || status === "CHANGES_REQUESTED";
}

export function statusLabel(status: MilestoneStatus) {
  return status.replaceAll("_", " ");
}

export function statusTone(status: MilestoneStatus) {
  if (status === "APPROVED") return "approved" as const;
  if (status === "IN_REVIEW") return "review" as const;
  if (status === "CHANGES_REQUESTED") return "changes" as const;
  return "draft" as const;
}
