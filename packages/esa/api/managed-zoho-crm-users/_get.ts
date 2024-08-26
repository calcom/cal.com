/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "@prisma/client";
import axios from "axios";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";
import { getScheduleByUserIdHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/getScheduleByUserId.handler";

import { zohoClient } from "../../lib/zoho";

async function getHandler(req: NextApiRequest) {
  const $req = req as NextApiRequest & { prisma: any };

  const prisma: PrismaClient = $req.prisma;
  const schedulingSetupEntries = await prisma.zohoSchedulingSetup.findMany();

  // prepare request to get zoho mail users
  const requestBody = {
    url: `${process.env.ZOHO_MAIL_BASE_URL}/organization/${process.env.ZOHO_MAIL_ORG_ID}/accounts`,
    method: "get",
    data: {},
  };

  const [crmUsersResponse, zohoMailAccountsResponse] = await Promise.all([
    zohoClient().crm().getRecords("users"),
    axios.post(`${process.env.MANAGER_URL}/manager/new`, requestBody),
  ]);

  const zohoMailAccounts = zohoMailAccountsResponse?.data?.data || [];
  const crmUsers = crmUsersResponse?.users || [];

  const users = crmUsers.map((u: any) => {
    const setupEntry = schedulingSetupEntries.find((entry: any) => String(entry.zuid) === String(u.zuid));
    const zohoMailAccount = zohoMailAccounts.find((account: any) => String(account.zuid) === String(u.zuid));

    return {
      userId: setupEntry?.userId,
      zuid: u.zuid,
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      hasZohoCalender: !!zohoMailAccount,
      timeZone: zohoMailAccount?.timeZone || u.time_zone,
      status: setupEntry?.status || "Not Started",
    };
  });

  const withSchedule = await Promise.all(
    users.map(async (user: any) => {
      if (user.userId) {
        const contextUser = { id: user.userId, timeZone: user.timeZone };
        const schedule = await getScheduleByUserIdHandler({
          ctx: { user: contextUser, prisma },
          input: { userId: user.userId },
        } as any);

        return {
          ...user,
          schedule,
        };
      }

      return user;
    })
  );

  return { crmUsers: withSchedule };
}

export default defaultResponder(getHandler);
