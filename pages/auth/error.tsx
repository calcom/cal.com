import { XIcon } from "@heroicons/react/outline";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";

import { useLocale } from "@lib/hooks/useLocale";

import AuthContainer from "@components/ui/AuthContainer";
import Button from "@components/ui/Button";

import { ssrInit } from "@server/lib/ssr";

export default function Error() {
  const { t } = useLocale();
  const router = useRouter();
  const { error } = router.query;

  return (
    <AuthContainer title="" description="">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <XIcon className="h-6 w-6 text-red-600" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
            {error}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{t("error_during_login")}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-6">
        <Link href="/auth/login">
          <Button className="flex w-full justify-center">{t("go_back_login")}</Button>
        </Link>
      </div>
    </AuthContainer>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
}
