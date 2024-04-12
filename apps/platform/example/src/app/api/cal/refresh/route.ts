import { db } from "prisma/client";
import { env } from "~/env";

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  const authorizationHeader = request.headers.get("Authorization");
  const token = authorizationHeader?.replace("Bearer ", "");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const calToken = await db.calToken.findUnique({
      where: { calAccessToken: token },
      include: { user: true },
    });
    if (!calToken?.user) {
      console.error(`Unable to refresh the user token for the access token '${token}':
        No user found with the token`);
      return new Response("Not Found", { status: 404 });
    }

    /** [@calcom] Make a POST request to calcom/atoms' /oatuh/<client_id>/refresh endpoint to retrieve a fresh token */
    const url = `${env.NEXT_PUBLIC_CAL_API_URL}/oauth/${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}/refresh`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cal-secret-key": env.CAL_SECRET,
        origin:
          env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : // TODO: Replace this after deployment
              "https://platform.cal.com",
      },
      body: JSON.stringify({
        refreshToken: calToken.calRefreshToken,
      }),
    });

    if (!response.ok) {
      console.error(
        `Unable to refresh the user token for user with id '${calToken.user.id}':
        Invalid response to ${url}
        
        Response text:
        ${await response.text()}`,
      );
      return new Response("Bad Request", { status: 400 });
    }

    const body = (await response.json()) as {
      data: { accessToken: string; refreshToken: string };
    };

    // update the user's token in our database:
    const updated = await db.user.update({
      where: { id: calToken.user.id },
      data: {
        calToken: {
          update: {
            calAccessToken: body.data.accessToken,
            calRefreshToken: body.data.refreshToken,
          },
        },
      },
      include: { calToken: true },
    });

    /** [@calcom] You have to return the accessToken back to calcom/atoms api for future refresh requests. */
    return new Response(JSON.stringify({ accessToken: updated.calToken?.calAccessToken }), {
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
