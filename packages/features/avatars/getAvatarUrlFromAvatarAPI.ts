import process from "node:process";
export async function getAvatarUrlFromAvatarAPI(email: string): Promise<string | null> {
  if (!process.env.AVATARAPI_USERNAME || !process.env.AVATARAPI_PASSWORD) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://avatarapi.com/v2/api.aspx", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        username: process.env.AVATARAPI_USERNAME,
        password: process.env.AVATARAPI_PASSWORD,
        email,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const info = await response.json();

    if (!info.Success) {
      if (info.Error === "Not found") {
        return null;
      }
      console.warn("Avatar API error:", info.Error);
      return null;
    }
    return info.Image as string;
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn("Avatar API request timed out");
    } else {
      console.error("Avatar API request failed:", error);
    }
    return null;
  }
}
