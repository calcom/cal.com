// eslint-disable-next-line @typescript-eslint/no-var-requires
// const mock = require('mock-require');
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const fs = require('fs')
// const originalReadFileSync = fs.readFileSync
// const originalExistsSync = fs.existsSync
// mock('fs', {
// 	...fs,
// 	existsSync: function (fileName){
// 		if (fileName.includes('next-i18next.config.js')) {
// 			return true
// 		}
// 		return originalExistsSync.apply(this, [].slice.call(arguments))
// 	},
// 	readFileSync: function (){
// 		console.log(arguments)
// 		return originalReadFileSync.apply(this, [].slice.call(arguments))
// 	}
// })
// mock(path.resolve('next-i18next.config.js'), )
import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { describe, test, expect, vi } from "vitest";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: () => {
    return (key: string) => key;
  },
}));

describe("handleNewBooking", () => {
  describe("Called by Frontend", () => {
    test("Basic test", async () => {
      const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
      const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
        method: "POST",
        body: {
          responses: {
            email: "d@e.com",
            name: "d",
            location: { optionValue: "", value: "integrations:daily" },
          },
          start: "2023-06-06T04:15:00Z",
          end: "2023-06-06T04:30:00Z",
          eventTypeId: 25,
          eventTypeSlug: "no-confirmation",
          timeZone: "Asia/Calcutta",
          language: "en",
          bookingUid: "bvCmP5rSquAazGSA7hz7ZP",
          user: "teampro",
          metadata: {},
          hasHashedBookingLink: false,
          hashedLink: null,
        },
      });
      expect(await handleNewBooking(req)).toBe(true);
    });
  });
});
