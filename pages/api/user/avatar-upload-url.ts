import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import prisma from '../../../lib/prisma';

const {
    S3_ENDPOINT,
    S3_BUCKET_NAME,
    S3_REGION,
    S3_ACCESS_KEY,
    S3_SECRET_KEY,
} = process.env;

const allowedMimes = [
  'image/png',
  'image/jpeg',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getSession({req: req});

    if (!session) {
        res.status(401).json({message: "Not authenticated"});
        return;
    }

    // TODO: Add user ID to user session object
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

    const mime = allowedMimes.find(m => m === req.body.mime?.toString());

    if (!mime) {
        res.status(400).json({message: "file type is not allowed."});
        return;
    }

    const s3Client = new S3Client({
        endpoint: S3_ENDPOINT,
        region: S3_REGION,
        credentials: {
            accessKeyId: S3_ACCESS_KEY,
            secretAccessKey: S3_SECRET_KEY,
        },
    });

    const fileKey = `avatars/${user.id}-${Date.now()}`;

    const postData = await createPresignedPost(s3Client, {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey,
        Fields: {
            "Content-Type": mime,
            acl: "public-read",
        },
        Expires: 120, // 2Min
        Conditions: [
            ["content-length-range", 1, 1048576], // 1MB
            {"content-type": mime},
        ],
    });

    res.status(200).json({...postData, getUrl: `${postData.url}/${fileKey}`});
}
