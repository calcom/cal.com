import crypto from "crypto";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useEffect, useRef, useState } from "react";
import Select from "react-select";
import TimezoneSelect from "react-timezone-select";

import { asStringOrNull, asStringOrUndefined } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { extractLocaleInfo, localeLabels, localeOptions, OptionType } from "@lib/core/i18n/i18n.utils";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";

import Modal from "@components/Modal";
import SettingsShell from "@components/SettingsShell";
import Shell from "@components/Shell";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";
import Button from "@components/ui/Button";
import { UsernameInput } from "@components/ui/UsernameInput";

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function Settings(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { locale } = useLocale({ localeProp: props.localeProp });
  const mutation = trpc.useMutation("viewer.updateProfile");

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>();
  const avatarRef = useRef<HTMLInputElement>(null);
  const hideBrandingRef = useRef<HTMLInputElement>(null);
  const [asyncUseCalendar, setAsyncUseCalendar] = useState({ value: props.user.asyncUseCalendar });
  const [selectedTheme, setSelectedTheme] = useState({ value: props.user.theme });
  const [selectedTimeZone, setSelectedTimeZone] = useState({ value: props.user.timeZone });
  const [selectedWeekStartDay, setSelectedWeekStartDay] = useState({ value: props.user.weekStart });
  const [selectedLanguage, setSelectedLanguage] = useState<OptionType>({
    value: locale,
    label: props.localeLabels[locale],
  });
  const [imageSrc] = useState<string>(props.user.avatar);
  const [hasErrors, setHasErrors] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setSelectedTheme(
      props.user.theme ? themeOptions.find((theme) => theme.value === props.user.theme) : null
    );
    setSelectedWeekStartDay({ value: props.user.weekStart, label: props.user.weekStart });
    setSelectedLanguage({ value: locale, label: props.localeLabels[locale] });
  }, []);

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
  };

  async function updateProfileHandler(event) {
    event.preventDefault();

    const enteredUsername = usernameRef.current.value.toLowerCase();
    const enteredName = nameRef.current.value;
    const enteredDescription = descriptionRef.current.value;
    const enteredAvatar = avatarRef.current.value;
    const enteredTimeZone = selectedTimeZone.value;
    const enteredWeekStartDay = selectedWeekStartDay.value;
    const enteredHideBranding = hideBrandingRef.current.checked;
    const enteredAsyncUseCalendar = asyncUseCalendar.value;
    const enteredLanguage = selectedLanguage.value;

    // TODO: Add validation

    await mutation
      .mutateAsync({
        username: enteredUsername,
        name: enteredName,
        bio: enteredDescription,
        avatar: enteredAvatar,
        timeZone: enteredTimeZone,
        weekStart: asStringOrUndefined(enteredWeekStartDay),
        hideBranding: enteredHideBranding,
        theme: asStringOrNull(selectedTheme?.value),
        locale: enteredLanguage,
        asyncUseCalendar: enteredAsyncUseCalendar,
      })
      .then(() => {
        setSuccessModalOpen(true);
        setHasErrors(false); // dismiss any open errors
      })
      .catch((err) => {
        setHasErrors(true);
        setErrorMessage(err.message);
        document?.getElementsByTagName("main")[0]?.scrollTo({ top: 0, behavior: "smooth" });
      });
  }

  return (
    <Shell heading="Profile" subtitle="Edit your profile information, which shows on your scheduling link.">
      <SettingsShell>
        <form className="divide-y divide-gray-200 lg:col-span-9" onSubmit={updateProfileHandler}>
          {hasErrors && <Alert severity="error" title={errorMessage} />}
          <div className="py-6 lg:pb-8">
            <div className="flex flex-col lg:flex-row">
              <div className="flex-grow space-y-6">
                <div className="block sm:flex">
                  <div className="w-full mb-6 sm:w-1/2 sm:mr-2">
                    <UsernameInput disabled ref={usernameRef} defaultValue={props.user.username} />
                  </div>
                  <div className="w-full sm:w-1/2 sm:ml-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full name
                    </label>
                    <input
                      disabled
                      ref={nameRef}
                      type="text"
                      name="name"
                      id="name"
                      autoComplete="given-name"
                      placeholder="Your name"
                      required
                      className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-600 bg-gray-300 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                      defaultValue={props.user.name}
                    />
                  </div>
                </div>

                <div className="block sm:flex">
                  <div className="w-full mb-6 sm:w-1/2 sm:mr-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="text"
                      name="email"
                      id="email"
                      placeholder="Your email"
                      disabled
                      className="block w-full px-3 py-2 mt-1 text-gray-500 border border-gray-300 rounded-l-sm bg-gray-50 sm:text-sm"
                      defaultValue={props.user.email}
                    />
                    <p className="mt-2 text-sm text-gray-500" id="email-description">
                      To change your email, please contact{" "}
                      <a className="text-blue-500" href="mailto:help@cal.com">
                        help@cal.com
                      </a>
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                    About
                  </label>
                  <div className="mt-1">
                    <textarea
                      ref={descriptionRef}
                      id="about"
                      name="about"
                      placeholder="A little something about yourself."
                      rows={3}
                      defaultValue={props.user.bio}
                      className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-600 bg-gray-300 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"></textarea>
                  </div>
                </div>
                <div>
                  <div className="flex mt-1">
                    <Avatar
                      displayName={props.user.name}
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
                    {/* <ImageUploader
                      noChange
                      target="avatar"
                      id="avatar-upload"
                      buttonMsg="Change avatar"
                      handleAvatarChange={handleAvatarChange}
                      imageSrc={imageSrc}
                    /> */}
                  </div>
                  <hr className="mt-6" />
                </div>
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                    Language
                  </label>
                  <div className="mt-1">
                    <Select
                      id="languageSelect"
                      value={selectedLanguage || locale}
                      onChange={setSelectedLanguage}
                      classNamePrefix="react-select"
                      className="block w-full mt-1 border border-gray-300 rounded-sm shadow-sm react-select-container focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                      options={props.localeOptions}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                    Timezone
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
                    First Day of Week
                  </label>
                  <div className="mt-1">
                    <Select
                      id="weekStart"
                      value={selectedWeekStartDay}
                      onChange={setSelectedWeekStartDay}
                      classNamePrefix="react-select"
                      className="block w-full mt-1 border border-gray-300 rounded-sm shadow-sm react-select-container focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                      options={[
                        { value: "Sunday", label: "Sunday" },
                        { value: "Monday", label: "Monday" },
                      ]}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                    Single Theme
                  </label>
                  <div className="my-1">
                    <Select
                      id="theme"
                      isDisabled={!selectedTheme}
                      defaultValue={selectedTheme || themeOptions[0]}
                      value={selectedTheme || themeOptions[0]}
                      onChange={setSelectedTheme}
                      className="block w-full mt-1 border-gray-300 rounded-sm shadow-sm focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                      options={themeOptions}
                    />
                  </div>
                  <div className="relative flex items-start mt-8">
                    <div className="flex items-center h-5">
                      <input
                        id="async-use-calendar"
                        name="async-use-calendar"
                        type="checkbox"
                        onChange={(e) => setAsyncUseCalendar({ value: e.target.checked })}
                        defaultChecked={asyncUseCalendar.value}
                        className="w-4 h-4 border-gray-300 rounded-sm hover:checked:bg-black checked:bg-black focus:ring-neutral-500 text-neutral-900"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="async-use-calendar" className="font-medium text-gray-700">
                        Async meetings schedule a space in your calendar
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/*<div className="flex-grow mt-6 lg:mt-0 lg:ml-6 lg:flex-grow-0 lg:flex-shrink-0">
                <p className="mb-2 text-sm font-medium text-gray-700" aria-hidden="true">
                  Photo
                </p>
                <div className="mt-1 lg:hidden">
                  <div className="flex items-center">
                    <div
                      className="flex-shrink-0 inline-block w-12 h-12 overflow-hidden rounded-full"
                      aria-hidden="true">
                      <Avatar user={props.user} className="w-full h-full rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="relative hidden overflow-hidden rounded-full lg:block">
                  <Avatar
                    user={props.user}
                    className="relative w-40 h-40 rounded-full"
                    fallback={<div className="relative w-40 h-40 rounded-full bg-neutral-900"></div>}
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
                    Avatar URL
                  </label>
                  <input
                    ref={avatarRef}
                    type="text"
                    name="avatar"
                    id="avatar"
                    placeholder="URL"
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-sm shadow-sm focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
                    defaultValue={props.user.avatar}
                  />
                </div>
              </div>*/}
            </div>
            <hr className="mt-8" />
            <div className="flex justify-end py-4">
              <Button type="submit">Save</Button>
            </div>
          </div>
        </form>
        <Modal
          heading="Profile updated successfully"
          description="Your user profile has been updated successfully."
          open={successModalOpen}
          handleClose={closeSuccessModal}
        />
      </SettingsShell>
    </Shell>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);
  const locale = await extractLocaleInfo(context.req);

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
      asyncUseCalendar: true,
    },
  });

  if (!user) {
    throw new Error("User seems logged in but cannot be found in the db");
  }

  return {
    props: {
      session,
      localeProp: locale,
      localeOptions,
      localeLabels,
      user: {
        ...user,
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
};
