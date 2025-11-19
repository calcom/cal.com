import { vi } from "vitest";

export const getGoogleAppKeysModuleMock = {
  getGoogleAppKeys: vi.fn().mockResolvedValue({
    client_id: "xxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    client_secret: "xxxxxxxxxxxxxxxxxx",
    redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"],
  }),
};

vi.mock("../getGoogleAppKeys", () => getGoogleAppKeysModuleMock);
