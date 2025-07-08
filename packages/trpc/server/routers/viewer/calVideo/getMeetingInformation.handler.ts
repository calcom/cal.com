import DailyVideoApiAdapter from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetMeetingInformationInputSchema } from "./getMeetingInformation.schema";

type GetMeetingInformationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMeetingInformationInputSchema;
};

export const getMeetingInformationHandler = async ({ ctx: _ctx, input }: GetMeetingInformationOptions) => {
  const { roomName } = input;

  try {
    const videoApiAdapter = DailyVideoApiAdapter();
    if (!videoApiAdapter || !videoApiAdapter.getMeetingInformation) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Meeting information feature not available",
      });
    }
    const res = await videoApiAdapter.getMeetingInformation(roomName);
    return res;
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
    });
  }
};
