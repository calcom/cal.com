import { InformationCircleIcon } from "@heroicons/react/outline";
import crypto from "crypto";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { ComponentProps, FormEvent, RefObject, useEffect, useRef, useState, useMemo } from "react";
import Select, { OptionTypeBase } from "react-select";
import TimezoneSelect, { ITimezone } from "react-timezone-select";

import { QueryCell } from "@lib/QueryCell";
import { asStringOrNull, asStringOrUndefined } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { nameOfDay } from "@lib/core/i18n/weekday";
import { useLocale } from "@lib/hooks/useLocale";
import { isBrandingHidden } from "@lib/isBrandingHidden";
import showToast from "@lib/notification";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { Dialog, DialogClose, DialogContent } from "@components/Dialog";
import ImageUploader from "@components/ImageUploader";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";
import Badge from "@components/ui/Badge";
import Button from "@components/ui/Button";
import { UsernameInput } from "@components/ui/UsernameInput";

type Props = inferSSRProps<typeof getServerSideProps>;

function HideBrandingInput(props: { hideBrandingRef: RefObject<HTMLInputElement>; user: Props["user"] }) {
  const { t } = useLocale();
  const [modelOpen, setModalOpen] = useState(false);

  return (
    <>
      <input
        id="hide-branding"
        name="hide-branding"
        type="checkbox"
        ref={props.hideBrandingRef}
        defaultChecked={isBrandingHidden(props.user)}
        className={
          "focus:ring-neutral-500 h-4 w-4 text-neutral-900 border-gray-300 rounded-sm disabled:opacity-50"
        }
        onClick={(e) => {
          if (!e.currentTarget.checked || props.user.plan !== "FREE") {
            return;
          }

          // prevent checking the input
          e.preventDefault();

          setModalOpen(true);
        }}
      />
      <Dialog open={modelOpen}>
        <DialogContent>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
            <InformationCircleIcon className="w-6 h-6 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="mb-4 sm:flex sm:items-start">
            <div className="mt-3 sm:mt-0 sm:text-left">
              <h3 className="text-lg font-bold leading-6 text-gray-900 font-cal" id="modal-title">
                {t("only_available_on_pro_plan")}
              </h3>
            </div>
          </div>
          <div className="flex flex-col space-y-3">
            <p>{t("remove_cal_branding_description")}</p>

            <p>
              {" "}
              {t("to_upgrade_go_to")}{" "}
              <a href="https://cal.com/upgrade" className="underline">
                cal.com/upgrade
              </a>
              .
            </p>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-x-2">
            <DialogClose asChild>
              <Button
                className="table-cell text-center btn-wide btn-primary"
                onClick={() => setModalOpen(false)}>
                {t("dismiss")}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettingsView(props: ComponentProps<typeof Settings> & { localeProp: string }) {
  const utils = trpc.useContext();
  const { t } = useLocale();
  const router = useRouter();
  const mutation = trpc.useMutation("viewer.updateProfile", {
    onSuccess: () => {
      showToast(t("your_user_profile_updated_successfully"), "success");
      setHasErrors(false); // dismiss any open errors
    },
    onError: (err) => {
      setHasErrors(true);
      setErrorMessage(err.message);
      document?.getElementsByTagName("main")[0]?.scrollTo({ top: 0, behavior: "smooth" });
    },
    async onSettled() {
      await utils.invalidateQueries(["viewer.i18n"]);
    },
  });

  const localeOptions = useMemo(() => {
    return (router.locales || []).map((locale) => ({
      value: locale,
      // FIXME
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      label: new Intl.DisplayNames(props.localeProp, { type: "language" }).of(locale),
    }));
  }, [props.localeProp, router.locales]);

  const themeOptions = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
  ];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const usernameRef = useRef<HTMLInputElement>(null!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const nameRef = useRef<HTMLInputElement>(null!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const descriptionRef = useRef<HTMLTextAreaElement>(null!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const avatarRef = useRef<HTMLInputElement>(null!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const brandColorRef = useRef<HTMLInputElement>(null!);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const hideBrandingRef = useRef<HTMLInputElement>(null!);
  const [selectedTheme, setSelectedTheme] = useState<OptionTypeBase>();
  const [selectedTimeZone, setSelectedTimeZone] = useState<ITimezone>(props.user.timeZone);
  const [selectedWeekStartDay, setSelectedWeekStartDay] = useState<OptionTypeBase>({
    value: props.user.weekStart,
    label: nameOfDay(props.localeProp, props.user.weekStart === "Sunday" ? 0 : 1),
  });

  const [selectedLanguage, setSelectedLanguage] = useState<OptionTypeBase>({
    value: props.localeProp,
    label: localeOptions.find((option) => option.value === props.localeProp)?.label,
  });
  const [imageSrc, setImageSrc] = useState<string>(props.user.avatar || "");
  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setSelectedTheme(
      props.user.theme ? themeOptions.find((theme) => theme.value === props.user.theme) : undefined
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateProfileHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const enteredUsername = usernameRef.current.value.toLowerCase();
    const enteredName = nameRef.current.value;
    const enteredDescription = descriptionRef.current.value;
    const enteredAvatar = avatarRef.current.value;
    const enteredBrandColor = brandColorRef.current.value;
    const enteredTimeZone = typeof selectedTimeZone === "string" ? selectedTimeZone : selectedTimeZone.value;
    const enteredWeekStartDay = selectedWeekStartDay.value;
    const enteredHideBranding = hideBrandingRef.current.checked;
    const enteredLanguage = selectedLanguage.value;

    // TODO: Add validation

    mutation.mutate({
      username: enteredUsername,
      name: enteredName,
      bio: enteredDescription,
      avatar: enteredAvatar,
      timeZone: enteredTimeZone,
      weekStart: asStringOrUndefined(enteredWeekStartDay),
      hideBranding: enteredHideBranding,
      theme: asStringOrNull(selectedTheme?.value),
      brandColor: enteredBrandColor,
      locale: enteredLanguage,
    });
  }

  return (
    <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateProfileHandler}>
      {hasErrors && <Alert severity="error" title={errorMessage} />}
      <div className="py-6 lg:pb-8">
        <div className="flex flex-col lg:flex-row">
          <div className="flex-grow space-y-6">
            <div className="block sm:flex">
              <div className="w-full mb-6 sm:w-1/2 sm:mr-2">
                <UsernameInput ref={usernameRef} defaultValue={props.user.username || undefined} />
              </div>
              <div className="w-full sm:w-1/2 sm:ml-2">
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
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                  defaultValue={props.user.name || undefined}
                />
              </div>
            </div>

            <div className="block sm:flex">
              <div className="w-full mb-6 sm:w-1/2 sm:mr-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t("email")}
                </label>
                <input
                  type="text"
                  name="email"
                  id="email"
                  placeholder={t("your_email")}
                  disabled
                  className="block w-full px-3 py-2 mt-1 text-gray-500 border border-gray-300 rounded-l-sm bg-gray-50 sm:text-sm"
                  defaultValue={props.user.email}
                />
                <p className="mt-2 text-sm text-gray-500" id="email-description">
                  {t("change_email_contact")}{" "}
                  <a className="text-blue-500" href="mailto:help@cal.com">
                    help@cal.com
                  </a>
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
                  defaultValue={props.user.bio || undefined}
                  className="block w-full mt-1 border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"></textarea>
              </div>
            </div>
            <div>
              <div className="flex mt-1">
                <Avatar
                  alt={props.user.name || ""}
                  className="relative w-10 h-10 rounded-full"
                  gravatarFallbackMd5={props.user.emailMd5}
                  imageSrc={imageSrc}
                />
                <input
                  ref={avatarRef}
                  type="hidden"
                  name="avatar"
                  id="avatar"
                  placeholder="URL"
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                  defaultValue={imageSrc}
                />
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
                  onChange={setSelectedLanguage}
                  classNamePrefix="react-select"
                  className="block w-full mt-1 capitalize border border-gray-300 rounded-sm shadow-sm react-select-container focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
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
                  onChange={setSelectedTimeZone}
                  classNamePrefix="react-select"
                  className="block w-full mt-1 border border-gray-300 rounded-sm shadow-sm react-select-container focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
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
                  onChange={setSelectedWeekStartDay}
                  classNamePrefix="react-select"
                  className="block w-full mt-1 capitalize border border-gray-300 rounded-sm shadow-sm react-select-container focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                  options={[
                    { value: "Sunday", label: nameOfDay(props.localeProp, 0) },
                    { value: "Monday", label: nameOfDay(props.localeProp, 1) },
                  ]}
                />
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
                  onChange={setSelectedTheme}
                  className="shadow-sm | { value: string } focus:ring-neutral-500 focus:border-neutral-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-sm"
                  options={themeOptions}
                />
              </div>
              <div className="relative flex items-start mt-8">
                <div className="flex items-center h-5">
                  <input
                    id="theme-adjust-os"
                    name="theme-adjust-os"
                    type="checkbox"
                    onChange={(e) => setSelectedTheme(e.target.checked ? undefined : themeOptions[0])}
                    checked={!selectedTheme}
                    className="w-4 h-4 border-gray-300 rounded-sm focus:ring-neutral-500 text-neutral-900"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="theme-adjust-os" className="font-medium text-gray-700">
                    {t("automatically_adjust_theme")}
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="brandColor" className="block text-sm font-medium text-gray-700">
                {t("brand_color")}
              </label>
              <div className="flex mt-1">
                <input
                  ref={brandColorRef}
                  type="text"
                  name="brandColor"
                  id="brandColor"
                  placeholder="#hex-code"
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                  defaultValue={props.user.brandColor}
                />
              </div>
              <hr className="mt-6" />
            </div>
            <div>
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <HideBrandingInput user={props.user} hideBrandingRef={hideBrandingRef} />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="hide-branding" className="font-medium text-gray-700">
                    {t("disable_cal_branding")}{" "}
                    {props.user.plan !== "PRO" && <Badge variant="default">PRO</Badge>}
                  </label>
                  <p className="text-gray-500">{t("disable_cal_branding_description")}</p>
                </div>
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

export default function Settings(props: Props) {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.i18n"]);

  return (
    <Shell heading={t("profile")} subtitle={t("edit_profile_info_description")}>
      <SettingsShell>
        <QueryCell
          query={query}
          success={({ data }) => <SettingsView {...props} localeProp={data.locale} />}
        />
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
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }

  return {
    props: {
      user: {
        ...user,
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
    },
  };
};
