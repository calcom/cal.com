import classNames from "classnames";
// eslint-disable-next-line no-restricted-imports
import { noop } from "lodash";
import { useSession } from "next-auth/react";
import type { RefCallback } from "react";
import { useEffect, useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/types/server/routers/_app";
import { Button } from "@coss/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@coss/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@coss/ui/components/input-group";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

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

const UsernameTextfield = (props: ICustomUsernameProps & { addOnLeading?: React.ReactNode }) => {
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
    addOnLeading,
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

  const updateUsername = async () => {
    updateUsernameMutation.mutate({
      username: inputUsernameValue,
    });
  };

  return (
    <div>
      <Field>
        <FieldLabel>{t("username")}</FieldLabel>
        <InputGroup>
          <InputGroupInput
            ref={usernameRef}
            name="username"
            placeholder="john"
            type="text"
            value={inputUsernameValue}
            autoComplete="none"
            autoCapitalize="none"
            autoCorrect="none"
            aria-invalid={markAsError || undefined}
            onChange={(event) => {
              event.preventDefault();
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
          />
          {addOnLeading && (
            <InputGroupAddon align="inline-start">
              <InputGroupText>{addOnLeading}</InputGroupText>
            </InputGroupAddon>
          )}
          {usernameIsAvailable && currentUsername !== inputUsernameValue && (
            <InputGroupAddon align="inline-end">
              <Icon name="check" className="h-4 w-4 text-green-500" />
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => setOpenDialogSaveUsername(true)}
                data-testid="update-username-btn">
                {t("update")}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => {
                  if (currentUsername) {
                    setInputUsernameValue(currentUsername);
                  }
                }}>
                {t("cancel")}
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>
        <FieldDescription>{t("tip_username_plus")}</FieldDescription>
        {markAsError && <FieldError>{t("username_already_taken")}</FieldError>}
      </Field>
      <Dialog open={openDialogSaveUsername}>
        <DialogContent type="confirmation" Icon="pencil" title={t("confirm_username_change_dialog_title")}>
          <div className="flex flex-row">
            <div className="mb-4 w-full pt-1">
              <div className="bg-subtle flex w-full flex-wrap justify-between gap-6 rounded-sm  px-4 py-3 text-sm">
                <div>
                  <p className="text-subtle">{t("current_username")}</p>
                  <Tooltip content={currentUsername}>
                    <p
                      className="text-emphasis mt-1 max-w-md overflow-hidden text-ellipsis break-all"
                      data-testid="current-username">
                      {currentUsername}
                    </p>
                  </Tooltip>
                </div>
                <div>
                  <p className="text-subtle" data-testid="new-username">
                    {t("new_username")}
                  </p>
                  <Tooltip content={inputUsernameValue}>
                    <p className="text-emphasis mt-1 max-w-md overflow-hidden text-ellipsis break-all">
                      {inputUsernameValue}
                    </p>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              disabled={updateUsernameMutation.isPending}
              data-testid="save-username"
              onClick={updateUsername}>
              {updateUsernameMutation.isPending && <Icon name="loader" className="h-4 w-4 animate-spin" />}
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
