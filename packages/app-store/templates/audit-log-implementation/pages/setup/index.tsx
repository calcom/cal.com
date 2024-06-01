import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui";

import { CredentialsForm, FormAction } from "../../components/CredentialsForm";
import config from "../../config.json";
import type { AppKeys } from "../../zod";
import { appKeysSchema } from "../../zod";

const formSchema = appKeysSchema;

export default function BoxyHQSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [testPassed, setTestPassed] = useState<boolean | undefined>(undefined);

  const form = useForm<AppKeys>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (testPassed === false) {
        setTestPassed(undefined);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [testPassed]);

  async function onCreate(values: AppKeys) {
    const res = await fetch(`/api/integrations/${config.slug}/add`, {
      method: "POST",
      body: JSON.stringify(values),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const json = await res.json();

    if (res.ok) {
      router.push(json.url);
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
              <CredentialsForm form={form} action={FormAction.CREATE} onCreate={onCreate} />
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
