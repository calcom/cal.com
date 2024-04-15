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
    const calAccount = await db.calAccount.findUnique({
      where: { accessToken: token },
      include: { user: true },
    });
    if (!calAccount?.user) {
      console.error(`Unable to refresh the user token for the access token '${token}':
        No user found with the token`);
      return new Response("Not Found", { status: 404 });
    }

    /** [@calcom] Make a POST request to calcom/atoms' /oauth/<client_id>/refresh endpoint to retrieve a fresh token 
     * ☝️ This endpoint is /oauth/ and not /oauth-clients/ so it's different from the `/force-refresh`
    */
    const url = `${env.NEXT_PUBLIC_CAL_API_URL}/oauth/${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}/refresh`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cal-secret-key": env.CAL_SECRET,
        origin:
          env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : // TODO: Replace this after deployment
              "https://platform.cal.dev",
      },
      body: JSON.stringify({
        refreshToken: calAccount.refreshToken,
      }),
    };
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(
        `Unable to refresh the user token for user with id '${calAccount.user.id}': Invalid response from Cal after attempting to refresh the token.
        
        -- REQUEST DETAILS --
        Endpoint URL: ${url}

        Options: ${JSON.stringify(options)}

        -- RESPONSE DETAILS --
        Text:
        ${await response.text()}`,
      );
      return new Response("Bad Request", { status: 400 });
    }

    const body = (await response.json()) as {
      data: { accessToken: string; refreshToken: string };
    };

    // update the user's token in our database:
    const updated = await db.user.update({
      where: { id: calAccount.user.id },
      data: {
        calAccount: {
          update: {
            accessToken: body.data.accessToken,
            refreshToken: body.data.refreshToken,
          },
        },
      },
      include: { calAccount: true },
    });

    /** [@calcom] You have to return the accessToken back to calcom/atoms api for future refresh requests. */
    return new Response(JSON.stringify({ accessToken: updated.calAccount?.accessToken }), {
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
