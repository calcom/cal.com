import {
  CheckIcon,
  ExternalLinkIcon,
  PencilAltIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from "@heroicons/react/solid";
import classNames from "classnames";
import crypto from "crypto";
import { debounce } from "lodash";
import { GetServerSidePropsContext } from "next";
import { signOut } from "next-auth/react";
import { useRouter } from "next/router";
import {
  ComponentProps,
  FormEvent,
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TimezoneSelect, { ITimezone } from "react-timezone-select";

import { checkPremiumUsername, ResponseUsernameApi } from "@calcom/ee/lib/core/checkPremiumUsername";
import showToast from "@calcom/lib/notification";
import { Prisma } from "@calcom/prisma/client";
import { proratePreview, retrieveSubscriptionIdFromStripeCustomerId } from "@calcom/stripe/subscriptions";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTrigger } from "@calcom/ui/Dialog";
import { Input, Label } from "@calcom/ui/form/fields";

import { withQuery } from "@lib/QueryCell";
import { asStringOrNull, asStringOrUndefined } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { nameOfDay } from "@lib/core/i18n/weekday";
import { useLocale } from "@lib/hooks/useLocale";
import { isBrandingHidden } from "@lib/isBrandingHidden";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import ImageUploader from "@components/ImageUploader";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Avatar from "@components/ui/Avatar";
import Badge from "@components/ui/Badge";
import InfoBadge from "@components/ui/InfoBadge";
import ColorPicker from "@components/ui/colorpicker";
import Select from "@components/ui/form/Select";

import { AppRouter } from "@server/routers/_app";
import { TRPCClientErrorLike } from "@trpc/client";

import { UpgradeToProDialog } from "../../components/UpgradeToProDialog";

type Props = inferSSRProps<typeof getServerSideProps>;

function HideBrandingInput(props: { hideBrandingRef: RefObject<HTMLInputElement>; user: Props["user"] }) {
  const { user } = props;
  const { t } = useLocale();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <input
        id="hide-branding"
        name="hide-branding"
        type="checkbox"
        ref={props.hideBrandingRef}
        defaultChecked={isBrandingHidden(user)}
        className={
          "h-4 w-4 rounded-sm border-gray-300 text-neutral-900 focus:ring-neutral-800 disabled:opacity-50"
        }
        onClick={(e) => {
          if (!e.currentTarget.checked || user.plan !== "FREE") {
            return;
          }

          // prevent checking the input
          e.preventDefault();

          setModalOpen(true);
        }}
      />
      <UpgradeToProDialog modalOpen={modalOpen} setModalOpen={setModalOpen}>
        {t("remove_cal_branding_description")}
      </UpgradeToProDialog>
    </>
  );
}
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
  // @TODO: not use any
  setPremiumUsername: (value: boolean) => void;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

