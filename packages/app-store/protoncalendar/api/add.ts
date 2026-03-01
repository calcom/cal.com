import type { NextApiRequest, NextApiResponse } from "next";

import { symmetricEncrypt } from "@calcom/lib/crypto";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { metadata } from "../_metadata";
import BuildCalendarService from "../lib/CalendarService";

const log = logger.getSubLogger({ prefix: ["proton-calendar/add"] });

/** Returns an error message if the URL is not a valid Proton ICS feed, or null if valid. */
function validateProtonUrl(url: string): string | null {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        return "Invalid URL format";
    }

    if (parsedUrl.protocol !== "https:") {
        return "Only HTTPS URLs are allowed";
    }

    const allowedDomains = ["proton.me", "protonmail.com"];
    const isProtonDomain = allowedDomains.some(
        (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );

    if (!isProtonDomain) {
        log.warn("Attempted to add non-Proton URL: %s", parsedUrl.hostname);
        return "Only proton.me and protonmail.com domains are accepted";
    }

    return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        const { url } = req.body;

        if (!url || typeof url !== "string") {
            return res.status(400).json({ message: "URL is required" });
        }

        const validationError = validateProtonUrl(url);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const userId = req.session?.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
        if (!encryptionKey) {
            log.error("CALENDSO_ENCRYPTION_KEY is not configured");
            return res.status(500).json({ message: "Server configuration error" });
        }

        const user = await prisma.user.findFirstOrThrow({
            where: { id: userId },
            select: { id: true, email: true },
        });

        const data = {
            type: metadata.type,
            key: symmetricEncrypt(JSON.stringify({ url }), encryptionKey),
            userId: user.id,
            teamId: null,
            appId: metadata.slug,
            invalid: false,
            delegationCredentialId: null,
        };

        try {
            const service = BuildCalendarService({
                id: 0,
                ...data,
                user: { email: user.email },
                encryptedKey: null,
                delegationCredentialId: null,
            });

            const listedCals = await service.listCalendars();
            if (listedCals.length === 0) {
                throw new Error("Could not verify Proton Calendar feed");
            }

            await prisma.credential.create({ data });
        } catch (e) {
            log.error("Could not add Proton Calendar. Invalid ICS feed or unreachable URL.");
            return res.status(500).json({
                message: "Could not verify Proton Calendar link. Please check that the URL is a valid ICS feed.",
            });
        }

        return res.status(200).json({
            url: getInstalledAppPath({ variant: "calendar", slug: "proton-calendar" }),
        });
    }

    if (req.method === "GET") {
        return res.status(200).json({ url: "/apps/proton-calendar/setup" });
    }

    return res.status(405).json({ message: "Method not allowed" });
}
