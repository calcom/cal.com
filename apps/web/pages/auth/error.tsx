import { GetStaticPropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";

import AuthContainer from "@components/ui/AuthContainer";

import { ssgInit } from "@server/lib/ssg";

export default function Error() {
  const { t } = useLocale();
  const router = useRouter();
  const { error } = router.query;

  return (
    <AuthContainer title="" description="">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Icon.FiX className="h-6 w-6 text-red-600" />
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
        <Link href="/auth/login" passHref>
          <Button className="flex w-full justify-center">{t("go_back_login")}</Button>
        </Link>
      </div>
    </AuthContainer>
  );
}

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const ssr = await ssgInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};