const CustomUsernameTextfield = (props: ICustomUsernameProps) => {
  const {
    currentUsername,
    setCurrentUsername,
    userIsPremium,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    premiumUsername,
    setPremiumUsername,
    subscriptionId,
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
        console.log(result.body);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const debouncedApiCall = useCallback(
    debounce(async (username) => {
      const { data } = await fetchUsername(username);
      console.log({ data });
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
      console.log({ condition });
      setUsernameChangeCondition(condition);
    }
    console.log("usernameIsAvailable changed", usernameIsAvailable);
  }, [usernameIsAvailable, premiumUsername]);

  useEffect(() => {
    async function fetchPreviewProrate(subscriptionId: string) {
      console.log({ subscriptionId }, "2");
      const result = await proratePreview({ subscriptionId });
      console.log({ result });
      return result;
    }
    if (
      subscriptionId &&
      usernameChangeCondition &&
      usernameChangeCondition !== UsernameChangeStatusEnum.NORMAL
    ) {
      console.log({ subscriptionId });
      fetchPreviewProrate(subscriptionId);
    }
    console.log("usernameChangeCondition changed", usernameChangeCondition, subscriptionId);
  }, [usernameChangeCondition]);

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
    console.log(usernameIsAvailable, premiumUsername, currentUsername, inputUsernameValue);
    return (usernameIsAvailable || premiumUsername) && currentUsername !== inputUsernameValue ? (
      <div className="flex flex-row">
        <Button
          type="button"
          className="mx-2"
          onClick={() => setOpenDialogSaveUsername(true)}
          data-testid={`update-username-btn-${index}`}>
          Update
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
          Cancel
        </Button>
      </div>
    ) : (
      <></>
    );
  };

  return (
    <>
      <div style={{ display: "flex", justifyItems: "center" }}>
        <Label htmlFor={"username"}>Username</Label>
        {subscriptionId}
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
          {usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE &&
            "This is a standard username and updating will take you to billing to downgrade."}
          {usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE && (
            <>
              This is a premium username. You will take you to billing to upgrade. Learn more.
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
                    "As you are changing from a standard to a premium username, you will be taken to the checkout to upgrade."}
                  {usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE &&
                    "As you are changing from a premium to a standard username, you will be taken to the checkout to downgrade."}
                </p>
              )}

              <div className="flex w-full flex-row rounded-sm bg-gray-100 py-3 text-sm">
                <div className="px-2">
                  <p className="text-gray-500">Current {userIsPremium ? "premium" : "standard"} username</p>
                  <p className="mt-1" data-testid="current-username">
                    {currentUsername}
                  </p>
                </div>
                <div className="ml-6">
                  <p className="text-gray-500" data-testid="new-username">
                    New {premiumUsername ? "premium" : ""} username
                  </p>
                  <p>{inputUsernameValue}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500">Learn more about premium usernames.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-row-reverse gap-x-2">
            {/* NOTE: refactor to to Button Simple responsibility */}
            {updateUsername.isSuccess ? "SUCCESS" : updateUsername.isSuccess.toString()}
            <Button
              type="button"
              loading={updateUsername.isLoading}
              data-testid="go-to-billing-or-save"
              onClick={async () => {
                let url = "";
                if (
                  // redirect to stripe
                  usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE ||
                  usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE
                ) {
                  await saveIntentUsername();
                  // redirect to checkout
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
                } else {
                  // Normal save
                  if (usernameChangeCondition === UsernameChangeStatusEnum.NORMAL) {
                    updateUsername.mutate({
                      username: inputUsernameValue,
                    });
                  }
                }
              }}>
              {usernameChangeCondition === UsernameChangeStatusEnum.NORMAL && "Save"}
              {(usernameChangeCondition === UsernameChangeStatusEnum.UPGRADE ||
                usernameChangeCondition === UsernameChangeStatusEnum.DOWNGRADE) && (
                <>
                  Go to billing <ExternalLinkIcon className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>

            <DialogClose asChild>
              <Button color="secondary" onClick={() => setOpenDialogSaveUsername(false)}>
                Cancel
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

function SettingsView(props: ComponentProps<typeof Settings> & { localeProp: string }) {
  const { user } = props;
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useContext();
  const onSuccessMutation = async () => {
    showToast(t("your_user_profile_updated_successfully"), "success");
    setHasErrors(false); // dismiss any open errors
    await utils.invalidateQueries(["viewer.me"]);
  };

  const onErrorMutation = (error: TRPCClientErrorLike<AppRouter>) => {
    setHasErrors(true);
    setErrorMessage(error.message);
    document?.getElementsByTagName("main")[0]?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: onSuccessMutation,
    onError: onErrorMutation,
    async onSettled() {
      await utils.invalidateQueries(["viewer.i18n"]);
    },
  });

  const deleteAccount = async () => {
    await fetch("/api/user/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((e) => {
      console.error(`Error Removing user: ${user.id}, email: ${user.email} :`, e);
    });
    if (process.env.NEXT_PUBLIC_WEBAPP_URL === "https://app.cal.com") {
      signOut({ callbackUrl: "/auth/logout?survey=true" });
    } else {
      signOut({ callbackUrl: "/auth/logout" });
    }
  };

  const localeOptions = useMemo(() => {
    return (router.locales || []).map((locale) => ({
      value: locale,
      label: new Intl.DisplayNames(props.localeProp, { type: "language" }).of(locale) || "",
    }));
  }, [props.localeProp, router.locales]);

  const themeOptions = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
  ];

  const timeFormatOptions = [
    { value: 12, label: t("12_hour") },
    { value: 24, label: t("24_hour") },
  ];
  const usernameRef = useRef<HTMLInputElement>(null!);
  const nameRef = useRef<HTMLInputElement>(null!);
  const emailRef = useRef<HTMLInputElement>(null!);
  const descriptionRef = useRef<HTMLTextAreaElement>(null!);
  const avatarRef = useRef<HTMLInputElement>(null!);
  const hideBrandingRef = useRef<HTMLInputElement>(null!);
  const allowDynamicGroupBookingRef = useRef<HTMLInputElement>(null!);
  const [selectedTheme, setSelectedTheme] = useState<typeof themeOptions[number] | undefined>();
  const [selectedTimeFormat, setSelectedTimeFormat] = useState({
    value: user.timeFormat || 12,
    label: timeFormatOptions.find((option) => option.value === user.timeFormat)?.label || 12,
  });
  const [selectedTimeZone, setSelectedTimeZone] = useState<ITimezone>(user.timeZone);
  const [selectedWeekStartDay, setSelectedWeekStartDay] = useState({
    value: user.weekStart,
    label: nameOfDay(props.localeProp, user.weekStart === "Sunday" ? 0 : 1),
  });

  const [selectedLanguage, setSelectedLanguage] = useState({
    value: props.localeProp || "",
    label: localeOptions.find((option) => option.value === props.localeProp)?.label || "",
  });
  const [imageSrc, setImageSrc] = useState<string>(user.avatar || "");
  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [brandColor, setBrandColor] = useState(user.brandColor);
  const [darkBrandColor, setDarkBrandColor] = useState(user.darkBrandColor);

  useEffect(() => {
    if (!user.theme) return;
    const userTheme = themeOptions.find((theme) => theme.value === user.theme);
    if (!userTheme) return;
    setSelectedTheme(userTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateProfileHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const enteredUsername = usernameRef.current.value.toLowerCase();
    const enteredName = nameRef.current.value;
    const enteredEmail = emailRef.current.value;
    const enteredDescription = descriptionRef.current.value;
    const enteredAvatar = avatarRef.current.value;
    const enteredBrandColor = brandColor;
    const enteredDarkBrandColor = darkBrandColor;
    const enteredTimeZone = typeof selectedTimeZone === "string" ? selectedTimeZone : selectedTimeZone.value;
    const enteredWeekStartDay = selectedWeekStartDay.value;
    const enteredHideBranding = hideBrandingRef.current.checked;
    const enteredAllowDynamicGroupBooking = allowDynamicGroupBookingRef.current.checked;
    const enteredLanguage = selectedLanguage.value;
    const enteredTimeFormat = selectedTimeFormat.value;

    // TODO: Add validation

    mutation.mutate({
      username: enteredUsername,
      name: enteredName,
      email: enteredEmail,
      bio: enteredDescription,
      avatar: enteredAvatar,
      timeZone: enteredTimeZone,
      weekStart: asStringOrUndefined(enteredWeekStartDay),
      hideBranding: enteredHideBranding,
      allowDynamicBooking: enteredAllowDynamicGroupBooking,
      theme: asStringOrNull(selectedTheme?.value),
      brandColor: enteredBrandColor,
      darkBrandColor: enteredDarkBrandColor,
      locale: enteredLanguage,
      timeFormat: enteredTimeFormat,
    });
  }
  const [currentUsername, setCurrentUsername] = useState(user.username || undefined);
  const [inputUsernameValue, setInputUsernameValue] = useState(currentUsername);
  const [usernameLock, setUsernameLock] = useState(true);
  const [premiumUsername, setPremiumUsername] = useState(user.isPremiumUsername);

  return (
    <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateProfileHandler}>
      {hasErrors && <Alert severity="error" title={errorMessage} />}
      <div className="py-6 lg:pb-8">
        <div className="flex flex-col lg:flex-row">
          <div className="flex-grow space-y-6">
            <div className="block rtl:space-x-reverse sm:flex sm:space-x-2">
              <div className="w-full">
                {/* <TextField
                  className={user.premiumUsername ? "border-r-0 border-yellow-300 border-l-gray-300" : ""}
                  name={user.premiumUsername ? "Premium Username" : "Username"}
                  addOnLeading={
                    <span
                      className={classNames(
                        "inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500",
                        user.premiumUsername ? "border-yellow-300 border-r-gray-300" : ""
                      )}>
                      {process.env.NEXT_PUBLIC_WEBSITE_URL}/
                    </span>
                  }
                  addOnEnding={
                    <StarIcon className="color-yellow-300 fill-none  border-1 w-8 border-l-0 border-yellow-300" />
                  }
                  ref={usernameRef}
                  defaultValue={user.username || undefined}
                  disabled={!!user.premiumUsername}
                /> */}
                <CustomUsernameTextfield
                  {...{
                    usernameRef,
                    currentUsername,
                    setCurrentUsername,
                    inputUsernameValue,
                    setInputUsernameValue,
                    usernameLock,
                    setUsernameLock,
                    premiumUsername,
                    setPremiumUsername,
                    userIsPremium: user.isPremiumUsername,
                    subscriptionId: user.subscriptionId,
                    onSuccessMutation,
                    onErrorMutation,
                  }}
                />
              </div>
            </div>
            <div className="block sm:flex">
              <div className="w-full">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  {t("full_name")}
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="given-name"
                  placeholder={t("your_name")}
                  required
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-800 focus:outline-none focus:ring-neutral-800 sm:text-sm"
                  defaultValue={user.name || undefined}
                />
              </div>
            </div>
            <div className="block sm:flex">
              <div className="mb-6 w-full sm:w-1/2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t("email")}
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  id="email"
                  placeholder={t("your_email")}
                  className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
                  defaultValue={user.email}
                />
                <p className="mt-2 text-sm text-gray-500" id="email-description">
                  {t("change_email_tip")}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                {t("about")}
              </label>
              <div className="mt-1">
                <textarea
                  ref={descriptionRef}
                  id="about"
                  name="about"
                  placeholder={t("little_something_about")}
                  rows={3}
                  defaultValue={user.bio || undefined}
                  className="mt-1 block w-full rounded-sm border-gray-300 shadow-sm focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"></textarea>
              </div>
            </div>
            <div>
              <div className="mt-1 flex">
                <Avatar
                  alt={user.name || ""}
                  className="relative h-10 w-10 rounded-full"
                  gravatarFallbackMd5={user.emailMd5}
                  imageSrc={imageSrc}
                />
                <input
                  ref={avatarRef}
                  type="hidden"
                  name="avatar"
                  id="avatar"
                  placeholder="URL"
                  className="mt-1 block w-full rounded-sm border border-gray-300 px-3 py-2 shadow-sm focus:border-neutral-800 focus:outline-none focus:ring-neutral-800 sm:text-sm"
                  defaultValue={imageSrc}
                />
                <div className="flex items-center px-5">
                  <ImageUploader
                    target="avatar"
                    id="avatar-upload"
                    buttonMsg={t("change_avatar")}
                    handleAvatarChange={(newAvatar) => {
                      avatarRef.current.value = newAvatar;
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype,
                        "value"
                      )?.set;
                      nativeInputValueSetter?.call(avatarRef.current, newAvatar);
                      const ev2 = new Event("input", { bubbles: true });
                      avatarRef.current.dispatchEvent(ev2);
                      updateProfileHandler(ev2 as unknown as FormEvent<HTMLFormElement>);
                      setImageSrc(newAvatar);
                    }}
                    imageSrc={imageSrc}
                  />
                </div>
              </div>
              <hr className="mt-6" />
            </div>
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                {t("language")}
              </label>
              <div className="mt-1">
                <Select
                  id="languageSelect"
                  value={selectedLanguage || props.localeProp}
                  onChange={(v) => v && setSelectedLanguage(v)}
                  className="mt-1 block w-full rounded-sm capitalize shadow-sm  sm:text-sm"
                  options={localeOptions}
                />
              </div>
            </div>
            <div>
              <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                {t("timezone")}
              </label>
              <div className="mt-1">
                <TimezoneSelect
                  id="timeZone"
                  value={selectedTimeZone}
                  onChange={(v) => v && setSelectedTimeZone(v)}
                  className="mt-1 block w-full rounded-sm shadow-sm sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700">
                {t("time_format")}
              </label>
              <div className="mt-1">
                <Select
                  id="timeFormatSelect"
                  value={selectedTimeFormat || user.timeFormat}
                  onChange={(v) => v && setSelectedTimeFormat(v)}
                  className="mt-1 block w-full rounded-sm  capitalize shadow-sm  sm:text-sm"
                  options={timeFormatOptions}
                />
              </div>
            </div>
            <div>
              <label htmlFor="weekStart" className="block text-sm font-medium text-gray-700">
                {t("first_day_of_week")}
              </label>
              <div className="mt-1">
                <Select
                  id="weekStart"
                  value={selectedWeekStartDay}
                  onChange={(v) => v && setSelectedWeekStartDay(v)}
                  className="mt-1 block w-full rounded-sm capitalize shadow-sm sm:text-sm"
                  options={[
                    { value: "Sunday", label: nameOfDay(props.localeProp, 0) },
                    { value: "Monday", label: nameOfDay(props.localeProp, 1) },
                  ]}
                />
              </div>
            </div>
            <div className="relative mt-8 flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="dynamic-group-booking"
                  name="dynamic-group-booking"
                  type="checkbox"
                  ref={allowDynamicGroupBookingRef}
                  defaultChecked={props.user.allowDynamicBooking || false}
                  className="h-4 w-4 rounded-sm border-gray-300 text-neutral-900 "
                />
              </div>
              <div className="text-sm ltr:ml-3 rtl:mr-3">
                <label
                  htmlFor="dynamic-group-booking"
                  className="flex items-center font-medium text-gray-700">
                  {t("allow_dynamic_booking")} <InfoBadge content={t("allow_dynamic_booking_tooltip")} />
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                {t("single_theme")}
              </label>
              <div className="my-1">
                <Select
                  id="theme"
                  isDisabled={!selectedTheme}
                  defaultValue={selectedTheme || themeOptions[0]}
                  value={selectedTheme || themeOptions[0]}
                  onChange={(v) => v && setSelectedTheme(v)}
                  className="mt-1 block w-full rounded-sm shadow-sm sm:text-sm"
                  options={themeOptions}
                />
              </div>
              <div className="relative mt-8 flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="theme-adjust-os"
                    name="theme-adjust-os"
                    type="checkbox"
                    onChange={(e) => setSelectedTheme(e.target.checked ? undefined : themeOptions[0])}
                    checked={!selectedTheme}
                    className="h-4 w-4 rounded-sm border-gray-300 text-neutral-900 "
                  />
                </div>
                <div className="text-sm ltr:ml-3 rtl:mr-3">
                  <label htmlFor="theme-adjust-os" className="font-medium text-gray-700">
                    {t("automatically_adjust_theme")}
                  </label>
                </div>
              </div>
            </div>
            <div className="block rtl:space-x-reverse sm:flex sm:space-x-2">
              <div className="mb-2 sm:w-1/2">
                <label htmlFor="brandColor" className="block text-sm font-medium text-gray-700">
                  {t("light_brand_color")}
                </label>
                <ColorPicker defaultValue={user.brandColor} onChange={setBrandColor} />
              </div>
              <div className="mb-2 sm:w-1/2">
                <label htmlFor="darkBrandColor" className="block text-sm font-medium text-gray-700">
                  {t("dark_brand_color")}
                </label>
                <ColorPicker defaultValue={user.darkBrandColor} onChange={setDarkBrandColor} />
              </div>
            </div>
            <div>
              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <HideBrandingInput user={user} hideBrandingRef={hideBrandingRef} />
                </div>
                <div className="text-sm ltr:ml-3 rtl:mr-3">
                  <label htmlFor="hide-branding" className="font-medium text-gray-700">
                    {t("disable_cal_branding")} {user.plan !== "PRO" && <Badge variant="default">PRO</Badge>}
                  </label>
                  <p className="text-gray-500">{t("disable_cal_branding_description")}</p>
                </div>
              </div>
            </div>
            <h3 className="text-md mt-7 font-bold leading-6 text-red-700">{t("danger_zone")}</h3>
            <div>
              <div className="relative flex items-start">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      color="warn"
                      StartIcon={TrashIcon}
                      className="border-2 border-red-700 text-red-700"
                      data-testid="delete-account">
                      {t("delete_account")}
                    </Button>
                  </DialogTrigger>
                  <ConfirmationDialogContent
                    variety="danger"
                    title={t("delete_account")}
                    confirmBtn={
                      <Button color="warn" data-testid="delete-account-confirm">
                        {t("confirm_delete_account")}
                      </Button>
                    }
                    onConfirm={() => deleteAccount()}>
                    {t("delete_account_confirmation_message")}
                  </ConfirmationDialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
        <hr className="mt-8" />
        <div className="flex justify-end py-4">
          <Button type="submit">{t("save")}</Button>
        </div>
      </div>
    </form>
  );
}

