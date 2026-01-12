import { deleteRecordingOfCalVideoByRecordingId } from "@calcom/features/conferencing/lib/videoClient";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";

import { TRPCError } from "@trpc/server";

import type { WithSession } from "../../../createContext";
import type { TDeleteCalVideoRecordingInputSchema } from "./deleteCalVideoRecording.schema";

type DeleteCalVideoRecordingHandlerOptions = {
  ctx: WithSession;
  input: TDeleteCalVideoRecordingInputSchema;
};

export const deleteCalVideoRecordingHandler = async ({
  input,
  ctx,
}: DeleteCalVideoRecordingHandlerOptions) => {
  const { recordingId } = input;
  const { session } = ctx;

  const isDeleteAllowed = IS_SELF_HOSTED || session?.user?.belongsToActiveTeam;

  if (!isDeleteAllowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
    });
  }

  try {
    const deleted = await deleteRecordingOfCalVideoByRecordingId(recordingId);
    return { deleted };
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
    });
  }
};
