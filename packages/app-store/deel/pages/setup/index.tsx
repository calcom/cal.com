import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast, TextField } from "@calcom/ui";
import { Icon } from "@calcom/ui";

export default function DeelSetup() {
  const [deelApiKey, setDeelApiKey] = useState("");
  const [hrisProfileId, setHrisProfileId] = useState("");
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.integrations.useQuery({ variant: "other", appId: "deel" });
  const [deelAppCredentials] = integrations.data?.items || [];
  const [credentialId] = deelAppCredentials?.userCredentialIds || [-1];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;
  const saveKeysMutation = trpc.viewer.appsRouter.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      router.push("/event-types");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="bg-default flex h-screen">
      {showContent ? (
        <div className="bg-default border-subtle m-auto max-w-[43em] overflow-auto rounded border pb-10 md:p-10">
          <div className="ml-2 ltr:mr-2 rtl:ml-2 md:ml-5">
            <div className="invisible md:visible">
              <img className="h-11" src="/api/app-store/deel/icon.svg" alt="Deel Logo" />
              <p className="text-default mt-5 text-lg">DEEL</p>
            </div>
            <form autoComplete="off" className="mt-5 w-full">
              <TextField
                label="DEEL API Key"
                type="password"
                name="deel_api_key"
                id="deel_api_key"
                value={deelApiKey}
                onChange={(e) => setDeelApiKey(e.target.value)}
                role="presentation"
              />

              <TextField
                label="Your HRIS Profile ID"
                type="text"
                name="hris_profile_id"
                id="hris_profile_id"
                value={hrisProfileId}
                autoComplete="new-password"
                role="presentation"
                onChange={(e) => setHrisProfileId(e.target.value)}
              />

              {/* Button to submit */}
              <div className="mt-5 flex flex-row justify-end">
                <Button
                  color="secondary"
                  onClick={() => {
                    saveKeysMutation.mutate({
                      credentialId,
                      key: {
                        deel_api_key: deelApiKey,
                        hris_profile_id: hrisProfileId,
                      },
                    });
                  }}>
                  {t("save")}
                </Button>
              </div>
            </form>
            <div>
              <p className="text-lgf text-default mt-5 font-bold">Getting Started with Deel APP</p>
              <p className="text-default font-semi mt-2">
                Deel allows seamless integration with your business workflows, enabling you to manage payroll
                and compliance for your global team. Using the Deel APP, you can set up and automate payments,
                ensuring compliance with local laws and regulations.
              </p>

              <p className="text-lgf text-default mt-5 inline-flex font-bold">
                <Icon name="circle-alert" className="mr-2 mt-1 h-4 w-4" /> Important requirements:
              </p>
              <ul className="text-default ml-1 mt-2 list-disc pl-2">
                <li>An active Deel Business account</li>
                <li>Admin access to your Deel account</li>
              </ul>

              <p className="text-default mb-2 mt-5 font-bold">Resources:</p>
              <a className="text-orange-600 underline" target="_blank" href="https://help.deel.com/hc/en-us">
                Link to Deel Help Center: https://help.deel.com/hc/en-us
              </a>

              <p className="text-lgf text-default mt-5 font-bold">Setup Instructions</p>
              <p className="text-default font-semi mt-2">
                Before proceeding, ensure your Deel account is set up for managing global payroll and
                compliance. Keep in mind that some steps may vary based on your country or organization&apos;
                s specific setup.
              </p>

              <ol className="text-default ml-1 mt-5 list-decimal pl-2">
                {/* @TODO: translate */}
                <li>
                  Log into your Deel Admin Dashboard{" "}
                  <a target="_blank" href="https://app.deel.com" className="text-orange-600 underline">
                    {t("here")}
                  </a>
                </li>
                <li>Navigate to the &quot;Apps&quot; section and select Deel APP.</li>
                <li>Click on &quot;Set Up Integration&quot; and follow the guided steps.</li>
                <li>Provide required API credentials or permissions as prompted.</li>
                <li>Complete the setup by reviewing and saving your configuration.</li>
                <li>You should be ready to use the Deel APP for automated payroll and compliance.</li>
              </ol>

              <p className="text-default mt-5 inline-flex font-bold">
                <Icon name="circle-alert" className="mr-2 mt-1 h-4 w-4" />
                Reminder:
              </p>
              <p className="text-default mt-2">
                Our integration automates payroll and compliance processes. If you revoke API permissions or
                make changes to your integration settings, the functionality may be disrupted. In such cases,
                you may need to reinstall and reconfigure the app. Reinstalling won&apos;t affect your
                existing payment configurations, but you may face temporary interruptions in processing.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <AppNotInstalledMessage appName="deel" />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
