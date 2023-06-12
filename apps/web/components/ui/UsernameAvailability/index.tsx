import { useRouter } from "next/router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type z from "zod";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import type { User } from "@calcom/prisma/client";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";

import useRouterQuery from "@lib/hooks/useRouterQuery";

import { PremiumTextfield } from "./PremiumTextfield";
import { UsernameTextfield } from "./UsernameTextfield";

export const UsernameAvailability = IS_SELF_HOSTED ? UsernameTextfield : PremiumTextfield;

interface UsernameAvailabilityFieldProps {
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
  user: Pick<User, "username" | "metadata">;
  organization: { slug?: string | null | undefined; metadata: z.infer<typeof teamMetadataSchema> } | null;
}
export const UsernameAvailabilityField = ({
  onSuccessMutation,
  onErrorMutation,
  user,
  organization,
}: UsernameAvailabilityFieldProps) => {
  const router = useRouter();
  const [currentUsernameState, setCurrentUsernameState] = useState(user.username || "");
  const { username: usernameFromQuery, setQuery: setUsernameFromQuery } = useRouterQuery("username");
  const { username: currentUsername, setQuery: setCurrentUsername } =
    router.query["username"] && user.username === null
      ? { username: usernameFromQuery, setQuery: setUsernameFromQuery }
      : { username: currentUsernameState || "", setQuery: setCurrentUsernameState };
  const formMethods = useForm({
    defaultValues: {
      username: currentUsername,
    },
  });

  return (
    <Controller
      control={formMethods.control}
      name="username"
      render={({ field: { ref, onChange, value } }) => {
        return (
          <UsernameAvailability
            currentUsername={currentUsername}
            setCurrentUsername={setCurrentUsername}
            inputUsernameValue={value}
            usernameRef={ref}
            setInputUsernameValue={onChange}
            onSuccessMutation={onSuccessMutation}
            onErrorMutation={onErrorMutation}
            user={user}
            organization={organization}
          />
        );
      }}
    />
  );
};
