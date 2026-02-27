import type { NextApiRequest, NextApiResponse } from "next";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { metadata } from "../_metadata";
import BuildCalendarService from "../lib/CalendarService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        const { url } = req.body;

        if (!url) return res.status(400).json({ message: "URL is required" });

        // SSRF protection: parse + validate hostname
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (e) {
            return res.status(400).json({ message: "Invalid URL format" });
        }

        if (parsedUrl.protocol !== "https:") {
            return res.status(400).json({ message: "Only HTTPS URLs are allowed" });
        }

        const allowedDomains = ["proton.me", "protonmail.com"];
        const isProton = allowedDomains.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain));

        if (!isProton) {
            logger.warn("Attempted to add non-Proton URL to Proton App");
            return res.status(400).json({ message: "Invalid URL: Only 'proton.me' or 'protonmail.com' domains are allowed." });
        }

        const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
        if (!encryptionKey) {
            throw new Error("Missing CALENDSO_ENCRYPTION_KEY");
        }

        const user = await prisma.user.findFirstOrThrow({
            where: { id: req.session?.user?.id },
            select: { id: true, email: true },
        });

        const data = {
            type: metadata.type,
            key: symmetricEncrypt(JSON.stringify({ url }), encryptionKey),
            userId: user.id,
            teamId: null,
            appId: metadata.slug,
            invalid: false,
        };

        try {
            const service = BuildCalendarService({
                id: 0,
                ...data,
                user: { email: user.email },
                encryptedKey: null,
                delegationCredentialId: null,
            });

            const listed = await service.listCalendars();
            if (listed.length === 0) throw new Error("Could not verify Proton Feed");

            await prisma.credential.create({ data });

        } catch (e) {
            logger.error("Could not add Proton Calendar", e);
            return res.status(500).json({ message: "Could not verify Proton Calendar link. Is it valid?" });
        }

        return res.status(200).json({ url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }) });
    }

    if (req.method === "GET") {
        return res.status(200).json({ url: "/apps/proton-calendar/setup" });
    }

    return res.status(405).json({ message: "Method not allowed" });
}
