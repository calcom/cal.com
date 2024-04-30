import "server-only";
import NextAuth from "next-auth";
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cache } from "react";
import { z } from "zod";

import { authConfig } from "./config";
import { db } from "prisma/client";
import { type User } from "@prisma/client";
import { env } from "~/env";

async function hash(password: string) {
  return new Promise<string>((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        console.error('Error hashing password', err)
        reject(err)
      }
      resolve(`${salt}.${derivedKey.toString('hex')}`)
    })
  })
}

async function compare(password: string, hash: string) {
  return new Promise<boolean>((resolve, reject) => {
    const [salt, hashKey] = hash.split('.') as [string, string]
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        console.error('Error comparing password', err)
        reject(err)
      }
      resolve(timingSafeEqual(Buffer.from(hashKey, 'hex'), derivedKey))
    })
  })
}

/** [@calcom] This return type is typed out from the docs
 * @link: https://cal.com/docs/platform/quick-start#create-managed-users-via-our-api
 */
type CalManageUserResponse = {
  status: string;
  data: {
    user: {
      id: number;
      email: string;
      username: string;
      timeZone: string;
      weekStart: string;
      createdDate: string;
      timeFormat: number;
      defaultScheduleId: number | null;
    };
    accessToken: string;
    refreshToken: string;
  };
};
type CalCreateScheduleResponse = {
  status: "success";
  data: {
    id: number;
    name: string;
    isManaged: boolean;
    workingHours: Array<{
      days: Array<number>;
      startTime: number;
      endTime: number;
      userId: number;
    }>;
    schedule: Array<{
      id: number;
      userId: number;
      eventTypeId: number | null;
      days: Array<number>;
      startTime: string;
      endTime: string;
      date: Date | null;
      scheduleId: number;
    }>;
    availability: Array<
      Array<{
        start: string;
        end: string;
      }>
    >;
    timeZone: string;
    dateOverrides: Array<{ ranges: Array<{
      start: string;
      end: string;
    }> }>;
    isDefault: boolean;
    isLastSchedule: boolean;
    readOnly: boolean;
  };
};
const {
  auth: uncachedAuth,
  handlers: { GET, POST },
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  logger: {
    debug: (message, metadata) => console.debug(message, { metadata }),
    error: (error) => console.error(error),
    warn: (message) => console.warn(message),
  },
  providers: [
    Credentials({
      name: "Credentials",
      async authorize(c) {
        const credentials = z
          .object({
            email: z.string().min(1).max(42),
            password: z.string().min(6).max(32),
          })
          .safeParse(c);

        if (!credentials.success) {
          console.error(
            `[auth] Invalid sign in submission because of missing credentials: ${credentials.error.errors.map((e) => e.message).join(", ")}`,
          );
          return null;
        }

        let user: User | null = null;
        try {
          user = await db.user.findUnique({
            where: { email: credentials.data.email },
          });
          if (user) {
            // if user exists, this comes from our login page, let's check the password
            console.info(`User ${user.id} attempted login with password`);
            if (!user.hashedPassword) {
              console.debug(
                `OAuth User ${user.id} attempted signin with password`,
              );
              return null;
            }
            const pwMatch = await compare(
              credentials.data.password,
              user.hashedPassword,
            );
            if (!pwMatch) {
              console.debug(
                `User ${user.id} attempted login with bad password`,
              );
              return null;
            }
            return { id: user.id, name: user.name };
          } else {
            // if user doesn't exist, this comes from our signup page w/ additional fields
            console.info(`User attempted signup`, {
              username: c.username,
              name: c.name,
              professions: c.professions,
              services: c.services,
            });
            const signupData = z
              .object({
                username: z.string().min(1).max(32),
                name: z.string().min(1).max(32),
                professions: z.preprocess(
                  (val) => {
                    if (typeof val !== "string") return val; // should error
                    return JSON.parse(val);
                  },
                  z.array(z.string())),
                services: z.preprocess(
                  (val) => {
                    if (typeof val !== "string") return val; // should error
                    return JSON.parse(val);
                  },
                  z.array(z.string())),
              })
              .safeParse(c);
            if (!signupData.success) {
              console.error(
                `[auth] Invalid sign in submission because of missing signup data: ${signupData.error.errors.map((e) => e.message).join(", ")}`,
              );
              return null;
            }

            const url = `${env.NEXT_PUBLIC_CAL_API_URL}/oauth-clients/${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}/users`;
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-cal-secret-key": env.CAL_SECRET,
                origin:
                  env.NODE_ENV === "development"
                    ? "http://localhost:3000"
                    : // TODO: Replace this after deployment
                      "https://platform.cal.dev",
              },
              body: JSON.stringify({
                email: credentials.data.email,
                name: signupData.data.name,
              }),
            });
            let calUser: CalManageUserResponse["data"] | null = null;
            if (response.ok) {
              const json = (await response.json()) as Omit<
                CalManageUserResponse,
                "status"
              >;
              calUser = json.data;
            } else {
              const text = await response.text();
              if (!text.includes("already exists")) {
                throw new Error(
                  `Unable to create user '${credentials.data.email}': Invalid response from Cal after POSTing to ${url}
                
                Response text:
                ${await response.text()}
                `,
                );
              }
              // [@calcom] This means that the user already exists on cal's end but we didn't have them in our db
              // We can just look them up by email and create the user in our db:
              // let's fetch all users and get it from there.
              const res = await fetch(url, {
                headers: {
                  "Content-Type": "application/json",
                  "x-cal-secret-key": env.CAL_SECRET,
                  origin:
                    env.NODE_ENV === "development"
                      ? "http://localhost:3000"
                      : // TODO: Replace this after deployment
                        "https://platform.cal.dev",
                },
              });
              if (!res.ok) {
                throw new Error(
                  `Unable to create user '${credentials.data.email}': Invalid response from Cal after GETting: ${url}

                ℹ️ This means the user already exists in cal, but we can't fetch it to get the id.
                
                Response text:
                ${await res.text()}
                `,
                );
              }
              const calUsers = (await res.json()) as Omit<
                CalManageUserResponse,
                "data"
              > & { data: Array<CalManageUserResponse["data"]["user"]> };
              const fromCal = calUsers.data.find((calUser) => {
                // [@calcom] the cal email adds `+<clientId>` before the @ in the email, so let's do the same four our matching:
                const emailAsCal = credentials.data.email.replace(
                  "@",
                  `+${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}@`,
                );
                return calUser.email === emailAsCal;
              });
              if (!fromCal) {
                throw new Error(
                  `Unable to create user '${credentials.data.email}': User not found in Cal

                ℹ️ This means the user already exists in cal, but we couldn't reconcile it from the response. Here are the emails:
                ${calUsers.data.map((u) => u.email).join(", ")}
                `,
                );
              }
              // [@calcom] OK, we reconciled the user. Let's force refreshing their tokens so that we can store everything in our db
              const forceRefreshUrl = `${env.NEXT_PUBLIC_CAL_API_URL}/oauth-clients/${env.NEXT_PUBLIC_CAL_OAUTH_CLIENT_ID}/users/${fromCal.id}/force-refresh`;
              const forceRefreshResponse = await fetch(forceRefreshUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-cal-secret-key": env.CAL_SECRET,
                  origin:
                    env.NODE_ENV === "development"
                      ? "http://localhost:3000"
                      : // TODO: Replace this after deployment
                        "https://platform.cal.dev",
                },
              });
              if (!forceRefreshResponse.ok) {
                throw new Error(
                  `Unable to create user '${credentials.data.email}': Invalid response from Cal after attempting to force-refresh tokens for cal user with id '${fromCal.id}'
                
                Endpoint URL: ${forceRefreshUrl}
                
                Response text:
                ${await forceRefreshResponse.text()}
                `,
                );
              }
              const {
                data: { accessToken, refreshToken },
              } = (await forceRefreshResponse.json()) as {
                status: string;
                data: { accessToken: string; refreshToken: string };
              };
              // [@calcom] ✅ Now, we have successfully recovered our users tokens. Let's allocate this to our `calUser`
              calUser = { user: fromCal, accessToken, refreshToken };
            }

            /** [@calcom] 2. After we created the user on Cal's end, we have to create a default schedule: */
            const createScheduleUrl = `${env.NEXT_PUBLIC_CAL_API_URL}/schedules`;
            const createScheduleOptions = {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // [@calcom] We need to send the user's access token to create the schedule on their behalf
                Authorization: `Bearer ${calUser.accessToken}`,
              },
              body: JSON.stringify({
                name: "Default Schedule",
                timeZone: calUser.user.timeZone,
                isDefault: true,
              }),
            };
            const createScheduleResponse = await fetch(
              createScheduleUrl,
              createScheduleOptions,
            );

            if (!createScheduleResponse.ok) {
              throw new Error(
                `Unable to create default schedule for user '${credentials.data.email}': Invalid response from Cal after attempting to create the default schedule.

                -- REQUEST DETAILS --

                Endpoint Url: ${createScheduleUrl}
                
                Options: ${JSON.stringify(createScheduleOptions)}

                -- RESPONSE DETAILS --
                Text:
                ${await createScheduleResponse.text()}
                `,
              );
            }

            const schedule =
              (await createScheduleResponse.json()) as CalCreateScheduleResponse;
            calUser.user.defaultScheduleId = schedule.data.id;

            /** [@calcom] 3. Finally, create the user in our db with cal's tokens */
            const { accessToken, refreshToken, user: toCreate } = calUser;
            user = await db.user.create({
              data: {
                username: signupData.data.username,
                name: signupData.data.name,
                hashedPassword: await hash(credentials.data.password),
                email: credentials.data.email,
                professions: {
                  connect: signupData.data.professions.map((slug) => ({
                    slug,
                  })),
                },
                services: {
                  connect: signupData.data.services.map((slug) => ({
                    slug,
                  })),
                },
                /** [@calcom] 👇 These are the tokens necessary to make cal operations on behalf of the user */
                calAccount: {
                  create: { ...toCreate, accessToken, refreshToken },
                },
                /** [@calcom] 👆 */
              },
            });
          }

          return { id: user.id, name: user.name };
        } catch (e) {
          console.error(e);
          return null;
        }
      },
    }),
  ],
});

export { signIn, signOut, GET, POST };

export const auth = cache(async () => {
  try {
    return await uncachedAuth();
  } catch (err) {
    console.error("Error fetching session", err);
    return null;
  }
});
export const currentUser = cache(async () => {
  const sesh = await auth();
  if (!sesh?.user) return null;
  const user = await db.user.findUnique({
    where: { id: sesh.user.id },
    include: {
      calAccount: true,
      professions: true,
      services: true,
    },
  });
  return user;
});

export async function SignedIn(props: {
  children: (props: { user: Session["user"] }) => React.ReactNode;
}) {
  const sesh = await auth();
  return sesh?.user ? <>{props.children({ user: sesh.user })}</> : null;
}

export async function SignedOut(props: { children: React.ReactNode }) {
  const sesh = await auth();
  return sesh?.user ? null : <>{props.children}</>;
}
