import classNames from "classnames";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { useSession } from "next-auth/react";
import type { RefCallback } from "react";
import { useEffect, useState } from "react";

import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { TextField } from "@calcom/ui/components/form";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { CheckIcon } from "@coss/ui/icons";

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

  // debounce the username input, set the delay to 600ms to be consistent with signup form
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

  const updateUsernameMutation = trpc.viewer.me.updateProfile.useMutation({
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
      <div className="relative bottom-[6px] me-2 ms-2 flex flex-row space-x-2">
        <Button
          type="button"
          onClick={() => setOpenDialogSaveUsername(true)}
          data-testid="update-username-btn">
          {t("update")}
        </Button>
        <Button
          type="button"
          variant="ghost"
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
            placeholder="john"
            value={inputUsernameValue}
            autoComplete="none"
            autoCapitalize="none"
            autoCorrect="none"
            containerClassName="[&>div]:gap-0"
            className={classNames(
              "mb-0 mt-0 rounded-md rounded-l-none pl-0",
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
            <div className="absolute right-[2px] top-6 flex h-7 flex-row">
              <span className={classNames("bg-default mx-0 p-3")}>
                {usernameIsAvailable ? (
                  <CheckIcon className="relative bottom-[6px] h-4 w-4" />
                ) : (
                  <></>
                )}
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
      <Dialog open={openDialogSaveUsername} onOpenChange={setOpenDialogSaveUsername}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>{t("confirm_username_change_dialog_title")}</DialogTitle>
          </DialogHeader>
          <DialogPanel>
            <div className="bg-subtle flex w-full flex-wrap justify-between gap-6 rounded-sm px-4 py-3 text-sm">
              <div>
                <p className="text-subtle">{t("current_username")}</p>
                <Tooltip>
                  <TooltipTrigger
                    className="text-emphasis mt-1 max-w-md cursor-default overflow-hidden text-ellipsis break-all text-left"
                    data-testid="current-username"
                    render={<p />}>
                    {currentUsername}
                  </TooltipTrigger>
                  <TooltipPopup>{currentUsername}</TooltipPopup>
                </Tooltip>
              </div>
              <div>
                <p className="text-subtle" data-testid="new-username">
                  {t("new_username")}
                </p>
                <Tooltip>
                  <TooltipTrigger
                    className="text-emphasis mt-1 max-w-md cursor-default overflow-hidden text-ellipsis break-all text-left"
                    render={<p />}>
                    {inputUsernameValue}
                  </TooltipTrigger>
                  <TooltipPopup>{inputUsernameValue}</TooltipPopup>
                </Tooltip>
              </div>
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              {t("cancel")}
            </DialogClose>
            <Button
              type="button"
              loading={updateUsernameMutation.isPending}
              data-testid="save-username"
              onClick={updateUsername}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
};

export { UsernameTextfield };
