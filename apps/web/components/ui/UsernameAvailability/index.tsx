import { Controller, useForm } from "react-hook-form";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { User } from "@calcom/prisma/client";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { AppRouter } from "@calcom/trpc/server/routers/_app";

import useRouterQuery from "@lib/hooks/useRouterQuery";

import { PremiumTextfield } from "./PremiumTextfield";
import { UsernameTextfield } from "./UsernameTextfield";

export const UsernameAvailability = IS_SELF_HOSTED ? UsernameTextfield : PremiumTextfield;

interface UsernameAvailabilityFieldProps {
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
  user: Pick<User, "username" | "metadata">;
}
export const UsernameAvailabilityField = ({
  onSuccessMutation,
  onErrorMutation,
  user,
}: UsernameAvailabilityFieldProps) => {
  const { username: currentUsername, setQuery: setCurrentUsername } = useRouterQuery("username");
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
          />
        );
      }}
    />
  );
};
