import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import {getSession} from "next-auth/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const session = await getSession({req: req});
  if (!session) {
    return res.status(401).json({message: "Not authenticated"});
  }

  // DELETE /api/teams/{team}
  if (req.method === "DELETE") {
    const deleteMembership = await prisma.membership.delete({
      where: {
        userId_teamId: { userId: session.user.id, teamId: parseInt(req.query.team) }
      }
    });
    const deleteTeam = await prisma.team.delete({
      where: {
        id: parseInt(req.query.team),
      },
    });
    return res.status(204).send(null);
  }
}