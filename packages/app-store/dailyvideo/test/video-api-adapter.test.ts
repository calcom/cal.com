import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, test, beforeEach } from "vitest";

import { fetchMocker } from "../../../../setupVitest";
import DailyVideoApiAdapter from "../lib/VideoApiAdapter";

const dailyBaseUrl = "https://api.daily.co/v1";

const dailyEventResponse = {
  id: "mock-id",
  name: "dayli-room",
  api_created: true,
  privacy: "public",
  url: "https://daily.co",
  created_at: "today",
  config: {
    nbf: 0,
    exp: new Date().getTime(),
    enable_chat: true,
    enable_knocking: true,
    enable_prejoin_ui: true,
  },
};

const meetingTokenResponse = { token: "api_token" };

const expectedBodyMainFetchDefault = {
  privacy: "public",
  properties: {
    enable_prejoin_ui: true,
    enable_knocking: true,
    enable_screenshare: true,
    enable_chat: true,
    exp: Math.round(new Date().getTime() / 1000) + 60 * 60,
  },
};

const expectedBodyTokenFetch = {
  properties: { room_name: dailyEventResponse.name, exp: dailyEventResponse.config.exp, is_owner: true },
};

const expectedBodyMainFetchWithPlan = {
  ...expectedBodyMainFetchDefault,
  properties: {
    ...expectedBodyMainFetchDefault.properties,
    enable_recording: "cloud",
  },
};

const createAndUpdateResult = {
  type: "daily_video",
  id: dailyEventResponse.name,
  password: meetingTokenResponse.token,
  url: dailyEventResponse.url,
};
type CommonSetupArgs = { scalePlan?: boolean; teamPlan?: boolean; mainFetchEndpoint: string };

function setAppData(scalePlan = false) {
  prismaMock.app.findUnique.mockResolvedValue({
    keys: {
      api_key: "api_token",
      scale_plan: String(scalePlan),
    },
  });
}
async function commonSetup(args: CommonSetupArgs) {
  setAppData(args.scalePlan);
  prismaMock.membership.findFirst.mockResolvedValueOnce(Boolean(args.teamPlan));

  fetchMocker.mockOnceIf(`${dailyBaseUrl}${args.mainFetchEndpoint}`, JSON.stringify(dailyEventResponse));
  fetchMocker.mockOnceIf(`${dailyBaseUrl}/meeting-tokens`, JSON.stringify(meetingTokenResponse));
}

function assertRequestsWithoutPlan(mainFetchBody: object, tokenFetchBody: object) {
  expect(mainFetchBody).toEqual(expectedBodyMainFetchDefault);
  expect(tokenFetchBody).toEqual(expectedBodyTokenFetch);
}

function assertRequestsWithPlan(mainFetchBody: object, tokenFetchBody: object) {
  expect(mainFetchBody).toEqual(expectedBodyMainFetchWithPlan);
  expect(tokenFetchBody).toEqual(expectedBodyTokenFetch);
}

async function assertRequests(withPlan: boolean) {
  const requests = fetchMocker.requests();
  const mainRequest = await requests[0].json();
  const tokenRequest = await requests[1].json();
  if (withPlan) {
    assertRequestsWithPlan(mainRequest, tokenRequest);
  } else {
    assertRequestsWithoutPlan(mainRequest, tokenRequest);
  }
}

async function testCreateMeeting(scalePlan: boolean, teamPlan: boolean) {
  await commonSetup({ scalePlan, teamPlan, mainFetchEndpoint: "/rooms" });
  const result = await DailyVideoApiAdapter()?.createMeeting(event);
  await assertRequests(scalePlan && teamPlan);
  expect(result).toStrictEqual(createAndUpdateResult);
}

async function testUpdateMeeting(scalePlan: boolean, teamPlan: boolean) {
  await commonSetup({ scalePlan, teamPlan, mainFetchEndpoint: `/rooms/${event.uid}` });
  const result = await DailyVideoApiAdapter()?.updateMeeting(event, event);
  await assertRequests(scalePlan && teamPlan);
  expect(result).toStrictEqual(createAndUpdateResult);
}

const event = {
  uid: "MOCK_ID",
  endTime: new Date().getTime(),
  organizer: {
    id: "mockid",
  },
};

