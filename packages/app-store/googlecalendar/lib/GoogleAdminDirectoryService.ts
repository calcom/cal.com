import type { JWT } from "googleapis-common";

export interface User {
  id: string;
  primaryEmail: string;
}

export class GoogleAdminDirectoryService {
  private auth: JWT;
  private baseUrl = "https://admin.googleapis.com/admin/directory/v1";

  constructor(auth: JWT) {
    this.auth = auth;
  }

  private async makeRequest<T>(endpoint: string, method = "GET"): Promise<T> {
    const token = await this.auth.getAccessToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Google Admin Directory API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(userId: string): Promise<User> {
    return this.makeRequest<User>(`/users/${userId}`);
  }
}
