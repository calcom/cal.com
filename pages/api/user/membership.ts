import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getSession } from "next-auth/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const session = await getSession({req: req});
  if (!session) {
    return res.status(401).json({message: "Not authenticated"});
  }

  if (req.method === "GET") {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: session.user.id,
      }
    });

    const teams = await prisma.team.findMany({
      where: {
        id: {
          in: memberships.map(membership => membership.teamId),
        }
      }
    });

    return res.status(200).json({
      membership: memberships.map((membership) => ({
        role: membership.accepted ? membership.role : 'INVITEE',
        ...teams.find(team => team.id === membership.teamId)
      }))
    });
  }

  if (!req.body.teamId) {
    return res.status(400).json({ message: "Bad request" });
  }

  // Leave team or decline membership invite of current user
  if (req.method === "DELETE") {
    const memberships = await prisma.membership.delete({
      where: {
        userId_teamId: { userId: session.user.id, teamId: req.body.teamId }
      }
    });
    return res.status(204).send(null);
  }

  // Accept team invitation
  if (req.method === "PATCH") {
    const memberships = await prisma.membership.update({
      where: {
        userId_teamId: { userId: session.user.id, teamId: req.body.teamId }
      },
      data: {
        accepted: true
      }
    });

    return res.status(204).send(null);
  }
}