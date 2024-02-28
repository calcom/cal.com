import { CalSdk } from "../src/cal";

(async () => {
  const sdk = new CalSdk(
    "whategver",
    {
      accessToken: "test",
    },
    {
      baseUrl: "https://api.cal.com",
      handleRefresh: true,
      httpRetries: {
        maxAmount: 5,
      },
    }
  );

  await sdk.slots.getAvailableSlots({
    debug: true,
    endTime: new Date(),
    startTime: new Date(),
    duration: 5,
    eventTypeId: 5,
    usernameList: [],
  });
})();
