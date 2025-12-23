import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form";
import { PasswordField } from "@calid/features/ui/components/input/input";
import { TextField } from "@calid/features/ui/components/input/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";

import {
  APP_NAME,
  META_WHATSAPP_BUSINESS_CONFIG_ID,
  META_WHATSAPP_BUSINESS_APP_ID,
} from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Select } from "@calcom/ui/components/form";

import getInstalledAppPath from "../../../_utils/getInstalledAppPath";
import { WhatsAppEmbeddedSignup } from "../../components/whatsapp_embedded_auth";
import { WhatsappManualAuth } from "../../components/whatsapp_manual_auth";

export default function WhatsappBusinessSetup({ calIdTeamId }: { calIdTeamId?: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [flowType, setFlowType] = useState({
    label: "Embedded",
    value: "embedded",
  });

  return (
    <div className="bg-emphasis flex h-screen dark:bg-inherit">
      <div className="bg-default dark:bg-muted border-subtle m-auto rounded-xl p-5 md:w-[560px] md:p-10 dark:border">
        <div className="mb-2 flex w-full flex-col items-center justify-center gap-2">
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src="/api/app-store/whatsapp-business/icon.svg"
            alt="Whatsapp Business"
            className="h-12 w-12 max-w-xl"
          />
          <h1 className="dark:text-emphasis mb-3 text-xl">{t("connect_whatsapp_business")}</h1>
        </div>

        <Select
          label={t("select_setup_flow")!}
          value={flowType}
          onChange={(type) => setFlowType(type)}
          options={["Embedded", "Manual"].map((flow) => ({ label: flow, value: flow.toLowerCase() }))}
          className="mb-4"
        />

        {flowType.value === "embedded" ? (
          <WhatsAppEmbeddedSignup
            configId={META_WHATSAPP_BUSINESS_CONFIG_ID}
            appId={META_WHATSAPP_BUSINESS_APP_ID}
            teamId={calIdTeamId}
            onError={(error: string) => {
              // Don't redirect just showing the error inside `WhatsAppEmbeddedSignup`
              // router.push(
              //   `${getInstalledAppPath({ variant: "messaging", slug: "whatsapp-business" })}?error=${error}`
              // );
            }}
            onSuccess={() => {
              // router.push(`${getInstalledAppPath({ variant: "messaging", slug: "whatsapp-business" })}`);
            }}
          />
        ) : (
          <WhatsappManualAuth teamId={calIdTeamId} />
        )}
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
