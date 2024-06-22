import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui";

import { AppKeyForm } from "../../components/forms/AppKeyForm";
import config from "../../config.json";
import type { AppKeysForm } from "../../zod";

export default function AuditLogImplementationExampleSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function onCreate(values: AppKeysForm) {
    setIsLoading(true);
    const res = await fetch(`/api/integrations/${config.slug}/add`, {
      method: "POST",
      body: JSON.stringify({ ...values, disabledEvents: [] }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();

    if (res.ok) {
      router.push(json.url);
      showToast(t("keys_have_been_saved"), "success");
    } else {
      showToast(json.message, "error");
    }
  }

  return (
    <div className="bg-emphasis flex h-screen">
      <div className="bg-default m-auto rounded p-5 md:w-[520px] md:p-10">
        <div className="flex flex-col space-y-5 md:flex-row md:space-x-5 md:space-y-0">
          <div>
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src="/api/app-store/boxyhq-retraced/logo.png"
              alt="BoxyHQ Retraced"
              className="h-12 w-12 max-w-2xl"
            />
          </div>
          <div>
            <h1 className="text-default">{t("provide_api_key")}</h1>

            <div className="mt-1 text-sm">
              {t("generate_api_key_description", { appName: "Close.com" })}{" "}
              <a
                className="text-indigo-400"
                href="https://boxyhq.com/audit-logs"
                target="_blank"
                rel="noopener noreferrer">
                BoxyHQ Retraced
              </a>
              . {t("it_stored_encrypted")}
            </div>
            <div className="my-2 mt-3">
              <AppKeyForm onCreate={onCreate} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
