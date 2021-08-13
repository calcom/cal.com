import type { NextApiRequest, NextApiResponse } from "next";

const client_id = process.env.ZOOM_CLIENT_ID;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addIntegration = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  // Check valid method
  if (req.method !== "GET") res.status(405).json({});

  const { assUserId, coachId, isCoachUser } = req.query;

  // console.log("\n query =", req.query);

  const redirectUri = encodeURI(
    `${process.env.BASE_URL}/api/amili/integration/zoomvideo/callback?info=${assUserId}*${coachId}*${isCoachUser}`
  );
  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirectUri}`;

  //Use publishable URL for testing
  // const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=a6cVrnc3RGi0A9BdR9msQg&redirect_uri=${redirectUri}`;

  return res.status(200).json({ url: authUrl });
};

export default addIntegration;
