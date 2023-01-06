import classNames from "classnames";
import { debounce, noop } from "lodash";
import { useRouter } from "next/router";
import { RefCallback, useEffect, useMemo, useState } from "react";

import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { User } from "@calcom/prisma/client";
import { TRPCClientErrorLike } from "@calcom/trpc/client";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Button, Dialog, DialogClose, DialogContent, DialogHeader, Icon, Input, Label } from "@calcom/ui";

export enum UsernameChangeStatusEnum {
  UPGRADE = "UPGRADE",
}

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername?: (newUsername: string) => void;
  inputUsernameValue: string | undefined;
  usernameRef: RefCallback<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
  user: Pick<User, "username" | "metadata">;
  readonly?: boolean;
}

const obtainNewUsernameChangeCondition = ({
  userIsPremium,
  isNewUsernamePremium,
}: {
  userIsPremium: boolean;
  isNewUsernamePremium: boolean;
  stripeCustomer: RouterOutputs["viewer"]["stripeCustomer"] | undefined;
}) => {
  if (!userIsPremium && isNewUsernamePremium) {
    return UsernameChangeStatusEnum.UPGRADE;
  }
};

const PremiumTextfield = (props: ICustomUsernameProps) => {
  const { t } = useLocale();
  const {
    currentUsername,
    setCurrentUsername = noop,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    onSuccessMutation,
    onErrorMutation,
    readonly: disabled,
    user,
  } = props;
  const [usernameIsAvailable, setUsernameIsAvailable] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);
  const router = useRouter();
  const { paymentStatus: recentAttemptPaymentStatus } = router.query;
  const [openDialogSaveUsername, setOpenDialogSaveUsername] = useState(false);
  const { data: stripeCustomer } = trpc.viewer.stripeCustomer.useQuery();
  const isCurrentUsernamePremium =
    user && user.metadata && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;
  const [isInputUsernamePremium, setIsInputUsernamePremium] = useState(false);
  const debouncedApiCall = useMemo(
    () =>
      debounce(async (username: string) => {
        const { data } = await fetchUsername(username);
        setMarkAsError(!data.available && !!currentUsername && username !== currentUsername);
        setIsInputUsernamePremium(data.premium);
        setUsernameIsAvailable(data.available);
      }, 150),
    [currentUsername]
  );

  useEffect(() => {
    // Use the current username or if it's not set, use the one available from stripe
    setInputUsernameValue(currentUsername || stripeCustomer?.username || "");
  }, [setInputUsernameValue, currentUsername, stripeCustomer?.username]);

  useEffect(() => {
    if (!inputUsernameValue) {
      debouncedApiCall.cancel();
      return;
    }
    debouncedApiCall(inputUsernameValue);
  }, [debouncedApiCall, inputUsernameValue]);

  const utils = trpc.useContext();
  const updateUsername = trpc.viewer.updateProfile.useMutation({
    onSuccess: async () => {
      onSuccessMutation && (await onSuccessMutation());
      setOpenDialogSaveUsername(false);
    },
    onError: (error) => {
      onErrorMutation && onErrorMutation(error);
    },
    async onSettled() {
      await utils.viewer.public.i18n.invalidate();
    },
  });

  // when current username isn't set - Go to stripe to check what username he wanted to buy and was it a premium and was it paid for
  const paymentRequired = !currentUsername && stripeCustomer?.isPremium;

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
    if ((usernameIsAvailable || isInputUsernamePremium) && currentUsername !== inputUsernameValue) {
      return (
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
              }
            }}>
            {t("cancel")}
          </Button>
        </div>
      );
    }
    return <></>;
  };

  const saveUsername = () => {
    if (usernameChangeCondition !== UsernameChangeStatusEnum.UPGRADE) {
      updateUsername.mutate({
        username: inputUsernameValue,
      });
      setCurrentUsername(inputUsernameValue);
    }
  };

  let paymentMsg = !currentUsername ? (
    <span className="text-xs text-orange-400">
      You need to reserve your premium username for {getPremiumPlanPriceValue()}
    </span>
  ) : null;

  if (recentAttemptPaymentStatus && recentAttemptPaymentStatus !== "paid") {
    paymentMsg = (
      <span className="text-sm text-red-500">
        Your payment could not be completed. Your username is still not reserved
      </span>
    );
  }

  return (
    <div>
      <div className="flex justify-items-center">
        <Label htmlFor="username">{t("username")}</Label>
      </div>
      <div className="mt-2 flex rounded-md">
        <span
          className={classNames(
            isInputUsernamePremium ? "border-1 border-orange-400 " : "",
            "hidden h-9 items-center rounded-l-md border border-r-0 border-gray-300 border-r-gray-300 bg-gray-50 px-3 text-sm text-gray-500 md:inline-flex"
          )}>
          {process.env.NEXT_PUBLIC_WEBSITE_URL.replace("https://", "").replace("http://", "")}/
        </span>

        <div className="relative w-full">
          <Input
            ref={usernameRef}
            name="username"
            autoComplete="none"
            autoCapitalize="none"
            autoCorrect="none"
            disabled={disabled}
            className={classNames(
              "border-l-1 mb-0 mt-0 rounded-md rounded-l-none font-sans text-sm leading-4 focus:!ring-0",
              isInputUsernamePremium
                ? "border-1 focus:border-1 border-orange-400 focus:border-orange-400"
                : "border-1 focus:border-2",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500  focus:border-red-500 focus:outline-none"
                : "border-l-gray-300",
              disabled ? "bg-gray-100 text-gray-400 focus:border-0" : ""
            )}
            value={inputUsernameValue}
            onChange={(event) => {
              event.preventDefault();
              // Reset payment status
              delete router.query.paymentStatus;
              setInputUsernameValue(event.target.value);
            }}
            data-testid="username-input"
          />
          <div className="absolute top-0 right-2 flex flex-row">
            <span
              className={classNames(
                "mx-2 py-1",
                isInputUsernamePremium ? "text-orange-400" : "",
                usernameIsAvailable ? "" : ""
              )}>
              {isInputUsernamePremium ? <Icon.StarIconSolid className="mt-[2px] w-6" /> : <></>}
              {!isInputUsernamePremium && usernameIsAvailable ? <Icon.FiCheck className="mt-2 w-6" /> : <></>}
            </span>
          </div>
        </div>

        {(usernameIsAvailable || isInputUsernamePremium) && currentUsername !== inputUsernameValue && (
          <div className="flex justify-end">
            <ActionButtons />
          </div>
        )}
      </div>
      {paymentMsg}
      {markAsError && <p className="mt-1 text-xs text-red-500">Username is already taken</p>}

      <Dialog open={openDialogSaveUsername}>
        <DialogContent>
          <div className="flex flex-row">
            <div className="xs:hidden flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
              <Icon.FiEdit2 className="m-auto h-6 w-6" />
            </div>
            <div className="mb-4 w-full px-4 pt-1">
              <DialogHeader title={t("confirm_username_change_dialog_title")} />
              {usernameChangeCondition && usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE && (
                <p className="mb-4 text-sm text-gray-800">{t("change_username_standard_to_premium")}</p>
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
            {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE && (
              <Button
                type="button"
                loading={updateUsername.isLoading}
                data-testid="go-to-billing"
                href={paymentLink}>
                <>
                  {t("go_to_stripe_billing")} <Icon.FiExternalLink className="ml-1 h-4 w-4" />
                </>
              </Button>
            )}
            {/* Normal save */}
            {usernameChangeCondition !== UsernameChangeStatusEnum.UPGRADE && (
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
            <DialogClose color="secondary" onClick={() => setOpenDialogSaveUsername(false)}>
              {t("cancel")}
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { PremiumTextfield };
