import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form/form";
import { Icon } from "@calid/features/ui/components/icon";
import { TextField } from "@calid/features/ui/components/input/input";
import { triggerToast } from "@calid/features/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { btcpayCredentialKeysSchema } from "../../lib/btcpayCredentialKeysSchema";

export type IBTCPaySetupProps = z.infer<typeof btcpayCredentialKeysSchema>;

export default function BTCPaySetup(props: IBTCPaySetupProps) {
  const params = useCompatSearchParams();
  if (params?.get("callback") === "true") {
    return <BTCPaySetupCallback />;
  }
  return <BTCPaySetupPage {...props} />;
}

enum BTCPayOAuthError {
  Declined = "declined",
  Unknown = "unknown",
}

function BTCPaySetupCallback() {
  const [error, setError] = useState<string | null>(null);
  const searchParams = useCompatSearchParams();

  useEffect(() => {
    if (!searchParams) {
      return;
    }
    if (!window.opener) {
      setError("Something went wrong. Opener not available. Please contact support");
      return;
    }
    const code = searchParams?.get("code");
    const error = searchParams?.get("error");

    if (!code) {
      setError(BTCPayOAuthError.Declined);
    }
    if (error) {
      setError(error);
      return;
    }

    window.opener.postMessage({
      type: "btcpayserver:oauth:success",
      payload: { code },
    });
    window.close();
  }, [searchParams]);

  return (
    <div>
      {error && <p>Authorization failed: {error}</p>}
      {!error && <p>Connecting...</p>}
    </div>
  );
}

