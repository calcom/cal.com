import { TextField } from "@calid/features/ui/components/input/input";
import classNames from "classnames";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { useSession } from "next-auth/react";
import type { RefCallback } from "react";
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";

import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";

import type { TRPCClientErrorLike } from "@trpc/client";

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername?: (newUsername: string) => void;
  inputUsernameValue: string | undefined;
  usernameRef: RefCallback<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

export interface UsernameTextfieldRef {
  updateUsername: () => Promise<void>;
}

const UsernameTextfield = forwardRef<
  UsernameTextfieldRef,
  ICustomUsernameProps & Partial<React.ComponentProps<typeof TextField>>
>((props, ref) => {
  const { t } = useLocale();
  const { update } = useSession();

  const {
    currentUsername,
    setCurrentUsername = noop,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    onSuccessMutation,
    onErrorMutation,
    ...rest
  } = props;
  const [usernameIsAvailable, setUsernameIsAvailable] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);

  const debouncedUsername = useDebounce(inputUsernameValue, 600);

  useEffect(() => {
    async function checkUsername(username: string | undefined) {
      if (!username) {
        setUsernameIsAvailable(false);
        setMarkAsError(false);
        return;
      }

      if (currentUsername !== username) {
        const { data } = await fetchUsername(username, null);
        setMarkAsError(!data.available);
        setUsernameIsAvailable(data.available);
      } else {
        setUsernameIsAvailable(false);
      }
    }

    checkUsername(debouncedUsername);
  }, [debouncedUsername, currentUsername]);

  const updateUsernameMutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: async () => {
      onSuccessMutation && (await onSuccessMutation());
      setCurrentUsername(inputUsernameValue);
      await update({ username: inputUsernameValue });
    },
    onError: (error) => {
      onErrorMutation && onErrorMutation(error);
    },
  });

  const updateUsername = async () => {
    if (usernameIsAvailable && currentUsername !== inputUsernameValue) {
      updateUsernameMutation.mutate({
        username: inputUsernameValue,
      });
    }
  };

  useImperativeHandle(ref, () => ({
    updateUsername,
  }));

  return (
    <div>
      <div className="w-full">
        <label htmlFor="username" className="text-emphasis block text-sm font-medium">
          {t("username")} *
        </label>
      </div>
      <div className="flex rounded-md">
        <div className="relative w-full">
          <TextField
            ref={usernameRef}
            value={inputUsernameValue}
            autoComplete="none"
            autoCapitalize="none"
            autoCorrect="none"
            className={classNames(
              "mb-0 mt-0 rounded-md rounded-l-none",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500 focus:border-red-500 focus:outline-none focus:ring-0"
                : ""
            )}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              event.preventDefault();
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
            {...rest}
          />
        </div>
      </div>

      {inputUsernameValue && inputUsernameValue !== currentUsername && (
        <div className="mt-1">
          {markAsError ? (
            <p className="text-xs text-red-500">{t("username_already_taken")}</p>
          ) : usernameIsAvailable ? (
            <p className="text-xs text-green-600">{t("username_available")}</p>
          ) : (
            <p className="text-xs text-gray-500">{t("checking_username_availability")}</p>
          )}
        </div>
      )}
    </div>
  );
});

UsernameTextfield.displayName = "UsernameTextfield";

export { UsernameTextfield };
