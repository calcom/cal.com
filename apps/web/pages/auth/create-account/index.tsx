import { Trans } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Icon } from "@calcom/ui";
import { Button, Input, PasswordField } from "@calcom/ui/v2";
import Divider from "@calcom/ui/v2/core/Divider";

import { LinkText } from "@components/ui/LinkText";
import { UsernameAvailability } from "@components/ui/UsernameAvailability";

const CreateAccount = () => {
  const { t } = useLocale();
  const router = useRouter();
  const [currentUsername, setCurrentUsername] = useState<string | undefined>();
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [inputUsernameValue, setInputUsernameValue] = useState(currentUsername);
  const usernameRef = useRef<HTMLInputElement>(null!);

  const { handleSubmit, control, setValue, trigger, register, formState } = useForm<{
    username: string;
    email: string;
    password: string;
  }>({
    defaultValues: {
      username: currentUsername,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (data.email && data.password && currentUsername) {
      try {
        if (!isPremium) {
          const response = await fetch("/api/auth/signup", {
            method: "POST",
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: currentUsername,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          if (response.ok && response.status === 201) {
            showToast(t("account_created"), "success");
            router.push("/auth/login");
            return;
          }
          if (response.status === 409) {
            response.json().then((data) => {
              console.error(data?.message);
              showToast(data?.message, "error");
            });
          }
        } else {
          const response = await fetch(`http://localhost:3001/api/signup`, {
            method: "POST",
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              username: currentUsername,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            mode: "cors",
          });
          console.log(response);
        }
      } catch (error) {
        showToast(t("error_creating_account"), "error");
      }
    } else {
      console.error("Missing form data");
      await trigger();
    }
  });
  return (
    <div className="flex h-[100vh] flex-row bg-white p-8 sm:p-0">
      <div className="mx-auto my-auto max-w-[480px]">
        <h1 className="font-cal mb-10 text-[28px] leading-7">{t("create_calcom_account")}</h1>
        <form onSubmit={onSubmit} autoComplete="off">
          <UsernameAvailability
            currentUsername={currentUsername}
            setCurrentUsername={setCurrentUsername}
            inputUsernameValue={inputUsernameValue}
            usernameRef={usernameRef}
            setInputUsernameValue={setInputUsernameValue}
            blockUpdate
            setIsPremium={!IS_SELF_HOSTED ? setIsPremium : undefined}
          />
          {formState.isSubmitted && currentUsername === undefined && (
            <p className="font-sans text-xs font-light leading-5 text-red-500">{t("required")}</p>
          )}
          <label htmlFor="email" className="mb-2 mt-6 block text-sm font-medium text-gray-700">
            {t("email")}
          </label>
          <div className="mb-6">
            <Input className="mb-0" type="email" {...register("email", { required: true })} />
            {formState.errors.email && (
              <p className="font-sans text-xs font-light leading-5 text-red-500">{t("required")}</p>
            )}
          </div>
          <Controller
            name="password"
            control={control}
            render={({ field: { onBlur, onChange, value } }) => (
              <div className="mt-1 mb-6">
                <PasswordField
                  t={t}
                  value={value || ""}
                  onBlur={onBlur}
                  onChange={async (e) => {
                    onChange(e.target.value);
                    setValue("password", e.target.value);
                    await trigger("password");
                  }}
                  hintErrors={["caplow", "min", "num"]}
                  name="new-password"
                  label={t("password")}
                  autoComplete="new-password"
                  className="mb-0"
                />
                {formState.isSubmitted && !formState.touchedFields["password"] && (
                  <p className="font-sans text-xs font-light leading-5 text-red-500">{t("required")}</p>
                )}
              </div>
            )}
          />

          <Button type="submit" className="my-8 w-full justify-center">
            {!isPremium ? t("create_account_for_free") : t("create_account_premium_name")}
          </Button>

          <div className="flex w-full flex-row text-center">
            <Divider className="my-[auto] mr-1 w-full" />
            <p className="whitespace-nowrap px-2 font-sans text-sm leading-4 text-gray-500">
              {t("or_continue_with")}
            </p>
            <Divider className="my-[auto] ml-1 w-full" />
          </div>

          <div className="mt-[20px] mb-10 flex flex-row justify-between">
            <Button
              color="minimal"
              type="button"
              className="w-[48%] justify-center rounded-md border border-gray-200 py-[10px] font-sans text-sm leading-4"
              onClick={async () => {
                const googleAuthUrl = "/auth/sso/google";
                router.push(googleAuthUrl);
              }}>
              <img
                className="mr-2 h-4 w-4"
                src="/static/assets/create-account/google-icon.svg"
                alt="Google Icon"
              />
              Google
            </Button>
            <Button
              color="minimal"
              type="button"
              className="flex w-[48%] justify-center rounded-md border border-gray-200 py-[10px] font-sans text-sm leading-4">
              <Icon.FiLock className="mr-2 h-4 w-4" />
              SAML SSO
            </Button>
          </div>
          <Link href="/auth/login">
            <p className="cursor-pointer text-sm leading-4 hover:underline">{t("already_have_account")}</p>
          </Link>
          <p className="mt-6 font-sans text-sm font-light leading-5 text-gray-600">
            <Trans i18nKey="signup_links_create_account">
              By signing up, you agree to our
              <LinkText href="/terms" classNameChildren="cursor-pointer font-normal hover:underline">
                Terms of Service
              </LinkText>
              and
              <LinkText href="/privacy" classNameChildren="cursor-pointer font-normal hover:underline">
                Privacy Policy
              </LinkText>
              <br />
              Need any help?
              <a href="mailto:help@cal.com" className="cursor-pointer font-normal hover:underline">
                Get in touch
              </a>
              .
            </Trans>
          </p>
        </form>
      </div>

      {/* Right side desktop image */}
      <div className="my-[5vh] hidden h-[90vh] w-[50vw] rounded-2xl rounded-tr-none rounded-br-none bg-gradient-to-r from-[#D4D4D5] to-[#667593] p-28 pr-0 lg:inline-block">
        {/* Had to add an additional div outside image since adding inner border radius its tricky */}
        <div className="h-full w-full rounded-3xl rounded-tr-none rounded-br-none border-[20px] border-r-0 border-black  bg-black">
          <img
            className="h-full w-full rounded-2xl rounded-tr-none rounded-br-none object-cover object-left"
            src="/static/assets/create-account/bg-calcom-create-account.png"
          />
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;
