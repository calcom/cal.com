import type { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

// import { buildLegacyRequest } from "@lib/buildLegacyCtx";

type ResponseData = {
  message: string;
};

export async function GET(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const session = await getServerSession({ req });
  console.log(session);
  return NextResponse.json(
    { message: "Hello from Next.js!" },
    {
      // headers: {
      //   'Access-Control-Allow-Origin': '*',
      //   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      //   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      // }
    }
  );
}

// export function OPTIONS() {
//   return new NextResponse(null, {
//     status: 200,
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//     }
//   });
// }
