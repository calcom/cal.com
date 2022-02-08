import { NextApiRequest, NextApiResponse } from "next";

import { hashPassword } from "@lib/auth";
import prisma from "@lib/prisma";
import slugify from "@lib/slugify";

import { IdentityProvider } from ".prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return;
  }

  const data = req.body;
  const { email, password } = data;
  const username = slugify(data.username);
  const userEmail = email.toLowerCase();

  if (!username) {
    res.status(422).json({ message: "Invalid username" });
    return;
  }

  if (!userEmail || !userEmail.includes("@")) {
    res.status(422).json({ message: "Invalid email" });
    return;
  }

  if (!password || password.trim().length < 7) {
    res.status(422).json({ message: "Invalid input - password should be at least 7 characters long." });
    return;
  }

  // There is actually an existingUser if username matches
  // OR if email matches and both username and password are set
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        {
          AND: [{ email: userEmail }, { password: { not: null } }, { username: { not: null } }],
        },
      ],
    },
  });

  if (existingUser) {
    const message: string =
      existingUser.email !== userEmail ? "Username already taken" : "Email address is already registered";

    return res.status(409).json({ message });
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      username,
      password: hashedPassword,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
    },
    create: {
      username,
      email: userEmail,
      password: hashedPassword,
      identityProvider: IdentityProvider.CAL,
    },
  });

  // If user has been invitedTo a team, we accept the membership
  if (user.invitedTo) {
    await prisma.membership.update({
      where: {
        userId_teamId: { userId: user.id, teamId: user.invitedTo },
      },
      data: {
        accepted: true,
      },
    });
  }

  res.status(201).json({ message: "Created user" });
}