const WithQuery = withQuery(["viewer.i18n"]);

export default function Settings(props: Props) {
  const { t } = useLocale();

  return (
    <Shell heading={t("profile")} subtitle={t("edit_profile_info_description")}>
      <SettingsShell>
        <WithQuery success={({ data }) => <SettingsView {...props} localeProp={data.locale} />} />
      </SettingsShell>
    </Shell>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
      hideBranding: true,
      theme: true,
      plan: true,
      brandColor: true,
      darkBrandColor: true,
      metadata: true,
      timeFormat: true,
      allowDynamicBooking: true,
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }
  let subscriptionId = "";

  const stripeCustomerId = (user?.metadata as Prisma.JsonObject)?.stripeCustomerId as string;

  if (stripeCustomerId) {
    const retrieveResult = await retrieveSubscriptionIdFromStripeCustomerId(stripeCustomerId);
    subscriptionId = retrieveResult?.subscriptionId || "";
  }
  let isPremiumUsername = !!(user?.metadata as Prisma.JsonObject)?.premiumUsername as boolean;

  // if user is marked as no premiumUsername but its username could be due to length we check in remote
  if (!isPremiumUsername && user && user.username) {
    try {
      const checkUsernameResult = await checkPremiumUsername(user?.username);
      if (checkUsernameResult) {
        isPremiumUsername = checkUsernameResult.premium;
      }
    } catch (error) {
      console.error(error);
      // @TODO: report it to analytics
    }
  }
  return {
    props: {
      user: {
        ...user,
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
        subscriptionId,
        isPremiumUsername,
      },
    },
  };
};
