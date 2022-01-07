import crypto from "crypto";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";
import { defaultAvatarSrc } from "@lib/profile";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  //   console.log("req=>", req.url);
  const username = req.url?.substring(1, req.url.lastIndexOf("/"));
  console.log("username=>", username);
  const user = await prisma.user.findUnique({
    where: {
      username: username,
    },
    select: {
      avatar: true,
      email: true,
    },
  });

  const emailMd5 = crypto.createHash("md5").update(user?.email).digest("hex");
  // Add support for empty req.body.avatar (gravatar)
  const img = user?.avatar || defaultAvatarSrc({ md5: emailMd5 });
  //   console.log("sess=>", user);
  const decoded = img.toString().replace("data:image/png;base64,", "").replace("data:image/jpeg;base64,", "");
  const imageResp = Buffer.from(decoded, "base64");
  res.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": imageResp.length,
  });
  res.end(imageResp);
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findUnique({
    where: {
      username: session.user.username,
    },
    select: {
      avatar: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }

  return {
    props: {
      user: {
        ...user,
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
    },
  };
}
