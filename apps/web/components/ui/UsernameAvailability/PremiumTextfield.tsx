import { StarIcon as StarIconSolid } from "@heroicons/react/solid";
import classNames from "classnames";
import { debounce, noop } from "lodash";
import { useRouter } from "next/router";
import type { RefCallback } from "react";
import { useEffect, useMemo, useState } from "react";

import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Button, Dialog, DialogClose, DialogContent, Input, Label } from "@calcom/ui";
import { Check, Edit2, ExternalLink } from "@calcom/ui/components/icon";

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
      <div className="flex rounded-md">
        <span
          className={classNames(
            isInputUsernamePremium ? "border border-orange-400 " : "",
            "border-default bg-muted text-subtle hidden h-9 items-center rounded-l-md border border-r-0 px-3 text-sm md:inline-flex"
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
                ? "border border-orange-400 focus:border focus:border-orange-400"
                : "border focus:border",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500  focus:border-red-500 focus:outline-none"
                : "border-l-default",
              disabled ? "bg-subtle text-muted focus:border-0" : ""
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
                "mx-2 py-2",
                isInputUsernamePremium ? "text-orange-400" : "",
                usernameIsAvailable ? "" : ""
              )}>
              {isInputUsernamePremium ? <StarIconSolid className="mt-[2px] h-4 w-4" /> : <></>}
              {!isInputUsernamePremium && usernameIsAvailable ? <Check className="mt-2 h-4 w-4" /> : <></>}
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
        <DialogContent
          Icon={Edit2}
          title={t("confirm_username_change_dialog_title")}
          description={
            <>
              {usernameChangeCondition && usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE && (
                <p className="text-default mb-4 text-sm">{t("change_username_standard_to_premium")}</p>
              )}
            </>
          }>
          <div className="flex flex-row">
            <div className="mb-4 w-full px-4 pt-1">
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
            {/* redirect to checkout */}
            {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE && (
              <Button
                type="button"
                loading={updateUsername.isLoading}
                data-testid="go-to-billing"
                href={paymentLink}>
                <>
                  {t("go_to_stripe_billing")} <ExternalLink className="ml-1 h-4 w-4" />
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
