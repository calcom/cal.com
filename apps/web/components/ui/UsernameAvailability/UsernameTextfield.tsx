import classNames from "classnames";
import { debounce, noop } from "lodash";
import { RefCallback, useEffect, useMemo, useState } from "react";

import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Button, Dialog, DialogClose, DialogContent, DialogHeader, TextField } from "@calcom/ui";
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
      <div className="rlt:space-x-reverse mt-px flex flex-row space-x-2 ltr:ml-2 ltr:mr-2 rtl:ml-2 rtl:space-x-reverse">
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
        <DialogContent>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <div className="xs:hidden flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
              <FiEdit2 className="m-auto h-6 w-6" />
            </div>
            <div className="mb-4 w-full px-4 pt-1">
              <DialogHeader title={t("confirm_username_change_dialog_title")} />

              <div className="flex w-full flex-wrap rounded-sm bg-gray-100 py-3 text-sm">
                <div className="flex-1 px-2">
                  <p className="text-gray-500">{t("current_username")}</p>
                  <p className="mt-1" data-testid="current-username">
                    {currentUsername}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-gray-500" data-testid="new-username">
                    {t("new_username")}
                  </p>
                  <p>{inputUsernameValue}</p>
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
