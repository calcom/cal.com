import type { GetStaticPropsContext } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import z from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import AuthContainer from "@components/ui/AuthContainer";

import { getTranslations } from "@server/lib/getTranslations";

const querySchema = z.object({
  error: z.string().optional(),
});

export default function Error() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const { error } = querySchema.parse({ error: searchParams?.get("error") || undefined });
  const errorMsg = error || t("error_during_login");
  return (
    <AuthContainer title="" description="">
      <div>
        <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Icon name="x" className="h-6 w-6 text-red-600" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
            {errorMsg}
          </h3>
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

Error.PageWrapper = PageWrapper;

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const i18n = await getTranslations(context);

  return {
    props: {
      i18n,
    },
  };
};
