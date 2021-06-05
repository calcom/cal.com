import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import createInvitationEmail from "../../../../lib/emails/invitation";
import {getSession} from "next-auth/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method !== "POST") {
    return res.status(400).json({ message: "Bad request" });
  }

  const session = await getSession({req: req});
  if (!session) {
    return res.status(401).json({message: "Not authenticated"});
  }

  const team = await prisma.team.findFirst({
    where: {
      id: parseInt(req.query.team)
    }
  });

  if (!team) {
    return res.status(404).json({message: "Unable to find team to invite user to."});
  }

  const invitee = await prisma.user.findFirst({
    where: {
      OR: [
        { username: req.body.usernameOrEmail },
        { email: req.body.usernameOrEmail }
      ]
    }
  });

  if (!invitee) {
    return res.status(404).json({message: "Missing user, currently unsupported."});
  }

  // create provisional membership
  const createMembership = await prisma.membership.create({
    data: {
      teamId: parseInt(req.query.team),
      userId: invitee.id,
      role: req.body.role,
    },
  });

  // inform user of membership by email
  if (req.body.sendEmailInvitation) {
    createInvitationEmail({
      toEmail: invitee.email,
      from: session.user.name,
      teamName: team.name
    });
  }

  res.status(201).json({});
}
