import { CheckIcon, ExternalLinkIcon, PencilAltIcon, StarIcon, XIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { debounce } from "lodash";
import { useCallback, MutableRefObject, useState, useEffect } from "react";

import { ResponseUsernameApi } from "@calcom/ee/lib/core/checkPremiumUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@calcom/ui/Dialog";
import { Input, Label } from "@calcom/ui/form/fields";

import { trpc } from "@lib/trpc";

import { AppRouter } from "@server/routers/_app";
import { TRPCClientErrorLike } from "@trpc/client";

const fetchUsername = async (username: string) => {
  const response = await fetch(`/api/username`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: username.trim() }),
    method: "POST",
    mode: "cors",
  });
  const data = (await response.json()) as ResponseUsernameApi;
  return { response, data };
};

export enum UsernameChangeStatusEnum {
  NORMAL = "NORMAL",
  UPGRADE = "UPGRADE",
  DOWNGRADE = "DOWNGRADE",
}

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername: (value: string | undefined) => void;
  userIsPremium: boolean;
  inputUsernameValue: string | undefined;
  usernameRef: MutableRefObject<HTMLInputElement>;
  premiumUsername: boolean;
  subscriptionId: string;
  setPremiumUsername: (value: boolean) => void;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

const CustomUsernameTextfield = (props: ICustomUsernameProps) => {
  const { t } = useLocale();
  const {
    currentUsername,
    setCurrentUsername,
    userIsPremium,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    premiumUsername,
    setPremiumUsername,
    onSuccessMutation,
    onErrorMutation,
  } = props;
  const [usernameIsAvailable, setUsernameIsAvailable] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);
  const [openDialogSaveUsername, setOpenDialogSaveUsername] = useState(false);
  const [usernameChangeCondition, setUsernameChangeCondition] = useState<UsernameChangeStatusEnum | null>(
    null
  );

  const saveIntentUsername = async () => {
    try {
      const result = await fetch("/api/intent-username", {
        method: "POST",
        body: JSON.stringify({ intentUsername: inputUsernameValue }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (result.ok) {
        await result.json();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const debouncedApiCall = useCallback(
    debounce(async (username) => {
      const { data } = await fetchUsername(username);
      if (data.premium && data.available) {
        setMarkAsError(false);
        setPremiumUsername(true);
        setUsernameIsAvailable(false);
      }

      if (!data.premium && data.available) {
        setMarkAsError(false);
        setUsernameIsAvailable(true);
        setPremiumUsername(false);
      }

      if (!data.available) {
        setMarkAsError(true);
        setUsernameIsAvailable(false);
        setPremiumUsername(false);
      }
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
      await utils.invalidateQueries(["viewer.i18n"]);
    },
  });

  const ActionButtons = (props: { index: string }) => {
    const { index } = props;
    return (usernameIsAvailable || premiumUsername) && currentUsername !== inputUsernameValue ? (
      <div className="flex flex-row">
        <Button
          type="button"
          className="mx-2"
          onClick={() => setOpenDialogSaveUsername(true)}
          data-testid={`update-username-btn-${index}`}>
          {t("update")}
        </Button>
        <Button
          type="button"
          color="minimal"
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

  const goToBillingPage = async () => {
    async () => {
      let url = "";
      await saveIntentUsername();

      url = "/api/integrations/stripepayment/subscription";
      const result = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: usernameChangeCondition?.toLowerCase(),
          isPremiumUsername: premiumUsername,
        }),
        method: "POST",
        mode: "cors",
      });
      const body = await result.json();
      window.location.href = body.url;
    };
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
        <Label htmlFor={"username"}>{t("username")}</Label>
      </div>
      <div className="mt-1 flex rounded-md shadow-sm">
        <span
          className={classNames(
            "inline-flex items-center rounded-l-sm border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500"
          )}>
          {process.env.NEXT_PUBLIC_WEBSITE_URL}/
        </span>
        <div style={{ position: "relative", width: "100%" }}>
          <Input
            ref={usernameRef}
            name={"username"}
            autoComplete={"none"}
            autoCapitalize={"none"}
            autoCorrect={"none"}
            className={classNames(
              "mt-0 rounded-l-none",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500 focus:border-red-500 focus:outline-none focus:ring-0"
                : ""
            )}
            defaultValue={currentUsername}
            onChange={(event) => setInputUsernameValue(event.target.value)}
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
                {premiumUsername ? <StarIcon className="mt-[4px] w-6" /> : <></>}
                {usernameIsAvailable ? <CheckIcon className="mt-[4px] w-6" /> : <></>}
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
          {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE && (
            <>
              {t("upgrade_and_go_to_billing")}
              {/* @TODO: Add learn more link */}
            </>
          )}
        </p>
      )}
      {(usernameIsAvailable || premiumUsername) && currentUsername !== inputUsernameValue && (
        <div className="mt-2 flex justify-end md:hidden">
          <ActionButtons index="mobile" />
        </div>
      )}
      <Dialog open={openDialogSaveUsername}>
        <DialogContent>
          <DialogClose asChild>
            <div className="fixed top-1 right-1 flex h-8 w-8 justify-center rounded-full hover:bg-gray-200">
              <XIcon className="w-4" />
            </div>
          </DialogClose>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <div className="xs:hidden flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
              <PencilAltIcon className="m-auto h-6 w-6"></PencilAltIcon>
            </div>
            <div className="mb-4 w-full px-4 pt-1">
              <DialogHeader title={"Confirm username change"} />
              {usernameChangeCondition && usernameChangeCondition !== UsernameChangeStatusEnum.NORMAL && (
                <p className="-mt-4 mb-4 text-sm text-gray-800">
                  {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE &&
                    t("change_username_standard_to_premium")}
                  {usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE &&
                    t("change_username_premium_to_standard")}
                </p>
              )}

              <div className="flex w-full flex-row rounded-sm bg-gray-100 py-3 text-sm">
                <div className="px-2">
                  <p className="text-gray-500">
                    {t("current")} {userIsPremium ? t("premium") : t("standard")} {t("username")}
                  </p>
                  <p className="mt-1" data-testid="current-username">
                    {currentUsername}
                  </p>
                </div>
                <div className="ml-6">
                  <p className="text-gray-500" data-testid="new-username">
                    {t("new")} {premiumUsername ? t("premium") : ""} {t("username")}
                  </p>
                  <p>{inputUsernameValue}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500">{t("more_info_premium_username")}</p>
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
                onClick={async () => goToBillingPage()}>
                <>
                  {t("go_to_stripe_billing")} <ExternalLinkIcon className="ml-1 h-4 w-4" />
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

export { CustomUsernameTextfield };
