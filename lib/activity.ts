import { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logActivity(input: {
  projectId: string;
  actorId: string;
  type: ActivityType;
  payload?: Prisma.InputJsonValue;
}) {
  return prisma.activity.create({
    data: {
      projectId: input.projectId,
      actorId: input.actorId,
      type: input.type,
      payload: input.payload ?? {},
    },
  });
}

export function activityLabel(type: ActivityType) {
  switch (type) {
    case "PROJECT_CREATED":
      return "created the project";
    case "MEMBER_INVITED":
      return "sent an invite";
    case "ASSET_UPLOADED":
      return "uploaded an asset";
    case "VERSION_UPLOADED":
      return "uploaded a new version";
    case "COMMENT_ADDED":
      return "left feedback";
    case "COMMENT_RESOLVED":
      return "resolved a comment thread";
    case "REVIEW_REQUESTED":
      return "requested sign-off";
    case "CHANGES_REQUESTED":
      return "requested changes";
    case "MILESTONE_APPROVED":
      return "approved a milestone";
    case "MILESTONE_REOPENED":
      return "reopened a milestone";
    case "NEXT_ROUND_CREATED":
      return "started the next round";
    case "PROJECT_ARCHIVED":
      return "archived the project";
    default:
      return "updated the project";
  }
}
