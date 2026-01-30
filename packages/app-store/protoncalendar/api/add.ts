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

        // Validate Proton domain
        const isProton = url.includes("proton.me") || url.includes("protonmail.com");
        if (!isProton) {
            logger.warn("Attempted to add non-Proton URL to Proton App", { url });
            return res.status(400).json({ message: "Invalid URL: Only 'proton.me' or 'protonmail.com' domains are allowed." });
        }

        const user = await prisma.user.findFirstOrThrow({
            where: { id: req.session?.user?.id },
            select: { id: true, email: true },
        });

        const data = {
            type: metadata.type,
            key: symmetricEncrypt(JSON.stringify({ url }), process.env.CALENDSO_ENCRYPTION_KEY || ""),
            userId: user.id,
            teamId: null,
            appId: metadata.slug,
            invalid: false,
        };

        try {
            // Verify connection before saving
            const service = BuildCalendarService({
                id: 0,
                ...data,
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
}
