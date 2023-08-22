import classNames from "classnames";
// eslint-disable-next-line no-restricted-imports
import { debounce, noop } from "lodash";
import { useSession } from "next-auth/react";
import type { RefCallback } from "react";
import { useEffect, useMemo, useState } from "react";

import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Button, Dialog, DialogClose, DialogContent, TextField, DialogFooter } from "@calcom/ui";
import { Check, Edit2 } from "@calcom/ui/components/icon";

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername?: (newUsername: string) => void;
  inputUsernameValue: string | undefined;
  usernameRef: RefCallback<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

const UsernameTextfield = (props: ICustomUsernameProps & Partial<React.ComponentProps<typeof TextField>>) => {
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
  const [openDialogSaveUsername, setOpenDialogSaveUsername] = useState(false);

  const debouncedApiCall = useMemo(
    () =>
      debounce(async (username) => {
        const { data } = await fetchUsername(username);
        setMarkAsError(!data.available);
        setUsernameIsAvailable(data.available);
      }, 150),
    []
  );

  useEffect(() => {
    if (!inputUsernameValue) {
      debouncedApiCall.cancel();
      setUsernameIsAvailable(false);
      setMarkAsError(false);
      return;
    }

    if (currentUsername !== inputUsernameValue) {
      debouncedApiCall(inputUsernameValue);
    } else {
      setUsernameIsAvailable(false);
    }
  }, [inputUsernameValue, debouncedApiCall, currentUsername]);

  const updateUsernameMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      onSuccessMutation && (await onSuccessMutation());
      setOpenDialogSaveUsername(false);
      setCurrentUsername(inputUsernameValue);
      await update({ username: inputUsernameValue });
    },
    onError: (error) => {
      onErrorMutation && onErrorMutation(error);
    },
  });

  const ActionButtons = () => {
    return usernameIsAvailable && currentUsername !== inputUsernameValue ? (
      <div className="me-2 ms-2 flex flex-row space-x-2">
        <Button
          type="button"
          onClick={() => setOpenDialogSaveUsername(true)}
          data-testid="update-username-btn">
          {t("update")}
        </Button>
        <Button
          type="button"
          color="minimal"
          onClick={() => {
            if (currentUsername) {
              setInputUsernameValue(currentUsername);
            }
          }}>
          {t("cancel")}
        </Button>
      </div>
    ) : (
      <></>
    );
  };

  const updateUsername = async () => {
    updateUsernameMutation.mutate({
      username: inputUsernameValue,
    });
  };

  return (
    <div>
      <div className="flex rounded-md">
        <div className="relative w-full">
          <TextField
            ref={usernameRef}
            name="username"
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
            onChange={(event) => {
              event.preventDefault();
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
            {...rest}
          />
          {currentUsername !== inputUsernameValue && (
            <div className="absolute right-[2px] top-6 flex flex-row">
              <span className={classNames("mx-2 py-3.5")}>
                {usernameIsAvailable ? <Check className="h-4 w-4" /> : <></>}
              </span>
            </div>
          )}
        </div>
        <div className="mt-7 hidden md:inline">
          <ActionButtons />
        </div>
      </div>
      {markAsError && <p className="mt-1 text-xs text-red-500">{t("username_already_taken")}</p>}

      {usernameIsAvailable && currentUsername !== inputUsernameValue && (
        <div className="mt-2 flex justify-end md:hidden">
          <ActionButtons />
        </div>
      )}
      <Dialog open={openDialogSaveUsername}>
        <DialogContent type="confirmation" Icon={Edit2} title={t("confirm_username_change_dialog_title")}>
          <div className="flex flex-row">
            <div className="mb-4 w-full pt-1">
              <div className="bg-subtle flex w-full flex-wrap gap-6 rounded-sm px-2 py-3 text-sm">
                <div>
                  <p className="text-subtle">{t("current_username")}</p>
                  <p className="text-emphasis mt-1" data-testid="current-username">
                    {currentUsername}
                  </p>
                </div>
                <div>
                  <p className="text-subtle" data-testid="new-username">
                    {t("new_username")}
                  </p>
                  <p className="text-emphasis mt-1">{inputUsernameValue}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              loading={updateUsernameMutation.isLoading}
              data-testid="save-username"
              onClick={updateUsername}>
              {t("save")}
            </Button>

            <DialogClose color="secondary" onClick={() => setOpenDialogSaveUsername(false)}>
              {t("cancel")}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { UsernameTextfield };