function BTCPaySetupPage(props: IBTCPaySetupProps) {
  const router = useRouter();
  const { t } = useLocale();
  const session = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [updatable, setUpdatable] = useState<boolean>(false);
  const [keyData, setKeyData] = useState<
    | {
        storeId: string;
        serverUrl: string;
        apiKey: string;
        webhookSecret: string;
      }
    | undefined
  >();
  const settingsSchema = z.object({
    storeId: z.string().trim(),
    serverUrl: z.string().trim(),
    apiKey: z.string().trim(),
    webhookSecret: z.string().optional(),
  });
  const integrations = trpc.viewer.apps.calid_integrations.useQuery({
    variant: "payment",
    appId: "btcpayserver",
  });
  const [btcPayPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = btcPayPaymentAppCredentials?.userCredentialIds || [-1];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;

  const saveKeysMutation = trpc.viewer.apps.updateAppCredentials.useMutation({
    onSuccess: () => {
      triggerToast(t("keys_have_been_saved"), "success");
      router.push("/event-types");
    },
    onError: (error) => {
      triggerToast(error.message, "error");
    },
  });
  const deleteMutation = trpc.viewer.credentials.calid_delete.useMutation({
    onSuccess: () => {
      router.push("/apps/btcpayserver");
    },
    onError: () => {
      triggerToast(t("error_removing_app"), "error");
    },
  });

  const form = useForm<z.infer<typeof settingsSchema>>({
    reValidateMode: "onChange",
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    const _keyData = {
      storeId: props?.storeId || "",
      serverUrl: props?.serverUrl || "",
      apiKey: props?.apiKey || "",
      webhookSecret: props?.webhookSecret || "",
    };
    setKeyData(_keyData);
  }, [props]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      const { serverUrl, storeId, apiKey } = value;
      if (
        serverUrl &&
        storeId &&
        apiKey &&
        (keyData?.serverUrl !== serverUrl || keyData?.storeId !== storeId || keyData?.apiKey !== apiKey)
      ) {
        setUpdatable(true);
      } else {
        setUpdatable(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, keyData]);

  const configureBTCPayWebhook = async (data: z.infer<typeof settingsSchema>) => {
    setValidating(true);
    const specificEvents = ["InvoiceSettled", "InvoiceProcessing"];
    const serverUrl = data.serverUrl.endsWith("/") ? data.serverUrl.slice(0, -1) : data.serverUrl;
    const endpoint = `${serverUrl}/api/v1/stores/${data.storeId}/webhooks`;
    const webhookUrl = `${WEBAPP_URL}/api/integrations/btcpayserver/webhook`;
    const requestBody = {
      enabled: true,
      automaticRedelivery: false,
      url: webhookUrl,
      authorizedEvents: {
        everything: false,
        specificEvents: specificEvents,
      },
      secret: null,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${data.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        triggerToast(`Failed to configure webhook: ${errorBody}`, "error");
        return false;
      }
      const webhookResponse = await response.json();
      saveKeysMutation.mutate({
        credentialId,
        key: btcpayCredentialKeysSchema.parse({
          ...data,
          webhookSecret: webhookResponse.secret,
        }),
      });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        triggerToast(error.message || "Failed to configure BTCPay webhook", "error");
      } else {
        triggerToast("An unknown error occurred while configuring BTCPay webhook", "error");
      }
      return false;
    } finally {
      setValidating(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof settingsSchema>) => {
    if (loading) return;
    setLoading(true);

    try {
      const isValid = await configureBTCPayWebhook(data);
      if (!isValid) {
        setLoading(false);
        return;
      }
    } catch (error: unknown) {
      let message = "";
      if (error instanceof Error) {
        message = error.message;
      }
      triggerToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    deleteMutation.mutate({ id: credentialId });
  };

  if (session.status === "loading") return <></>;

  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  const isNewCredential = !props.serverUrl && !props.storeId && !props.webhookSecret && !props.apiKey;

  return (
    <>
      <div className="bg-default flex h-screen items-center justify-center">
        {showContent ? (
          <div className="flex w-full w-full max-w-[43em] flex-col items-center justify-center space-y-4 p-4 lg:space-y-5">
            <Form form={form} onSubmit={onSubmit} className="w-full space-y-4">
              <div className="bg-default border-default overflow-auto rounded-md border">
                <div className="border-default flex items-center justify-between border-b-[1px] p-4 md:p-5">
                  <h2 className="text-2xl font-semibold">BTCPay Server Information</h2>
                </div>
                <fieldset className="w-full space-y-4 p-4 md:p-5" disabled={form.formState.isSubmitting}>
                  <TextField
                    required
                    type="text"
                    {...form.register("serverUrl")}
                    label="BTCPay Server Url"
                    placeholder="https://your-btcpay-server.com"
                    containerClassName="w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    defaultValue={keyData?.serverUrl || ""}
                  />
                  <TextField
                    required
                    type="text"
                    {...form.register("storeId")}
                    label="BTCPay Store Id"
                    placeholder="Enter your BTCPay Store ID"
                    containerClassName="w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    defaultValue={keyData?.storeId || ""}
                  />
                  <TextField
                    required
                    type="text"
                    {...form.register("apiKey")}
                    label="API Key"
                    placeholder="Enter your API key"
                    containerClassName="w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    defaultValue={keyData?.apiKey || ""}
                  />
                </fieldset>
              </div>
              <div className="flex justify-end gap-4">
                {isNewCredential ? (
                  <>
                    <Button type="button" color="secondary" StartIcon="x" onClick={onCancel}>
                      {t("cancel")}
                    </Button>
                    <Button
                      color="primary"
                      StartIcon="check"
                      type="submit"
                      disabled={loading || validating || !updatable}>
                      {loading ? (
                        <>
                          <Icon name="loader-circle" className="mr-2 animate-spin" />
                          {t("connecting")}
                        </>
                      ) : (
                        t("connect")
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/apps/btcpayserver" className="inline-block">
                      <Button color="secondary">Go to App Store</Button>
                    </Link>
                  </>
                )}
              </div>
            </Form>
          </div>
        ) : (
          <AppNotInstalledMessage appName="btcpayserver" />
        )}
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
