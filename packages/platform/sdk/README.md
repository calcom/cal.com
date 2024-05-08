<p align="center">
  <a href="https://github.com/calcom/cal.com">
   <img src="https://user-images.githubusercontent.com/8019099/210054112-5955e812-a76e-4160-9ddd-58f2c72f1cce.png" alt="Logo">
  </a>
  <br/>
  <strong>Cal.com SDK</strong>
</p>

![SDK Version](https://img.shields.io/github/package-json/v/calcom/cal.com/main?filename=packages%2Fplatform%2Fsdk%2Fpackage.json)

## Install

```bash
yarn add @calcom/sdk
```

## Usage

To use the Cal.com SDK you need to have an OAuth Client set up, which you can obtain [here](https://app.cal.com/settings/organizations/platform/oauth-clients/).

```typescript
import { Cal } from "@calcom/sdk";

const sdk = new Cal("your_client_id", {
  clientSecret: "your_client_secret",
});
```

### Authenticating as a User
The SDK is also meant to be used as an authenticated user, to do that, you need to pass the `accessToken` to the `authOptions` in the SDK constructor.

```typescript
const authedSdk = new Cal("your_client_id", {
  clientSecret: "your_client_secret",
  accessToken: "your_user_access_token"
});

const schedule = await authedSdk.schedules.createSchedule({
  availabilities: [
    {
      days: [1, 2, 3, 4, 5, 6],
      startTime: "09:00:00",
      endTime: "17:00:00",
    },
  ],
  isDefault: true,
  name: "Default Schedule",
  timeZone: "America/Argentina/Buenos_Aires",
});
```

You can manually refresh access tokens, or you can let the SDK handle token refreshes via the `handleRefresh` option.

To manually update an access token, you can use the following snippet:
```typescript
sdk.secrets().updateAccessToken(oauth.accessToken, oauth.refreshToken);
```

## Configuration

| Option                     | Required | Description                                                                                         |
|----------------------------|----------|-----------------------------------------------------------------------------------------------------|
| `authOptions.clientSecret` | `TRUE`   | The Client Secret corresponding to the client ID passed as the first parameter.                     |
| `authOptions.accessToken`  | `FALSE`  | `Optional` Access token when authenticating as a specific user.                                     |
| `authOptions.refreshToken` | `FALSE`  | `Optional` If provided, the SDK can handle refreshing access tokens automatically when they expire. |
| `options.baseUrl`          | `FALSE`  | `Defaults to https://api.cal.com`. The base URI for the Cal.com platform API                        |
| `options.handleRefresh`    | `FALSE`  | Whether the SDK should handle automatic refreshes for expired access tokens.                        |
