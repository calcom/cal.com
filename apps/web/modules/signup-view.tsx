"use client";

import { Analytics as DubAnalytics } from "@dub/analytics/react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

import { APP_NAME, IS_CALCOM, IS_EUROPE, WEBSITE_URL } from "@calcom/lib/constants";
import { isENVDev } from "@calcom/lib/env";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { signupSchema as apiSignupSchema } from "@calcom/prisma/zod-utils";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, HeadSeo } from "@calcom/ui";
import classNames from "@calcom/ui/classNames";

import type { getServerSideProps } from "@lib/signup/getServerSideProps";

const signupSchema = apiSignupSchema.extend({
  apiError: z.string().optional(), // Needed to display API errors doesn't get passed to the API
  cfToken: z.string().optional(),
});

type FormValues = z.infer<typeof signupSchema>;

export type SignupProps = inferSSRProps<typeof getServerSideProps>;

const FEATURES = [
  {
    title: "Complete seu perfil",
    description: "Preencha alguns dados, adicione uma foto e escreva uma mini biografia.",
    i18nOptions: {
      appName: APP_NAME,
    },
    icon: (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="!important mb-2">
        <path
          d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H6C4.93913 15 3.92172 15.4214 3.17157 16.1716C2.42143 16.9217 2 17.9391 2 19V21"
          stroke="#06C6A3"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
          stroke="#06C6A3"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 20.9999V18.9999C21.9993 18.1136 21.7044 17.2527 21.1614 16.5522C20.6184 15.8517 19.8581 15.3515 19 15.1299M16 3.12988C16.8604 3.35018 17.623 3.85058 18.1676 4.55219C18.7122 5.2538 19.0078 6.11671 19.0078 7.00488C19.0078 7.89305 18.7122 8.75596 18.1676 9.45757C17.623 10.1592 16.8604 10.6596 16 10.8799"
          stroke="#06C6A3"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Conecte seu calendário",
    description: "Sincronize sua agenda Google para atualizar dias ocupados e novos eventos.",
    icon: (
      <svg width={21} height={21} viewBox="0 0 21 21" fill="none" className="!important mb-2">
        <path
          d="M13.3335 3V1M13.3335 3V5M13.3335 3H8.8335M1.3335 9V18C1.3335 18.5304 1.54421 19.0391 1.91928 19.4142C2.29436 19.7893 2.80306 20 3.3335 20H17.3335C17.8639 20 18.3726 19.7893 18.7477 19.4142C19.1228 19.0391 19.3335 18.5304 19.3335 18V9M1.3335 9H19.3335M1.3335 9V5C1.3335 4.46957 1.54421 3.96086 1.91928 3.58579C2.29436 3.21071 2.80306 3 3.3335 3H5.3335M19.3335 9V5C19.3335 4.46957 19.1228 3.96086 18.7477 3.58579C18.3726 3.21071 17.8639 3 17.3335 3H16.8335M5.3335 1V5"
          stroke="#06C6A3"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Defina sua disponibilidade",
    description: "Gerencie os dias e horários de atendimento que deseja disponibilizar na Yinflow.Life.",
    icon: (
      <svg width={21} height={20} viewBox="0 0 21 20" fill="none" className="!important mb-2">
        <path
          d="M10.6665 0.25C8.73814 0.25 6.85308 0.821828 5.2497 1.89317C3.64632 2.96452 2.39664 4.48726 1.65868 6.26884C0.920728 8.05042 0.727646 10.0108 1.10385 11.9021C1.48006 13.7934 2.40866 15.5307 3.77222 16.8943C5.13578 18.2579 6.87306 19.1865 8.76438 19.5627C10.6557 19.9389 12.6161 19.7458 14.3977 19.0078C16.1793 18.2699 17.702 17.0202 18.7733 15.4168C19.8447 13.8134 20.4165 11.9284 20.4165 10C20.4138 7.41498 19.3857 4.93661 17.5578 3.10872C15.7299 1.28084 13.2515 0.25273 10.6665 0.25ZM10.6665 18.25C9.03481 18.25 7.43976 17.7661 6.08305 16.8596C4.72635 15.9531 3.66892 14.6646 3.0445 13.1571C2.42008 11.6496 2.2567 9.99085 2.57503 8.3905C2.89336 6.79016 3.67909 5.32015 4.83288 4.16637C5.98666 3.01259 7.45667 2.22685 9.05701 1.90852C10.6574 1.59019 12.3162 1.75357 13.8236 2.37799C15.3311 3.00242 16.6196 4.05984 17.5261 5.41655C18.4327 6.77325 18.9165 8.3683 18.9165 10C18.914 12.1873 18.044 14.2843 16.4974 15.8309C14.9508 17.3775 12.8538 18.2475 10.6665 18.25ZM16.6665 10C16.6665 10.1989 16.5875 10.3897 16.4468 10.5303C16.3062 10.671 16.1154 10.75 15.9165 10.75H10.6665C10.4676 10.75 10.2768 10.671 10.1362 10.5303C9.99553 10.3897 9.91651 10.1989 9.91651 10V4.75C9.91651 4.55109 9.99553 4.36032 10.1362 4.21967C10.2768 4.07902 10.4676 4 10.6665 4C10.8654 4 11.0562 4.07902 11.1968 4.21967C11.3375 4.36032 11.4165 4.55109 11.4165 4.75V9.25H15.9165C16.1154 9.25 16.3062 9.32902 16.4468 9.46967C16.5875 9.61032 16.6665 9.80109 16.6665 10Z"
          fill="#06C6A3"
        />
      </svg>
    ),
    i18nOptions: {
      appName: APP_NAME,
    },
  },
];

export default function Signup({ prepopulateFormValues, redirectUrl }: SignupProps) {
  useTheme("light");
  const [premiumUsername] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { t } = useLocale();
  const router = useRouter();
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: prepopulateFormValues satisfies FormValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (redirectUrl) {
      localStorage.setItem("onBoardingRedirect", redirectUrl);
    }
  }, [redirectUrl]);

  return (
    <>
      {IS_CALCOM && !IS_EUROPE ? (
        <>
          {process.env.NEXT_PUBLIC_GTM_ID && (
            <>
              <Script
                id="gtm-init-script"
                // It is strictly not necessary to disable, but in a future update of react/no-danger this will error.
                // And we don't want it to error here anyways
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: `(function (w, d, s, l, i) {
                        w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
                        var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
                        j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
                    })(window, document, 'script', 'dataLayer', '${process.env.NEXT_PUBLIC_GTM_ID}');`,
                }}
              />
              <noscript
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
                }}
              />
            </>
          )}
          <DubAnalytics
            cookieOptions={{
              domain: isENVDev ? undefined : `.${new URL(WEBSITE_URL).hostname}`,
            }}
          />
        </>
      ) : null}
      <div
        className={classNames(
          "light flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F6F8]  py-8 [--cal-brand:#111827]",
          "[--cal-brand-subtle:#9CA3AF]",
          "[--cal-brand-text:#FFFFFF]",
          "[--cal-brand-emphasis:#101010]"
        )}>
        <div className="grid w-full max-w-[1440px] grid-cols-1 grid-rows-1 overflow-hidden rounded-3xl bg-white lg:grid-cols-2">
          <HeadSeo title={t("sign_up")} description={t("sign_up")} />
          {/* Left side */}
          <div className="ml-auto mr-auto mt-0 flex w-full max-w-xl flex-col px-4 pt-6 lg:mt-12">
            <div className="flex flex-col gap-2">
              <svg width={179} height={40} viewBox="0 0 179 40" className="mb-10" fill="none">
                <g clipPath="url(#clip0_15554_762)">
                  <path
                    d="M96.6047 9.76199H92.7637L100.69 30.4693H100.831L106.832 14.8297L112.845 30.4728H113.045L120.971 9.76199H119.537L113.821 24.692L107.854 9.34766H107.733L102.062 23.9707L96.6047 9.76199Z"
                    fill="black"
                  />
                  <path d="M69.4492 0.424805V29.8704H65.7202V0.424805H69.4492Z" fill="black" />
                  <path
                    d="M72.5957 20.2253C72.5957 13.9975 76.7472 9.73047 83.0521 9.73047C88.9332 9.73047 92.9692 13.575 92.9692 19.7631C92.9692 25.9513 88.8177 30.4109 82.5899 30.4109C76.362 30.4109 72.5957 26.5279 72.5957 20.2242V20.2253ZM83.4746 29.874C86.781 29.874 88.9332 27.1826 88.9332 20.9945C88.9332 14.3441 86.2803 10.2697 82.2829 10.2697C78.9764 10.2697 76.6317 12.8455 76.6317 19.0722C76.6317 25.7225 79.3989 29.874 83.4746 29.874Z"
                    fill="black"
                  />
                  <path
                    d="M28.0333 29.756H24.3218V28.7978V12.4684L24.3172 12.0471V11.8416L28.0018 9.69528H28.0403V28.7978L28.0333 29.756ZM26.1624 3.31689C27.542 3.31689 28.5387 4.27511 28.5387 5.5788C28.5387 6.88249 27.542 7.87922 26.1624 7.87922C24.7829 7.87922 23.7861 6.88249 23.7861 5.5788C23.7861 4.27511 24.7443 3.31689 26.1624 3.31689Z"
                    fill="black"
                  />
                  <path
                    d="M31.9863 11.8698L35.6745 9.76196H35.713V13.4711C38.779 11.2092 41.2709 9.77597 43.3029 9.77597C46.3689 9.77597 48.3239 11.8453 48.3239 15.2568V28.8644L48.3274 29.6312V29.8227H44.5645V29.6312L44.5669 28.8644V15.8696C44.5669 13.1863 43.1103 11.9212 40.9639 11.9212C39.1619 11.9212 37.7053 12.5888 35.713 13.9683V29.6301V29.8215H31.9957V28.8633V12.5339L31.9875 11.8686L31.9863 11.8698Z"
                    fill="black"
                  />
                  <path
                    d="M23.436 2.52563H20.4167L12.591 14.1048L5.37815 3.46985L4.77007 2.52563H0L0.624416 3.46985L9.78641 16.732V28.8457L9.78875 29.6113V29.8179H13.8107V29.6008V28.8457V16.7285L23.436 2.52563Z"
                    fill="black"
                  />
                  <path
                    d="M57.3436 29.7537H53.5761V28.7932L53.575 11.725H50.5381V10.2253H53.5831C53.75 3.338 57.3658 0 60.6863 0C62.2234 0 63.0696 0.769141 63.0696 1.92227C63.0696 2.69141 62.6471 3.22946 62.4545 3.4979C61.4555 2.99837 60.4727 2.5782 58.8201 2.5782C56.9527 2.5782 56.0108 4.3324 55.9022 5.84617C55.7855 7.48016 56.1111 8.91807 56.7262 10.2253H62.339V11.725H57.3413V28.7932L57.3436 29.7537Z"
                    fill="black"
                  />
                  <path
                    d="M120.665 30.4727C121.38 30.4727 121.992 30.1751 122.39 29.6954C122.728 29.3464 122.927 28.8726 122.927 28.3345C122.927 27.7965 122.745 27.3751 122.437 27.039C122.046 26.5383 121.417 26.229 120.665 26.229C119.389 26.229 118.462 27.1137 118.462 28.3345C118.462 29.5553 119.389 30.4727 120.665 30.4727Z"
                    fill="#06C6A3"
                  />
                  <path
                    d="M142.124 29.8156H126.761L130.592 2.45679H133.791L130.397 27.3868H142.603L142.124 29.8156Z"
                    fill="#06C6A3"
                  />
                  <path
                    d="M165.636 1.45068C165.557 1.39815 165.366 1.28261 165.049 1.0982C164.734 0.914961 164.309 0.735223 163.788 0.564821C163.261 0.39442 162.675 0.306885 162.047 0.306885C160.186 0.306885 158.755 0.914961 157.793 2.11244C156.842 3.29825 156.176 5.17383 155.813 7.68784L155.439 10.3757L153.42 10.3827L153.122 12.4673H155.136L152.483 31.3853C152.151 33.7324 151.661 35.4364 151.029 36.4507C150.409 37.4416 149.608 37.9446 148.649 37.9446C148.302 37.9446 147.995 37.9014 147.737 37.8151C147.479 37.7287 147.281 37.6365 147.149 37.5408C146.963 37.4054 146.92 37.368 146.91 37.3575L146.796 37.2467L145.884 39.0277L145.911 39.0802C145.936 39.1316 146 39.2098 146.279 39.3954C146.484 39.5307 146.784 39.6626 147.199 39.7969C147.61 39.9287 148.136 39.9964 148.764 39.9964C152.455 39.9964 154.734 37.1089 155.539 31.4157L158.197 12.4649H163.772L164.077 10.3337H158.502L158.831 8.02631C159.035 6.51954 159.293 5.32906 159.599 4.48872C159.9 3.66239 160.264 3.07999 160.683 2.7602C161.1 2.44157 161.635 2.28051 162.277 2.28051C162.701 2.28051 163.113 2.34353 163.499 2.46842C163.889 2.59447 164.208 2.72869 164.445 2.86524C164.753 3.04381 164.842 3.11267 164.866 3.13718L164.99 3.25973L165.712 1.4997L165.633 1.44717L165.636 1.45068Z"
                    fill="#06C6A3"
                  />
                  <path
                    d="M167.144 21.181C170.164 21.181 172.764 20.7947 174.87 20.0314C177.015 19.2553 178.103 17.6224 178.103 15.1785C178.103 13.7067 177.563 12.4532 176.498 11.453C175.435 10.4562 173.969 9.94971 172.139 9.94971C170.213 9.94971 168.491 10.4714 167.019 11.5008C165.55 12.5291 164.389 14.0043 163.571 15.8869C162.755 17.7648 162.342 19.9497 162.342 22.3808C162.342 24.9322 163.058 26.9152 164.469 28.2737C165.879 29.6311 167.755 30.3197 170.049 30.3197C171.453 30.3197 172.662 30.0886 173.641 29.6311C174.617 29.1759 175.371 28.6612 175.921 28.136C176.585 27.5022 176.721 27.256 176.772 27.1661C176.776 27.1568 176.788 27.1276 176.788 27.1276L175.596 26.0678C175.596 26.0678 175.331 26.4086 174.906 26.8066C174.492 27.1953 173.911 27.5606 173.177 27.8886C172.447 28.2153 171.564 28.3811 170.553 28.3811C169.017 28.3811 167.775 27.9107 166.86 26.9829C165.945 26.0562 165.481 24.6241 165.481 22.7275C165.481 22.054 165.491 21.5347 165.512 21.1787H167.145L167.144 21.181ZM171.79 11.8486C172.915 11.8486 173.8 12.1498 174.42 12.745C175.038 13.3391 175.352 14.1059 175.352 15.0232C175.352 16.8451 174.611 18.0123 173.085 18.5923C171.544 19.1782 169.572 19.4759 167.221 19.4759H165.69C166.028 17.0937 166.73 15.21 167.778 13.8759C168.834 12.5314 170.184 11.8486 171.79 11.8486Z"
                    fill="#06C6A3"
                  />
                  <path
                    d="M147.616 10.3372L144.872 29.9322H147.896L150.638 10.3372H147.616Z"
                    fill="#06C6A3"
                  />
                  <path
                    d="M149.722 7.97257C150.438 7.97257 151.052 7.67495 151.45 7.19293C151.788 6.84395 151.988 6.36776 151.988 5.82971C151.988 5.29166 151.806 4.86916 151.496 4.53186C151.104 4.02999 150.475 3.7207 149.722 3.7207C148.443 3.7207 147.515 4.60772 147.515 5.82971C147.515 7.0517 148.443 7.9714 149.722 7.9714V7.97257Z"
                    fill="#06C6A3"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_15554_762">
                    <rect width={178.102} height={40} fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <p className="text-[42px] font-medium leading-none text-[#114559]">
                Acesse o{" "}
                <span className="text-[42px] font-medium leading-none text-[#06C6A9]">
                  {" "}
                  Painel do Profissional
                </span>
                <br />
              </p>
              <p className="mt-6 text-lg font-normal leading-5 text-[#114559]">
                Configure sua conta utilizando seu e-mail Google e obtenha acesso ao Painel do Profissional.
              </p>
              <p className="mt-6 text-lg font-normal leading-5 text-[#114559]">
                Em caso de dúvidas,{" "}
                <a
                  href="https://www.yinflow.life/whatsapp-time-de-operacoes"
                  className="cadastro-agenda underline">
                  entre em contato com o Time de Operações.
                </a>
              </p>
            </div>
            {/* Already have an account & T&C */}
            <div className="mt-10 flex h-full flex-col justify-end pb-6 text-xs">
              <div className="flex h-full flex-col justify-around text-sm">
                <div className="mt-6 flex flex-col gap-2 md:flex-row">
                  <Button
                    color="primary"
                    disabled={!!formMethods.formState.errors.username || premiumUsername}
                    loading={isGoogleLoading}
                    CustomStartIcon={
                      <svg width={25} height={25} viewBox="0 0 25 25" className="mr-4" fill="none">
                        <path
                          d="M23.06 12.5833C23.06 11.8033 22.99 11.0533 22.86 10.3333H12.5V14.5933H18.42C18.16 15.9633 17.38 17.1233 16.21 17.9033V20.6733H19.78C21.86 18.7533 23.06 15.9333 23.06 12.5833Z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12.5002 23.3333C15.4702 23.3333 17.9602 22.3533 19.7802 20.6733L16.2102 17.9033C15.2302 18.5633 13.9802 18.9633 12.5002 18.9633C9.64018 18.9633 7.21018 17.0333 6.34018 14.4333H2.68018V17.2733C4.49018 20.8633 8.20018 23.3333 12.5002 23.3333Z"
                          fill="#34A853"
                        />
                        <path
                          d="M6.34 14.4233C6.12 13.7633 5.99 13.0633 5.99 12.3333C5.99 11.6033 6.12 10.9033 6.34 10.2433V7.40332H2.68C1.93 8.88332 1.5 10.5533 1.5 12.3333C1.5 14.1133 1.93 15.7833 2.68 17.2633L5.53 15.0433L6.34 14.4233Z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12.5002 5.71325C14.1202 5.71325 15.5602 6.27325 16.7102 7.35325L19.8602 4.20325C17.9502 2.42325 15.4702 1.33325 12.5002 1.33325C8.20018 1.33325 4.49018 3.80325 2.68018 7.40325L6.34018 10.2433C7.21018 7.64325 9.64018 5.71325 12.5002 5.71325Z"
                          fill="#EA4335"
                        />
                      </svg>
                    }
                    className={classNames(
                      "mb-8 h-[58px] w-full justify-center rounded-md py-4 text-center",
                      formMethods.formState.errors.username ? "opacity-50" : ""
                    )}
                    onClick={async () => {
                      setIsGoogleLoading(true);
                      const username = formMethods.getValues("username");
                      const baseUrl = process.env.NEXT_PUBLIC_WEBAPP_URL;
                      const GOOGLE_AUTH_URL = `${baseUrl}/auth/sso/google`;
                      if (username) {
                        // If username is present we save it in query params to check for premium
                        const searchQueryParams = new URLSearchParams();
                        searchQueryParams.set("username", username);
                        localStorage.setItem("username", username);
                        router.push(`${GOOGLE_AUTH_URL}?${searchQueryParams.toString()}`);
                        return;
                      }
                      router.push(GOOGLE_AUTH_URL);
                    }}>
                    Continuar com Google
                  </Button>
                </div>
                <div className="text-base font-normal	text-[#114559]">
                  <span>
                    Ao continuar, você concorda com nossos{" "}
                    <Link
                      className="font-semibold text-[#00A587] underline hover:underline"
                      key="terms"
                      href={`${WEBSITE_URL}/termos-de-uso`}
                      target="_blank">
                      Termos
                    </Link>
                    {" e "}
                    <Link
                      className="font-semibold text-[#00A587] underline hover:underline"
                      key="privacy"
                      href={`${WEBSITE_URL}/politicas-de-privacidade`}
                      target="_blank">
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-subtle mx-auto mt-24 w-full max-w-2xl flex-col justify-between rounded-3xl border-[#06C6A3]  bg-[#E0F6EF] pl-4 lg:mt-0 lg:flex lg:max-w-full lg:border lg:py-12 lg:pl-12">
            <div className="hidden rounded-bl-2xl rounded-br-none rounded-tl-2xl lg:block lg:py-[6px] lg:pl-[6px]">
              <img className="block h-full	h-full" src="/embed-intro.png" alt="Agenda.Yinflow" />
            </div>
            <div className="mr-12 mt-8 hidden h-full w-full grid-cols-3 gap-4 overflow-hidden lg:grid">
              {FEATURES.map((feature) => (
                <>
                  <div className="max-w-52 mb-8 flex flex-col leading-none sm:mb-0">
                    <div className="text-emphasis items-center">
                      {feature.icon}
                      <span className="text-sm font-medium text-[#114559]">{t(feature.title)}</span>
                    </div>
                    <div className="text-subtle text-sm">
                      <p>
                        {t(
                          feature.description,
                          feature.i18nOptions && {
                            ...feature.i18nOptions,
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </>
              ))}
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
