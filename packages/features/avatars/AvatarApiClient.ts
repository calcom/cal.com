import process from "node:process";
export class AvatarApiClient {
  private username: string;
  private password: string;
  private timeoutMs: number;

  constructor({
    username,
    password,
    timeoutMs = 10_000,
  }: {
    username: string;
    password: string;
    timeoutMs?: number;
  }) {
    this.username = username;
    this.password = password;
    this.timeoutMs = timeoutMs;
  }

  async getImageUrl(email: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch("https://avatarapi.com/v2/api.aspx", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
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

  static fromEnv(): AvatarApiClient | null {
    const username = process.env.AVATARAPI_USERNAME;
    const password = process.env.AVATARAPI_PASSWORD;

    if (!username || !password) {
      return null;
    }

    return new AvatarApiClient({ username, password });
  }
}
