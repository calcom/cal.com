import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import { appKeysSchema } from "../zod";
import { validateBBBServer } from "../lib/bbbapi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId } = req.query;
  const userId = req.session.user.id;

  // Validate teamId: Number(undefined) = NaN, Number("abc") = NaN, both must be rejected
  // with a 400 rather than reaching Prisma as NaN.
  const teamIdNum = teamId !== undefined ? Number(teamId) : null;
  if (teamId !== undefined && (isNaN(teamIdNum as number) || !Number.isInteger(teamIdNum))) {
    return res.status(400).json({ message: "Invalid teamId" });
  }

  // Authorization: only team admins may update team-scoped BBB credentials (prevents IDOR).
  try {
    await throwIfNotHaveAdminAccessToTeam({ teamId: teamIdNum, userId });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    throw error;
  }

  // Validate and parse input
  const parseResult = appKeysSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: "Invalid configuration",
      errors: parseResult.error.flatten().fieldErrors,
    });
  }
  const keys = parseResult.data;

  // Validate the BBB server before saving
  try {
    await validateBBBServer(keys);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Could not connect to BigBlueButton server",
    });
  }

  // Find the credential to update
  const whereClause =
    teamIdNum !== null
      ? { type: "bigbluebutton_video", teamId: teamIdNum }
      : { type: "bigbluebutton_video", userId };

  try {
    const { count } = await prisma.credential.updateMany({
      where: whereClause,
      data: { key: keys },
    });
    if (count === 0) {
      // No credential row was found — the app has not been installed yet (or
      // the wrong userId/teamId was supplied).  Returning 200 here would be a
      // silent no-op that hides the problem from the caller.
      return res.status(404).json({ message: "BigBlueButton app is not installed. Please install the app first." });
    }
    return res.status(200).json({ message: "Saved successfully" });
  } catch (error) {
    // Log a sanitized message only — do NOT log the raw error or the `keys` object,
    // as they can contain the sharedSecret.
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to save BigBlueButton credentials:", message);
    return res.status(500).json({ message: "Failed to save credentials" });
  }
}
