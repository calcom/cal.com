import prisma from "@calcom/prisma"
import { createMocks } from "node-mocks-http";
import type { CustomNextApiRequest, CustomNextApiResponse } from "@calcom/lib/test/types";
import dayjs from "@calcom/dayjs";
import { default as handleNewBooking } from "@calcom/features/bookings/lib/handleNewBooking";


test("API call to handleNewBooking", async () => {
    const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
      method: "POST",
      body: {
        name: "test",
        start: dayjs().add(1, "hour").format(),
        end: dayjs().add(1, "day").format(),
        eventTypeId: 3,
        email: "test@example.com",
        location: "Cal.com Video",
        timeZone: "America/Montevideo",
        language: "en",
        customInputs: [],
        metadata: {},
        userId: 4,
      },
      userId: 4,
      prisma,
    });

    await handleNewBooking(req, res);
    console.log({ statusCode: res._getStatusCode(), data: JSON.parse(res._getData()) });

    //   expect(prismaMock.booking.create).toHaveBeenCalledTimes(1);
    })
