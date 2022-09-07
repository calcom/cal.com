import classNames from "classnames";
import { debounce } from "lodash";
import { useRouter } from "next/router";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { getPremiumPlanMode, getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User } from "@calcom/prisma/client";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@calcom/ui/Dialog";
import { Icon, StarIconSolid } from "@calcom/ui/Icon";
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
  disabled: boolean;
}

const enum PremiumUsernameStatus {
  PREMIUM_AND_PAID_FOR = "PREMIUM_AND_PAID_FOR",
  PREMIUM_AND_NOT_PAID_FOR = "PREMIUM_AND_NOT_PAID_FOR",
  NOT_PREMIUM = "NOT_PREMIUM",
}

const obtainNewUsernameChangeCondition = ({
  userIsPremium,
  isNewUsernamePremium,
  stripeCustomer,
}: {
  userIsPremium: boolean;
  isNewUsernamePremium: boolean;
  stripeCustomer;
}) => {
  let resultCondition: UsernameChangeStatusEnum;
  if (!userIsPremium && isNewUsernamePremium && !stripeCustomer?.paidForPremium) {
    resultCondition = UsernameChangeStatusEnum.UPGRADE;
  } else if (userIsPremium && !isNewUsernamePremium && getPremiumPlanMode() === "subscription") {
    resultCondition = UsernameChangeStatusEnum.DOWNGRADE;
  } else {
    resultCondition = UsernameChangeStatusEnum.NORMAL;
  }
  return resultCondition;
};

const useIsUsernamePremium = (username) => {
  const [isCurrentUsernamePremium, setIsCurrentUsernamePremium] = useState(false);
  useEffect(() => {
    (async () => {
      if (!username) {
        return;
      }
      const { data } = await fetchUsername(username);
      setIsCurrentUsernamePremium(data.premium);
    })();
  }, [username]);
  return isCurrentUsernamePremium;
};

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
    disabled,
  } = props;
  const [usernameIsAvailable, setUsernameIsAvailable] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);
  const router = useRouter();
  const { paymentStatus: recentAttemptPaymentStatus } = router.query;
  const [openDialogSaveUsername, setOpenDialogSaveUsername] = useState(false);
  const { data: stripeCustomer } = trpc.useQuery(["viewer.stripeCustomer"]);
  const isCurrentUsernamePremium = useIsUsernamePremium(currentUsername);
  const [isInputUsernamePremium, setIsInputUsernamePremium] = useState(false);

  const debouncedApiCall = useCallback(
    debounce(async (username) => {
      const { data } = await fetchUsername(username);
      setMarkAsError(!data.available && username !== currentUsername);
      setIsInputUsernamePremium(data.premium);
      setUsernameIsAvailable(data.available);
    }, 150),
    []
  );

  useEffect(() => {
    // Use the current username or if it's not set, use the one available from stripe
    setInputUsernameValue(currentUsername || stripeCustomer?.username);
  }, [setInputUsernameValue, currentUsername, stripeCustomer?.username]);

  useEffect(() => {
    if (!inputUsernameValue) {
      return;
    }
    debouncedApiCall(inputUsernameValue);
  }, [debouncedApiCall, inputUsernameValue]);

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

  // Username is premium hasn't been paid for
  const paymentRequired = stripeCustomer?.isPremium && !stripeCustomer?.paidForPremium;

  const usernameChangeCondition = obtainNewUsernameChangeCondition({
    userIsPremium: isCurrentUsernamePremium,
    isNewUsernamePremium: isInputUsernamePremium,
    stripeCustomer,
  });

  const usernameFromStripe = stripeCustomer?.username;

  const paymentLink = `/api/integrations/stripepayment/subscription?intentUsername=${
    inputUsernameValue || usernameFromStripe
  }&action=${usernameChangeCondition}&callbackUrl=${router.asPath}`;

  const ActionButtons = () => {
    if (paymentRequired) {
      return (
        <div className="flex flex-row">
          <Button
            type="button"
            color="primary"
            className="mx-2"
            href={paymentLink}
            data-testid="reserve-username-btn">
            {t("Reserve")}
          </Button>
        </div>
      );
    }
    return (usernameIsAvailable || isInputUsernamePremium) && currentUsername !== inputUsernameValue ? (
      <div className="flex flex-row">
        <Button
          type="button"
          color="primary"
          className="mx-2"
          onClick={() => setOpenDialogSaveUsername(true)}
          data-testid="update-username-btn">
          {t("update")}
        </Button>
        <Button
          type="button"
          color="secondary"
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
            isInputUsernamePremium ? "border-2 border-orange-400 " : "",
            "hidden items-center rounded-l-sm border border-r-0 border-gray-300 border-r-gray-300 bg-gray-50 px-3 text-sm text-gray-500 md:inline-flex"
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
            disabled={disabled}
            className={classNames(
              "mt-0 rounded-l-none border-l-2 focus:!ring-0",
              isInputUsernamePremium
                ? "border-2 border-orange-400 focus:border-2 focus:border-orange-400"
                : "border-2 focus:border-2",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500  focus:border-red-500 focus:outline-none"
                : "border-l-gray-300 "
            )}
            value={inputUsernameValue}
            onChange={(event) => {
              event.preventDefault();
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
          />
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
                isInputUsernamePremium ? "text-orange-400" : "",
                usernameIsAvailable ? "" : ""
              )}>
              {isInputUsernamePremium ? <StarIconSolid className="mt-[4px] w-6" /> : <></>}
              {!isInputUsernamePremium && usernameIsAvailable ? (
                <Icon.FiCheck className="mt-[7px] w-6" />
              ) : (
                <></>
              )}
            </span>
          </div>
        </div>

        {(usernameIsAvailable || isInputUsernamePremium) && currentUsername !== inputUsernameValue && (
          <div className="flex justify-end">
            <ActionButtons />
          </div>
        )}
      </div>
      {paymentRequired ? (
        recentAttemptPaymentStatus && recentAttemptPaymentStatus !== "paid" ? (
          <span className="text-sm text-red-500">
            Your payment could not be completed. Your username is still not reserved
          </span>
        ) : (
          <span className="text-xs text-orange-400">
            You need to reserve your premium username for {getPremiumPlanPriceValue()}
          </span>
        )
      ) : null}
      {markAsError && <p className="mt-1 text-xs text-red-500">Username is already taken</p>}

      {usernameIsAvailable && (
        <p className={classNames("mt-1 text-xs text-gray-900")}>
          {usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE && (
            <>{t("premium_to_standard_username_description")}</>
          )}
        </p>
      )}

      <Dialog open={openDialogSaveUsername}>
        <DialogContent>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <div className="xs:hidden flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
              <Icon.FiEdit2 className="m-auto h-6 w-6" />
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
                href={paymentLink}>
                <>
                  {t("Pay")} <Icon.FiExternalLink className="ml-1 h-4 w-4" />
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
