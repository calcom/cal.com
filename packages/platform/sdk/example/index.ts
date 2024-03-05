import { CalSdk } from "../src/cal";

(async () => {
  const sdk = new CalSdk(
    "cltd1rit60001p51en7z0sq75",
    {
      accessToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYWNjZXNzX3Rva2VuIiwiY2xpZW50SWQiOiJjbHRkMXJpdDYwMDAxcDUxZW43ejBzcTc1Iiwib3duZXJJZCI6OSwiaWF0IjoxNzA5NTYzNTMyfQ.tpUSk0gREAZPJA2aXnHPpVc-9Bbcj2w90kVH2Qii6RE",
      clientSecret:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidGVzdCBjbGllbnQiLCJwZXJtaXNzaW9ucyI6MjU1LCJyZWRpcmVjdFVyaXMiOlsiaHR0cDovL2xvY2FsaG9zdDozMDAwL2F1dGgvcGxhdGZvcm0vYXV0aG9yaXplIl0sImlhdCI6MTcwOTU2MzE1N30.j8cxam5pfPG45BAMCuXt7bm3GM7JO_UnWL9wPVGcr5U",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoicmVmcmVzaF90b2tlbiIsImNsaWVudElkIjoiY2x0ZDFyaXQ2MDAwMXA1MWVuN3owc3E3NSIsIm93bmVySWQiOjksImlhdCI6MTcwOTU2MzUzMn0.SHMikF_9uJvqJFAiWAnI0BsRQSJCTbaAXPi1B99sWNk",
    },
    {
      baseUrl: "http://localhost:5555/api",
      handleRefresh: true,
      httpRetries: {
        maxAmount: 5,
      },
    }
  );

  try {
    const oauth = await sdk.oauth.exchange({
      authorizationCode: "cltd1wlqn0002p51ektm2byp6",
    });

    console.log("finalized oauth", oauth.accessToken);

    // force updating
    sdk.secrets().updateAccessToken(oauth.accessToken, oauth.refreshToken);

    const schedule = await sdk.schedules.createSchedule({
      availabilities: [
        {
          days: [1, 2, 3, 4, 5, 6],
          startTime: "10:00:00",
          endTime: "14:00:00",
        },
      ],
      isDefault: true,
      name: "Default Schedule Test",
      timeZone: "America/Argentina/Buenos_Aires",
    });

    console.log(schedule);

    const deleted = await sdk.schedules.deleteSchedule(schedule.id);

    console.log(deleted);
  } catch (err) {
    console.log("error", err);
  }
})();
