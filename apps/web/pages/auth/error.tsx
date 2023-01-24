import { GetStaticPropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, SkeletonText } from "@calcom/ui";
import { FiX } from "@calcom/ui/components/icon";

import AuthContainer from "@components/ui/AuthContainer";

import { ssgInit } from "@server/lib/ssg";

const querySchema = z.object({
  error: z.string().optional(),
});

export default function Error() {
  const { t } = useLocale();
  const router = useRouter();
  const { error } = querySchema.parse(router.query);
  const isTokenVerificationError = error?.toLowerCase() === "verification";
  let errorMsg = <SkeletonText />;
  if (router.isReady) {
    errorMsg = isTokenVerificationError ? t("token_invalid_expired") : t("error_during_login");
  }

  return (
    <AuthContainer title="" description="">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <FiX className="h-6 w-6 text-red-600" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
            {error}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{errorMsg}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-6">
        <Link href="/auth/login" passHref legacyBehavior>
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
