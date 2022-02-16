import { CheckIcon } from "@heroicons/react/outline";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { useLocale } from "@lib/hooks/useLocale";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AuthContainer from "@components/ui/AuthContainer";
import Button from "@components/ui/Button";

import { ssrInit } from "@server/lib/ssr";

type Props = inferSSRProps<typeof getServerSideProps>;

export default function Logout(props: Props) {
  const router = useRouter();
  useEffect(() => {
    if (props.query?.survey === "true") {
      router.push("https://cal.com/cancellation");
    }
  }, []);
  const { t } = useLocale();

  return (
    <AuthContainer title={t("logged_out")} description={t("youve_been_logged_out")}>
      <div className="mb-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckIcon className="h-6 w-6 text-green-600" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
            {t("youve_been_logged_out")}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{t("hope_to_see_you_soon")}</p>
          </div>
        </div>
      </div>
      <Link href="/auth/login">
        <Button className="flex w-full justify-center"> {t("go_back_login")}</Button>
      </Link>
    </AuthContainer>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
      query: context.query,
    },
  };
}