describe("Daily Video API Adapter", () => {
  describe("Create and update meeting", () => {
    describe("createMeeting", () => {
      beforeEach(() => {
        fetchMocker.mockClear();
      });

      test("should create meeting with scalePlan: true and teamPlan: true", async () => {
        await testCreateMeeting(true, true);
      });

      test("should create meeting with scalePlan: true and teamPlan: false", async () => {
        await testCreateMeeting(true, false);
      });

      test("should create meeting with scalePlan: false and teamPlan: true", async () => {
        await testCreateMeeting(false, true);
      });

      test("should create meeting with scalePlan: false and teamPlan: false", async () => {
        await testCreateMeeting(false, false);
      });
    });

    describe("updateMeeting", () => {
      beforeEach(() => {
        fetchMocker.mockClear();
      });

      test("should update meeting with scalePlan: true and teamPlan: true", async () => {
        await testUpdateMeeting(true, true);
      });

      test("should update meeting with scalePlan: true and teamPlan: false", async () => {
        await testUpdateMeeting(true, false);
      });

      test("should update meeting with scalePlan: false and teamPlan: true", async () => {
        await testUpdateMeeting(false, true);
      });

      test("should update meeting with scalePlan: false and teamPlan: false", async () => {
        await testUpdateMeeting(false, false);
      });
    });
  });

  describe("deleteMeeting", () => {
    test("should delete meeting", async () => {
      fetchMocker.mockClear();
      const mockedUid = "MOCKED_UID";
      setAppData();
      fetchMocker.mockOnceIf(`${dailyBaseUrl}/rooms/${mockedUid}`, JSON.stringify({}));
      await DailyVideoApiAdapter()?.deleteMeeting(mockedUid);
      expect(fetchMocker.requests()[0].method).toBe("DELETE");
    });
  });

  describe("getRecordings", () => {
    beforeEach(() => {
      fetchMocker.mockClear();
    });
    const mockedRoomName = "MOCKED_ROOM_NAME";

    test("should get recordings", async () => {
      const mockedResponse = {
        total_count: 1,
        data: [
          {
            id: "id",
            room_name: "room_name",
            start_ts: 1,
            status: "status",
            max_participants: 2,
            duration: 3,
            share_token: "share_token",
          },
        ],
      };
      setAppData();
      fetchMocker.mockOnceIf(
        `${dailyBaseUrl}/recordings?room_name=${mockedRoomName}`,
        JSON.stringify(mockedResponse)
      );
      const result = await DailyVideoApiAdapter()?.getRecordings?.(mockedRoomName);
      expect(result).toStrictEqual(mockedResponse);
    });

    test("should throw error", async () => {
      const mockedResponse = ["invalid data"];
      setAppData();
      fetchMocker.mockOnceIf(
        `${dailyBaseUrl}/recordings?room_name=${mockedRoomName}`,
        JSON.stringify(mockedResponse)
      );
      expect(async () => {
        await DailyVideoApiAdapter()?.getRecordings?.(mockedRoomName);
      }).rejects.toThrow(/^Something went wrong! Unable to get recording$/);
    });
  });

  describe("getRecordingDownloadLink", () => {
    beforeEach(() => {
      fetchMocker.mockClear();
    });

    const mockedRecordingId = "MOCKED_RECORDING_ID";

    test("should get recording link", async () => {
      const mockedResponse = { download_link: dailyBaseUrl };
      setAppData();
      fetchMocker.mockOnceIf(
        `${dailyBaseUrl}/recordings/${mockedRecordingId}/access-link?valid_for_secs=43200`,
        JSON.stringify(mockedResponse)
      );
      const result = await DailyVideoApiAdapter()?.getRecordingDownloadLink?.(mockedRecordingId);
      expect(result).toStrictEqual(mockedResponse);
    });

    test("should throw error", async () => {
      const mockedResponse = { invalid_key: "invalid url" };
      setAppData();
      fetchMocker.mockOnceIf(
        `${dailyBaseUrl}/recordings/${mockedRecordingId}/access-link?valid_for_secs=43200`,
        JSON.stringify(mockedResponse)
      );
      expect(async () => {
        await DailyVideoApiAdapter()?.getRecordingDownloadLink?.(mockedRecordingId);
      }).rejects.toThrow(/^Something went wrong! Unable to get recording access link$/);
    });
  });

  describe("createInstantCalVideoRoom", () => {
    test("should create a instant room", async () => {
      fetchMocker.mockClear();
      commonSetup({ mainFetchEndpoint: "/rooms" });
      const result = await DailyVideoApiAdapter()?.createInstantCalVideoRoom?.(new Date().toISOString());
      const requests = fetchMocker.requests();
      const mainRequest = await requests[0].json();
      const tokenRequest = await requests[1].json();
      expect(mainRequest).toEqual({
        ...expectedBodyMainFetchWithPlan,
        properties: { ...expectedBodyMainFetchWithPlan.properties, start_video_off: true },
      });
      expect(tokenRequest).toEqual(expectedBodyTokenFetch);
      expect(result).toStrictEqual(createAndUpdateResult);
    });
  });
});
