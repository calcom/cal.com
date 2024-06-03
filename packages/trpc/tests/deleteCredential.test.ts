import {
  writeCredentialToMockDb,
  addUsers,
  addEventTypesToDb,
  getEventTypesFromMockDb,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, test } from "vitest";

import { createContextInner } from "../server/createContext";
import { createCaller } from "../server/routers/_app";

const testUser = {
  id: 1,
  email: "test@test.com",
  username: "test-user",
};

const setupIndividualCredentialTest = async () => {
  const ctx = await createContextInner({
    locale: "en",
    session: {
      hasValidLicense: true,
      upId: "test-upId",
      user: {
        id: testUser.id,
        profile: {
          id: 1,
          upId: "profile-upid",
          username: testUser.username,
        },
      },
    },
  });

  const caller = createCaller(ctx);

  return caller;
};

const setupCredential = async (credentialInput) => {
  const exampleCredential = {
    id: 123,
    type: "test-credential",
    appId: "test-credential",
    userId: null,
    teamId: null,
  };

  const credential = { ...exampleCredential, ...credentialInput };

  await writeCredentialToMockDb(credential);

  return credential;
};

describe("deleteCredential", () => {
  describe("individual credentials", () => {
    test("Delete video credential", async () => {
      const caller = await setupIndividualCredentialTest();

      const eventTypes = await addEventTypesToDb([
        {
          userId: testUser.id,
          locations: [{ type: "integrations:zoom" }],
        },
      ]);

      console.log("🚀 ~ test ~ eventTypes:", eventTypes);
      await setupCredential({ userId: testUser.id, type: "zoom_video" });

      await addUsers([testUser]);

      await caller.viewer.deleteCredential({ id: 123 });

      const eventTypeQuery = await getEventTypesFromMockDb(eventTypes.map((eventType) => eventType.id));
      console.log("🚀 ~ test ~ eventTypeQuery:", eventTypeQuery);
    });
    test("deleteCredential", async () => {
      const caller = await setupIndividualCredentialTest();

      await setupCredential({ userId: testUser.id });

      await addUsers([testUser]);

      await caller.viewer.deleteCredential({ id: 123 });
    });
  });
});
