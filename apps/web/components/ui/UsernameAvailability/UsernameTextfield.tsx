import classNames from "classnames";
import { debounce, noop } from "lodash";
import type { RefCallback } from "react";
import { useEffect, useMemo, useState } from "react";

import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Button, Dialog, DialogClose, DialogContent, TextField } from "@calcom/ui";
import { FiCheck, FiEdit2 } from "@calcom/ui/components/icon";

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername?: (newUsername: string) => void;
  inputUsernameValue: string | undefined;
  usernameRef: RefCallback<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

const UsernameTextfield = (props: ICustomUsernameProps) => {
  const { t } = useLocale();
  const {
    currentUsername,
    setCurrentUsername = noop,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    onSuccessMutation,
    onErrorMutation,
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

  const utils = trpc.useContext();

  const updateUsernameMutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      onSuccessMutation && (await onSuccessMutation());
      setOpenDialogSaveUsername(false);
      setCurrentUsername(inputUsernameValue);
    },
    onError: (error) => {
      onErrorMutation && onErrorMutation(error);
    },
    async onSettled() {
      await utils.viewer.public.i18n.invalidate();
    },
  });

  const ActionButtons = () => {
    return usernameIsAvailable && currentUsername !== inputUsernameValue ? (
      <div className="rlt:space-x-reverse ms-2 me-2 mt-px flex flex-row space-x-2 rtl:space-x-reverse">
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
            addOnLeading={
              <>{process.env.NEXT_PUBLIC_WEBSITE_URL.replace("https://", "").replace("http://", "")}/</>
            }
            autoComplete="none"
            autoCapitalize="none"
            autoCorrect="none"
            className={classNames(
              "mb-0 mt-0 rounded-md ltr:rounded-l-none rtl:rounded-r-none",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500 focus:border-red-500 focus:outline-none focus:ring-0"
                : ""
            )}
            onChange={(event) => {
              event.preventDefault();
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
          />
          {currentUsername !== inputUsernameValue && (
            <div className="absolute right-[2px] top-6 flex flex-row">
              <span className={classNames("mx-2 py-2")}>
                {usernameIsAvailable ? <FiCheck className="w-6" /> : <></>}
              </span>
            </div>
          )}
        </div>
        <div className="mt-5 hidden md:inline">
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
        <DialogContent type="confirmation" Icon={FiEdit2} title={t("confirm_username_change_dialog_title")}>
          <div className="flex flex-row">
            <div className="mb-4 w-full pt-1">
              <div className="bg-subtle flex w-full flex-wrap rounded-sm py-3 text-sm">
                <div className="flex-1 px-2">
                  <p className="text-subtle">{t("current_username")}</p>
                  <p className="text-emphasis mt-1" data-testid="current-username">
                    {currentUsername}
                  </p>
                </div>
                <div className="ml-6 flex-1">
                  <p className="text-subtle" data-testid="new-username">
                    {t("new_username")}
                  </p>
                  <p className="text-emphasis">{inputUsernameValue}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-row-reverse gap-x-2">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { UsernameTextfield };
