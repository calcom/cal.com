import classNames from "classnames";
import { debounce } from "lodash";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { fetchUsername } from "@calcom/lib/fetchUsername";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User } from "@calcom/prisma/client";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import { Input, Label } from "@calcom/ui/form/fields";

export enum UsernameChangeStatusEnum {
  NORMAL = "NORMAL",
  UPGRADE = "UPGRADE",
  DOWNGRADE = "DOWNGRADE",
}

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername: (value: string | undefined) => void;
  inputUsernameValue: string | undefined;
  usernameRef: MutableRefObject<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
  user: Pick<
    User,
    | "username"
    | "name"
    | "email"
    | "bio"
    | "avatar"
    | "timeZone"
    | "weekStart"
    | "hideBranding"
    | "theme"
    | "plan"
    | "brandColor"
    | "darkBrandColor"
    | "metadata"
    | "timeFormat"
    | "allowDynamicBooking"
  >;
}

const PremiumTextfield = (props: ICustomUsernameProps) => {
  const { t } = useLocale();
  const {
    currentUsername,
    setCurrentUsername,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    onSuccessMutation,
    onErrorMutation,
    user,
  } = props;
  const [usernameIsAvailable, setUsernameIsAvailable] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);
  const [openDialogSaveUsername, setOpenDialogSaveUsername] = useState(false);
  const [usernameChangeCondition, setUsernameChangeCondition] = useState<UsernameChangeStatusEnum | null>(
    null
  );

  const userIsPremium =
    user && user.metadata && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;
  const [premiumUsername, setPremiumUsername] = useState(false);

  const debouncedApiCall = useCallback(
    debounce(async (username) => {
      const { data } = await fetchUsername(username);
      setMarkAsError(!data.available);
      setPremiumUsername(data.premium);
      setUsernameIsAvailable(data.available);
    }, 150),
    []
  );

  useEffect(() => {
    if (currentUsername !== inputUsernameValue) {
      debouncedApiCall(inputUsernameValue);
    } else if (inputUsernameValue === "") {
      setMarkAsError(false);
      setPremiumUsername(false);
      setUsernameIsAvailable(false);
    } else {
      setPremiumUsername(userIsPremium);
      setUsernameIsAvailable(false);
    }
  }, [inputUsernameValue]);

  useEffect(() => {
    if (usernameIsAvailable || premiumUsername) {
      const condition = obtainNewUsernameChangeCondition({
        userIsPremium,
        isNewUsernamePremium: premiumUsername,
      });

      setUsernameChangeCondition(condition);
    }
  }, [usernameIsAvailable, premiumUsername]);

  const obtainNewUsernameChangeCondition = ({
    userIsPremium,
    isNewUsernamePremium,
  }: {
    userIsPremium: boolean;
    isNewUsernamePremium: boolean;
  }) => {
    let resultCondition: UsernameChangeStatusEnum;
    if (!userIsPremium && isNewUsernamePremium) {
      resultCondition = UsernameChangeStatusEnum.UPGRADE;
    } else if (userIsPremium && !isNewUsernamePremium) {
      resultCondition = UsernameChangeStatusEnum.DOWNGRADE;
    } else {
      resultCondition = UsernameChangeStatusEnum.NORMAL;
    }
    return resultCondition;
  };

  const utils = trpc.useContext();

  const updateUsername = trpc.useMutation("viewer.updateProfile", {
    onSuccess: async () => {
      onSuccessMutation && (await onSuccessMutation());
      setCurrentUsername(inputUsernameValue);
      setOpenDialogSaveUsername(false);
    },
    onError: (error) => {
      onErrorMutation && onErrorMutation(error);
    },
    async onSettled() {
      await utils.invalidateQueries(["viewer.public.i18n"]);
    },
  });

  const ActionButtons = (props: { index: string }) => {
    const { index } = props;
    return (usernameIsAvailable || premiumUsername) && currentUsername !== inputUsernameValue ? (
      <div className="flex flex-row">
        <Button
          type="button"
          color="primary"
          className="mx-2"
          onClick={() => setOpenDialogSaveUsername(true)}
          data-testid={`update-username-btn-${index}`}>
          {t("update")}
        </Button>
        <Button
          type="button"
          color="secondary"
          className="mx-2"
          onClick={() => {
            if (currentUsername) {
              setInputUsernameValue(currentUsername);
              usernameRef.current.value = currentUsername;
            }
          }}>
          {t("cancel")}
        </Button>
      </div>
    ) : (
      <></>
    );
  };

  const saveUsername = () => {
    if (usernameChangeCondition === UsernameChangeStatusEnum.NORMAL) {
      updateUsername.mutate({
        username: inputUsernameValue,
      });
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyItems: "center" }}>
        <Label htmlFor="username">{t("username")}</Label>
      </div>
      <div className="mt-1 flex rounded-md">
        <span
          className={classNames(
            "inline-flex items-center rounded-l-sm border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500"
          )}>
          {process.env.NEXT_PUBLIC_WEBSITE_URL}/
        </span>
        <div style={{ position: "relative", width: "100%" }}>
          <Input
            ref={usernameRef}
            name="username"
            autoComplete="none"
            autoCapitalize="none"
            autoCorrect="none"
            className={classNames(
              "mt-0 rounded-l-none",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500 focus:border-red-500 focus:outline-none focus:ring-0"
                : ""
            )}
            defaultValue={currentUsername}
            onChange={(event) => {
              event.preventDefault();
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
          />
          {currentUsername !== inputUsernameValue && (
            <div
              className="top-0"
              style={{
                position: "absolute",
                right: 2,
                display: "flex",
                flexDirection: "row",
              }}>
              <span
                className={classNames(
                  "mx-2 py-1",
                  premiumUsername ? "text-orange-500" : "",
                  usernameIsAvailable ? "" : ""
                )}>
                {premiumUsername ? <Icon.Star className="mt-[4px] w-6" /> : <></>}
                {!premiumUsername && usernameIsAvailable ? <Icon.Check className="mt-[4px] w-6" /> : <></>}
              </span>
            </div>
          )}
        </div>
        <div className="xs:hidden">
          <ActionButtons index="desktop" />
        </div>
      </div>
      {markAsError && <p className="mt-1 text-xs text-red-500">Username is already taken</p>}

      {usernameIsAvailable && (
        <p className={classNames("mt-1 text-xs text-gray-900")}>
          {usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE && (
            <>{t("standard_to_premium_username_description")}</>
          )}
        </p>
      )}

      {(usernameIsAvailable || premiumUsername) && currentUsername !== inputUsernameValue && (
        <div className="mt-2 flex justify-end sm:hidden">
          <ActionButtons index="mobile" />
        </div>
      )}
      <Dialog open={openDialogSaveUsername}>
        <DialogContent>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <div className="xs:hidden flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
              <Icon.Edit2 className="m-auto h-6 w-6" />
            </div>
            <div className="mb-4 w-full px-4 pt-1">
              <DialogHeader title={t("confirm_username_change_dialog_title")} />
              {usernameChangeCondition && usernameChangeCondition !== UsernameChangeStatusEnum.NORMAL && (
                <p className="-mt-4 mb-4 text-sm text-gray-800">
                  {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE &&
                    t("change_username_standard_to_premium")}
                  {usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE &&
                    t("change_username_premium_to_standard")}
                </p>
              )}

              <div className="flex w-full flex-wrap rounded-sm bg-gray-100 py-3 text-sm">
                <div className="flex-1 px-2">
                  <p className="text-gray-500">{t("current_username")}</p>
                  <p className="mt-1" data-testid="current-username">
                    {currentUsername}
                  </p>
                </div>
                <div className="ml-6 flex-1">
                  <p className="text-gray-500" data-testid="new-username">
                    {t("new_username")}
                  </p>
                  <p>{inputUsernameValue}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-row-reverse gap-x-2">
            {/* redirect to checkout */}
            {(usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE ||
              usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE) && (
              <Button
                type="button"
                loading={updateUsername.isLoading}
                data-testid="go-to-billing"
                href={`/api/integrations/stripepayment/subscription?intentUsername=${inputUsernameValue}`}>
                <>
                  {t("go_to_stripe_billing")} <Icon.ExternalLink className="ml-1 h-4 w-4" />
                </>
              </Button>
            )}
            {/* Normal save */}
            {usernameChangeCondition === UsernameChangeStatusEnum.NORMAL && (
              <Button
                type="button"
                loading={updateUsername.isLoading}
                data-testid="save-username"
                onClick={() => {
                  saveUsername();
                }}>
                {t("save")}
              </Button>
            )}
            <DialogClose asChild>
              <Button color="secondary" onClick={() => setOpenDialogSaveUsername(false)}>
                {t("cancel")}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { PremiumTextfield };
