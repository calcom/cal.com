import { zodResolver } from "@hookform/resolvers/zod";
import debounce from "debounce";
import { TFunction, Trans } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import z from "zod";

import { getPremiumPlanPriceValue } from "@calcom/app-store/stripepayment/lib/utils";
import { isPasswordValid } from "@calcom/lib/auth";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Icon } from "@calcom/ui";
import { Button, EmailField, PasswordField, TextField } from "@calcom/ui/v2";
import Divider from "@calcom/ui/v2/core/Divider";

import { LinkText } from "@components/ui/LinkText";

function makeSignupSchema(callback: (bool: boolean) => void, tFunc: TFunction) {
  return z.object({
    username: z
      .string()
      .min(1, { message: tFunc("at_least_characters_one") })
      .superRefine(async (val, ctx) => {
        if (val) {
          const { data } = await fetchUsername(val);
          if (!data.available) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: tFunc("already_in_use_error"),
            });
          }
          callback(data.premium);
        }
      }),
    email: z.string().email({ message: tFunc("enter_valid_email") }),
    password: z.string().superRefine((data, ctx) => {
      const result = isPasswordValid(data, true);
      Object.keys(result).map((key: string) => {
        if (!result[key as keyof typeof result]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: tFunc(`password_hint_${key}`),
          });
        }
      });
    }),
  });
}

const CreateAccount = () => {
  const { t } = useLocale();
  const router = useRouter();
  const [currentUsername, setCurrentUsername] = useState<string | undefined>();
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const signupSchema = useMemo(() => makeSignupSchema(setIsPremium, t), []);
  const formMethods = useForm<{
    username: string;
    email: string;
    password: string;
  }>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: currentUsername,
    },
  });

  const { handleSubmit, control, setValue, trigger } = formMethods;

  useEffect(() => {
    if (currentUsername) {
      debounce(() => {
        trigger("username");
      }, 200);
    } else if (currentUsername === "") {
      setIsPremium(false);
    }
  }, [currentUsername, trigger]);

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
        <FormProvider {...formMethods}>
          <form onSubmit={onSubmit} autoComplete="off" className="flex flex-col space-y-5">
            <Controller
              name="username"
              control={control}
              render={({ field: { onBlur, onChange, value } }) => (
                <>
                  <TextField
                    t={t}
                    addOnLeading={
                      <span className="items-centerpx-3 inline-flex rounded-none text-sm text-gray-500">
                        {WEBSITE_URL}/
                      </span>
                    }
                    value={value || ""}
                    className="my-0"
                    onBlur={onBlur}
                    name="username"
                    onChange={async (e) => {
                      onChange(e.target.value);
                      setValue("username", e.target.value);
                      setCurrentUsername(e.target.value);
                      await trigger("username");

                      if (e.target.value === "") {
                        setIsPremium(false);
                      }
                    }}
                  />
                  {isPremium && (
                    <p className="ml-2 mt-2 flex items-center text-sm text-blue-700">
                      <Icon.FiStar className="-ml-1 mr-1 inline-block h-4 w-4" />{" "}
                      {t("premium_username", {
                        price: getPremiumPlanPriceValue(),
                      })}
                    </p>
                  )}
                </>
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field: { onBlur, onChange, value } }) => (
                <EmailField
                  t={t}
                  value={value || ""}
                  onBlur={onBlur}
                  onChange={async (e) => {
                    onChange(e.target.value);
                    setValue("email", e.target.value);
                    await trigger("email");
                  }}
                  className="!mb-0 -mt-1"
                  name="email"
                />
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field: { onBlur, onChange, value } }) => (
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
                  name="password"
                  autoComplete="off"
                />
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
        </FormProvider>
      </div>

      {/* Right side desktop image */}
      <div className="my-[5vh] hidden h-[90vh] w-[50vw] rounded-2xl rounded-tr-none rounded-br-none bg-gradient-to-r from-[#D4D4D5] to-[#667593] p-28 pr-0 lg:inline-block">
        {/* Had to add an additional div outside image since adding inner border radius its tricky */}
        <div className="h-full w-full rounded-3xl rounded-tr-none rounded-br-none border-[20px] border-r-0 border-black  bg-black">
          <img
            className="h-full w-full rounded-2xl rounded-tr-none rounded-br-none object-cover object-left object-top"
            src="/static/assets/create-account/bg-calcom-create-account.png"
          />
        </div>
      </div>
    </div>
  );
};

export default CreateAccount;
