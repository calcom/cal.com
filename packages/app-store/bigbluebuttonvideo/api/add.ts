import type { Prisma } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { throwIfNotHaveAdminAccessToTeam } from "@calcom/app-store/_utils/throwIfNotHaveAdminAccessToTeam";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { bbbCredentialKeySchema } from "../zod";
import { callBbb } from "../lib/bbbClient";

/**
 * BigBlueButton 安装 handler
 * 通过 POST 接收 serverUrl 和 sharedSecret，
 * 调用 BBB getMeetings API 验证凭证有效性，
 * 验证通过后对称加密存储并重定向到 setup form
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const { teamId } = req.query;

  // 验证 teamId 参数类型安全
  const parsedTeamId = teamId
    ? (() => {
        const n = Number(teamId);
        return Number.isInteger(n) && n > 0 ? n : null;
      })()
    : null;

  await throwIfNotHaveAdminAccessToTeam({
    teamId: parsedTeamId,
    userId: req.session.user.id,
  });

  const installForObject = parsedTeamId
    ? { teamId: parsedTeamId }
    : { userId: req.session.user.id };

  const appType = "bigbluebutton_video";

  try {
    // 只允许 POST 方法提交凭证
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    // 验证请求体中的凭证参数
    const parseResult = bbbCredentialKeySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: `Invalid request body: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
      });
    }

    const { serverUrl, sharedSecret } = parseResult.data;

    // 通过调用 getMeetings API 验证凭证有效性
    try {
      await callBbb(serverUrl, "getMeetings", "", sharedSecret);
    } catch (bbbError) {
      return res.status(400).json({
        message: `BigBlueButton credential validation failed: ${bbbError instanceof Error ? bbbError.message : "Unknown error"}`,
      });
    }

    // 检查是否已安装
    const alreadyInstalled = await prisma.credential.findFirst({
      where: {
        type: appType,
        ...installForObject,
      },
    });
    if (alreadyInstalled) {
      throw new Error("Already installed");
    }

    // 加密凭证后存储
    const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return res.status(500).json({
        message: "CALENDSO_ENCRYPTION_KEY environment variable is not set.",
      });
    }

    const encryptedKey = symmetricEncrypt(
      JSON.stringify({ serverUrl, sharedSecret }),
      encryptionKey
    );

    const installation = await prisma.credential.create({
      data: {
        type: appType,
        key: encryptedKey as unknown as Prisma.JsonValue,
        ...installForObject,
        appId: "bigbluebutton",
      },
    });

    if (!installation) {
      throw new Error("Unable to create user credential for bigbluebuttonvideo");
    }
  } catch (error: unknown) {
    const httpError = getServerErrorFromUnknown(error);
    return res.status(httpError.statusCode).json({ message: httpError.message });
  }

  return res
    .status(200)
    .json({
      url: getInstalledAppPath({ variant: "conferencing", slug: "bigbluebutton" }),
    });
}