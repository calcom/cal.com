import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { CAL_URL } from "@calcom/lib/constants";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";

import useRouterQuery from "@lib/hooks/useRouterQuery";

import { PremiumTextfield } from "./PremiumTextfield";
import { UsernameTextfield } from "./UsernameTextfield";

export const UsernameAvailability = IS_SELF_HOSTED ? UsernameTextfield : PremiumTextfield;

interface UsernameAvailabilityFieldProps {
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export const UsernameAvailabilityField = ({
  onSuccessMutation,
  onErrorMutation,
}: UsernameAvailabilityFieldProps) => {
  const searchParams = useSearchParams();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const [currentUsernameState, setCurrentUsernameState] = useState(user.username || "");
  const { username: usernameFromQuery, setQuery: setUsernameFromQuery } = useRouterQuery("username");
  const { username: currentUsername, setQuery: setCurrentUsername } =
    searchParams?.get("username") && user.username === null
      ? { username: usernameFromQuery, setQuery: setUsernameFromQuery }
      : { username: currentUsernameState || "", setQuery: setCurrentUsernameState };
  const formMethods = useForm({
    defaultValues: {
      username: currentUsername,
    },
  });

  const orgBranding = useOrgBranding();

  const usernamePrefix = orgBranding
    ? orgBranding?.fullDomain.replace(/^(https?:|)\/\//, "")
    : `${CAL_URL?.replace(/^(https?:|)\/\//, "")}`;

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
            addOnLeading={`${usernamePrefix}/`}
          />
        );
      }}
    />
  );
};
