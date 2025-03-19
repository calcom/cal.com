import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import Link from "next/link";
import { z } from "zod";

import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

import AuthContainer from "@components/ui/AuthContainer";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("error"),
    () => ""
  );
};

const querySchema = z.object({
  error: z.string().optional(),
});

const ServerPage = async ({ searchParams }: PageProps) => {
  const t = await getTranslate();
  const { error } = querySchema.parse({ error: searchParams?.error || undefined });
  const errorMsg = t("error_during_login") + (error ? ` Error code: ${error}` : "");
  return (
    <AuthContainer>
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
        <Link href="/auth/login">
          <Button className="flex w-full justify-center">{t("go_back_login")}</Button>
        </Link>
      </div>
    </AuthContainer>
  );
};

export default ServerPage;
