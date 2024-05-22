import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import { ZUpdateCredentialSettingsInputSchema } from "./updateCredentialSettings.schema";
import type { TUpdateAppCredentialsInputSchema } from "./updateCredentialSettings.schema";

export type UpdateAppCredentialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateAppCredentialsInputSchema;
};

export const updateCredentialSettingsHandler = async ({ ctx, input }: UpdateAppCredentialsOptions) => {
  const { user } = ctx;
  const {
    credentialId,
    settings: { toBeDisabled, event },
  } = ZUpdateCredentialSettingsInputSchema.parse(input);

  // Find user credential
  const credential = await prisma.credential.findFirst({
    where: {
      id: parseInt(credentialId),
      userId: user.id,
    },
  });

  // Check if credential exists
  if (!credential) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not find credential ${input.credentialId}`,
    });
  }

  function getUpdatedSettings(
    currentSettings: { disabledEvents: string[] },
    eventToExecute: { toBeDisabled: boolean; event: string }
  ) {
    const disabledEvents: Set<string> = new Set(currentSettings.disabledEvents);
    console.log({ disabledEvents, eventToExecute });

    if (eventToExecute.toBeDisabled) disabledEvents.add(eventToExecute.event);
    else disabledEvents.delete(eventToExecute.event);

    console.log({ disabledEvents });

    return {
      disabledEvents,
    };
  }

  const updatedSettings = getUpdatedSettings(
    { disabledEvents: (credential.settings as { disabledEvents: string[] }).disabledEvents },
    { toBeDisabled, event }
  );

  console.log({ updatedSettings }, "ASDFASDFASD", Array.from(updatedSettings.disabledEvents));

  const updated = await prisma.credential.update({
    where: {
      id: credential.id,
    },
    data: {
      settings: { disabledEvents: Array.from(updatedSettings.disabledEvents) },
    },
  });

  return !!updated;
};
