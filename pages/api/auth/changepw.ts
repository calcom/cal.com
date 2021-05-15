import type { NextApiRequest, NextApiResponse } from 'next';
import { hashPassword, verifyPassword } from '../../../lib/auth';
import { getSession } from 'next-auth/client';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getSession({req: req});

    if (!session) {
        res.status(401).json({message: "Not authenticated"});
        return;
    }

    const user = await prisma.user.findFirst({
        where: {
            email: session.user.email,
        },
        select: {
            id: true,
            password: true
        }
    });

    if (!user) { res.status(404).json({message: 'User not found'}); return; }

    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;
    const currentPassword = user.password;

    const passwordsMatch = await verifyPassword(oldPassword, currentPassword);

    if (!passwordsMatch) { res.status(403).json({message: 'Incorrect password'}); return; }

    const hashedPassword = await hashPassword(newPassword);

    const updateUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
        },
    });

    res.status(200).json({message: 'Password updated successfully'});
}