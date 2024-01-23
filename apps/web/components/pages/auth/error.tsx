import Link from "next/link";
import z from "zod";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";
import { X } from "@calcom/ui/components/icon";

import type { AppProps } from "@lib/app-providers";

import AuthContainer from "@components/ui/AuthContainer";

const querySchema = z.object({
  error: z.string().optional(),
});

const Error: React.FC & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
} = () => {
  const { t } = useLocale();
  const searchParams = useCompatSearchParams();
  const { error } = querySchema.parse(searchParams);
  const isTokenVerificationError = error?.toLowerCase() === "verification";
  const errorMsg = isTokenVerificationError ? t("token_invalid_expired") : t("error_during_login");

  return (
    <AuthContainer title="" description="">
      <div>
        <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <X className="h-6 w-6 text-red-600" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-title">
            {error}
          </h3>
          <div className="mt-2">
            <p className="text-subtle text-sm">{errorMsg}</p>
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
};

export default Error;
