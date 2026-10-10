import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

// Next.js API route reference: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
/** Report whether TOAB Jitsi is selected as this event type’s location. */
export default async function locationHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const sessionUserId = Number(req.session?.user?.id);
  if (!Number.isSafeInteger(sessionUserId) || sessionUserId <= 0) {
    return res.status(401).json({ message: "You must be signed in" });
  }

  const eventTypeId = Number(req.query.eventTypeId);
  if (!Number.isSafeInteger(eventTypeId) || eventTypeId <= 0) {
    return res.status(400).json({ message: "A valid eventTypeId is required" });
  }

  const eventType = await prisma.eventType.findUnique({
    where: { id: eventTypeId },
    select: { userId: true, teamId: true, locations: true },
  });
  if (!eventType) return res.status(404).json({ message: "Event type not found" });

  if (eventType.teamId) {
    await throwIfNotHaveAdminAccessToTeam({ teamId: eventType.teamId, userId: sessionUserId });
  } else if (eventType.userId !== sessionUserId) {
    return res.status(403).json({ message: "You cannot configure this event type" });
  }

  let locations: unknown[] = [];
  if (Array.isArray(eventType.locations)) locations = eventType.locations;
  const moderatorLocationEnabled = locations.some(
    (location) =>
      typeof location === "object" &&
      location !== null &&
      "type" in location &&
      location.type === "integrations:toab_jitsi"
  );

  return res.status(200).json({ moderatorLocationEnabled });
}
