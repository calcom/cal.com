import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { asStringOrNull } from "@lib/asStringOrNull";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { isSAMLLoginEnabled } from "@lib/saml";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import { EmailField, PasswordField, TextField } from "@components/form/fields";
import { HeadSeo } from "@components/seo/head-seo";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

import { IS_GOOGLE_LOGIN_ENABLED } from "@server/lib/constants";
import { ssrInit } from "@server/lib/ssr";

type Props = inferSSRProps<typeof getServerSideProps>;

type FormValues = {
  username: string;
  email: string;
  password: string;
  passwordcheck: string;
  apiError: string;
};

export default function Signup({ email }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const methods = useForm<FormValues>();
  const {
    register,
    formState: { errors, isSubmitting },
  } = methods;

  methods.setValue("email", email);

  const handleErrors = async (resp: Response) => {
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message);
    }
  };

  const signUp: SubmitHandler<FormValues> = async (data) => {
    await fetch("/api/auth/signup", {
      body: JSON.stringify({
        ...data,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
      .then(handleErrors)
      .then(async () => await signIn("Cal.com", { callbackUrl: (router.query.callbackUrl || "") as string }))
      .catch((err) => {
        methods.setError("apiError", { message: err.message });
      });
  };

  return (
    <div
      className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <HeadSeo title={t("sign_up")} description={t("sign_up")} />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="font-cal text-center text-3xl font-extrabold text-gray-900">
          {t("create_your_account")}
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-2 bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          {/* TODO: Refactor as soon as /availability is live */}
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(signUp)} className="space-y-6 bg-white">
              {errors.apiError && <Alert severity="error" message={errors.apiError?.message} />}
              <div className="space-y-2">
                <TextField
                  addOnLeading={
                    <span className="inline-flex items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                      {process.env.NEXT_PUBLIC_APP_URL}/
                    </span>
                  }
                  labelProps={{ className: "block text-sm font-medium text-gray-700" }}
                  className="block w-full min-w-0 flex-grow rounded-none rounded-r-sm border-gray-300 lowercase focus:border-black focus:ring-black sm:text-sm"
                  {...register("username")}
                  required
                />
                <EmailField
                  {...register("email")}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                />
                <PasswordField
                  labelProps={{
                    className: "block text-sm font-medium text-gray-700",
                  }}
                  {...register("password")}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                />
                <PasswordField
                  label={t("confirm_password")}
                  labelProps={{
                    className: "block text-sm font-medium text-gray-700",
                  }}
                  {...register("passwordcheck", {
                    validate: (value) =>
                      value === methods.watch("password") || (t("error_password_mismatch") as string),
                  })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
                />
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <Button loading={isSubmitting} className="w-7/12 justify-center">
                  {t("create_account")}
                </Button>
                <Button
                  color="secondary"
                  className="w-5/12 justify-center"
                  onClick={() =>
                    signIn("Cal.com", { callbackUrl: (router.query.callbackUrl || "") as string })
                  }>
                  {t("login_instead")}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const ssr = await ssrInit(ctx);
  const token = asStringOrNull(ctx.query.token);
  if (!token) {
    return {
      notFound: true,
    };
  }
  const verificationRequest = await prisma.verificationRequest.findUnique({
    where: {
      token,
    },
  });

  // for now, disable if no verificationRequestToken given or token expired
  if (!verificationRequest || verificationRequest.expires < new Date()) {
    return {
      notFound: true,
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      AND: [
        {
          email: verificationRequest.identifier,
        },
        {
          emailVerified: {
            not: null,
          },
        },
      ],
    },
  });

  if (existingUser) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login?callbackUrl=" + ctx.query.callbackUrl,
      },
    };
  }

  return {
    props: {
      isGoogleLoginEnabled: IS_GOOGLE_LOGIN_ENABLED,
      isSAMLLoginEnabled,
      email: verificationRequest.identifier,
      trpcState: ssr.dehydrate(),
    },
  };
};
