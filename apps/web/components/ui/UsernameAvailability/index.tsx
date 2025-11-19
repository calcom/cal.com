import { useSearchParams } from "next/navigation";
import slugify from "@calcom/lib/slugify";
import { useState, useEffect, useRef, forwardRef } from "react";
import type { RefCallback, ReactNode } from "react";
import { Controller, useForm, type Control } from "react-hook-form";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL, IS_SELF_HOSTED } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";

import useRouterQuery from "@lib/hooks/useRouterQuery";

import type { TRPCClientErrorLike } from "@trpc/client";

import { PremiumTextfield } from "./PremiumTextfield";
import type { UsernameTextfieldRef } from "./UsernameTextfield";
import { UsernameTextfield } from "./UsernameTextfield";

interface UsernameAvailabilityFieldProps {
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
  onUpdateUsername?: () => void;
  control?: Control<{ username: string }>;
}

interface ICustomUsernameProps extends UsernameAvailabilityFieldProps {
  currentUsername: string | undefined;
  setCurrentUsername?: (newUsername: string) => void;
  inputUsernameValue: string | undefined;
  usernameRef: RefCallback<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  disabled?: boolean | undefined;
  addOnLeading?: ReactNode;
  isPremium: boolean;
}

export const UsernameAvailability = forwardRef<UsernameTextfieldRef, ICustomUsernameProps>((props, ref) => {
  const { isPremium, ...otherProps } = props;
  if (isPremium) {
    return <PremiumTextfield {...otherProps} />;
  }
  return <UsernameTextfield ref={ref} {...otherProps} />;
});

UsernameAvailability.displayName = "UsernameAvailability";

export const UsernameAvailabilityField = ({
  onSuccessMutation,
  onErrorMutation,
  onUpdateUsername,
  control,
}: UsernameAvailabilityFieldProps) => {
  const searchParams = useSearchParams();
  const [user] = trpc.viewer.me.get.useSuspenseQuery();

  // Generate username from email if user doesn't have a username yet
  const generateUsernameFromEmail = (email: string) => {
    const emailPrefix = email.split("@")[0];
    return slugify(emailPrefix);
  };

  const initialUsername = user.username || (user.email ? generateUsernameFromEmail(user.email) : "");
  const [currentUsernameState, setCurrentUsernameState] = useState(initialUsername);

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

  const formControl = control || formMethods.control;

  // Auto-populate username from email when component mounts if no username exists
  useEffect(() => {
    if (!user.username && user.email && !currentUsername) {
      const generatedUsername = generateUsernameFromEmail(user.email);
      setCurrentUsername(generatedUsername);
      formMethods.setValue("username", generatedUsername);
    }
  }, [user.email, user.username, currentUsername, formMethods, setCurrentUsername]);

  const orgBranding = useOrgBranding();

  const usernamePrefix = orgBranding
    ? orgBranding?.fullDomain.replace(/^(https?:|)\/\//, "")
    : `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`;

  const isPremium = !IS_SELF_HOSTED && !user.organization?.id;
  const usernameTextfieldRef = useRef<UsernameTextfieldRef>(null);

  // Expose updateUsername function to parent
  useEffect(() => {
    if (onUpdateUsername && usernameTextfieldRef.current) {
      onUpdateUsername();
    }
  }, [onUpdateUsername]);

  return (
    <Controller
      control={formControl}
      name="username"
      render={({ field: { ref, onChange, value } }) => (
        <UsernameAvailability
          ref={usernameTextfieldRef}
          currentUsername={currentUsername}
          setCurrentUsername={setCurrentUsername}
          inputUsernameValue={value}
          usernameRef={ref}
          setInputUsernameValue={(e) => {
            onChange(slugify(e, true));
          }}
          onSuccessMutation={onSuccessMutation}
          onErrorMutation={onErrorMutation}
          disabled={!!user.organization?.id}
          addOnLeading={`${usernamePrefix}/`}
          isPremium={isPremium}
        />
      )}
    />
  );
};
