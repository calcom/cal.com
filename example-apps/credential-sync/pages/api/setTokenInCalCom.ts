import { symmetricEncrypt } from "@calcom/lib/crypto";

import { SECRET } from "../../constants";

const CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY = "blR5rr2Ipl5AZ1iZcCwQZedaOSYUrRfU";

export default async function handler(req, res) {
  try {
    const result = await fetch("http://localhost:3000/api/webhook/app-credential", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "calcom-credential-sync-secret": SECRET,
      },
      body: JSON.stringify({
        userId: 1,
        appSlug: "google-calendar",
        keys: symmetricEncrypt(
          JSON.stringify({
            _fromWebhookSync: true,
            scope:
              "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile",
            id_token:
              "eyJhbGciOiJSUzI1NiIsImtpZCI6IjkzYjQ5NTE2MmFmMGM4N2NjN2E1MTY4NjI5NDA5NzA0MGRhZjNiNDMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIxMDA5OTE2MzgxNjg5LTBmbmZndGdmdDQ1YWxsMmJpamNiMWMwYnVhc2s0c2Q2LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiMTAwOTkxNjM4MTY4OS0wZm5mZ3RnZnQ0NWFsbDJiaWpjYjFjMGJ1YXNrNHNkNi5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjExNTcwMDU4MjY2NDY0MDA1MzA3NCIsImF0X2hhc2giOiJuSkRIRXpxNU5NbERwZnR6bGlJUnJ3IiwibmFtZSI6IkhhcmlvbSBCYWxoYXJhIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pYclUxOGs5QjJNLXZxdlhOaDM1VHBlc3BXOUZzRmUtTkNKQ3Vmc2hlR1RtQVpObElIPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkhhcmlvbSIsImZhbWlseV9uYW1lIjoiQmFsaGFyYSIsImlhdCI6MTcxMjcyOTg2MiwiZXhwIjoxNzEyNzMzNDYyfQ.YwR0jPSSmMBQNexe9CGwGFkEigWg0rWlfll50_52C8QZKM3wdQFW5_-jcQBiV6XauWMmUcRfApI0nXWrV95CDL-iSXkO8VTAkppnO7CYIe3tSsFatR2ofAIKZYm1ro9_yai-l-19vy7BU9S66FRM-mu60XQQUxxxNwztJnw2cA33OAzJwxHEqVTrhjgf4H3p86Z68HWj9WF-S0gVHgqGNvpK3n9W_QuH1v0NVktsbuD1CFvBoQXwjfc2o0igfglPSlbneh5ZLq1bWwYAQu-6IpKT0Wo6p5n4lXjyNAvium1YU7ZNbeDtXsqCwTCMC8k7U69PYSnTeLm4ulPS7Hbzyw",
            token_type: "Bearer",
            expiry_date: 1712733461478,
            access_token:
              "ya29.a0Ad52N3_t6-xgzuLx3CXgFPJn-03COSRzFrJ0Szt4we-SdpFNLpUTY1Qn4xf2F4OfzCeCoEAgyQw8zQNpDNwE2-BSEqtLMrNPANh1fxGRzTjCoidhqL-gQbAtgQWgRLgvttPQdD21s4-PR2Yux6P6O-gK8o9AZOH_8XEqaCgYKAc4SARESFQHGX2MiQgmsf86sKc-BkPFehmr5rg0171",
            refresh_token:
              "1//0g68iziGguV2CCgYIARAAGBASNwF-L9IrFWdu3jmYDIoDLn2rYdm2PUSxYwEAEENxb6P-5HTxvpEx9vbvoT6U_ZfbaQ64BxdldHw",
          }),
          CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY
        ),
      }),
    });

    return res.status(200).json(await result.json());
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
