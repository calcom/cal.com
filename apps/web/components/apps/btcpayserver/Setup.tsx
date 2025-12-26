import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import KeyField from "@calcom/app-store/btcpayserver/components/KeyInput";
import { btcpayCredentialKeysSchema } from "@calcom/app-store/btcpayserver/lib/btcpayCredentialKeysSchema";
import type { IBTCPaySetupProps } from "@calcom/app-store/btcpayserver/pages/setup/_getServerSideProps";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

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
  const integrations = trpc.viewer.apps.integrations.useQuery({ variant: "payment", appId: "btcpayserver" });
  const [btcPayPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = btcPayPaymentAppCredentials?.userCredentialIds || [-1];
  const showContent = !!integrations.data && integrations.isSuccess && !!credentialId;

  const saveKeysMutation = trpc.viewer.apps.updateAppCredentials.useMutation({
    onSuccess: () => {
      showToast(t("keys_have_been_saved"), "success");
      router.push("/event-types");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });
  const deleteMutation = trpc.viewer.credentials.delete.useMutation({
    onSuccess: () => {
      router.push("/apps/btcpayserver");
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<z.infer<typeof settingsSchema>>({
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
    const subscription = watch((value) => {
      const { serverUrl, storeId, apiKey, webhookSecret } = value;
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
  }, [watch, keyData]);

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
        showToast(`Failed to configure webhook: ${errorBody}`, "error");
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
        showToast(error.message || "Failed to configure BTCPay webhook", "error");
      } else {
        showToast("An unknown error occurred while configuring BTCPay webhook", "error");
      }
      return false;
    } finally {
      setValidating(false);
    }
  };

  const onSubmit = handleSubmit(async (data) => {
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
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  });

  const onCancel = () => {
    deleteMutation.mutate({ id: credentialId });
  };

  const btcpayIcon = (
    <>
      <img className="h-5 w-5" src="/app-store/btcpayserver/btcpay.svg" alt="BTCPay Server Icon" />
    </>
  );

  if (session.status === "loading") return <></>;

  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  const isNewCredential = !props.serverUrl && !props.storeId && !props.webhookSecret && !props.apiKey;
  const webhookUri = `${WEBAPP_URL}/api/integrations/btcpayserver/webhook`;

  return (
    <>
      <div className="bg-default flex h-screen items-center justify-center">
        {showContent ? (
          <div className="flex w-full w-full max-w-[43em] flex-col items-center justify-center stack-y-4 p-4 lg:stack-y-5">
            <form className="w-full stack-y-4" onSubmit={onSubmit}>
              <div className="bg-default border-subtle overflow-auto rounded border">
                <div className="border-subtle flex items-center justify-between border-b p-4 md:p-5">
                  <h2 className="text-2xl font-semibold">BTCPay Server Information</h2>
                </div>
                <div className="w-full stack-y-4 p-4 md:p-5">
                  <div className="w-full">
                    <KeyField
                      {...register("serverUrl", { required: true })}
                      id="serverUrl"
                      name="serverUrl"
                      containerClassName="w-full"
                      label="BTCPay Server Url"
                      autoComplete="off"
                      autoCorrect="off"
                      defaultValue={keyData?.serverUrl || ""}
                    />
                    {errors.serverUrl && (
                      <p data-testid="required" className="py-2 text-xs text-red-500">
                        {errors.serverUrl?.message}
                      </p>
                    )}
                  </div>

                  <div className="w-full">
                    <KeyField
                      {...register("storeId", { required: true })}
                      id="storeId"
                      name="storeId"
                      containerClassName="w-full"
                      label="BTCPay Store Id"
                      autoComplete="off"
                      autoCorrect="off"
                      defaultValue={keyData?.storeId || ""}
                    />
                    {errors.storeId && (
                      <p data-testid="required" className="py-2 text-xs text-red-500">
                        {errors.storeId?.message}
                      </p>
                    )}
                  </div>

                  <div className="w-full">
                    <KeyField
                      {...register("apiKey", { required: true })}
                      id="apiKey"
                      name="apiKey"
                      containerClassName="w-full"
                      label="API Key"
                      autoComplete="off"
                      autoCorrect="off"
                      defaultValue={keyData?.apiKey || ""}
                    />
                    {errors.apiKey && (
                      <p data-testid="required" className="py-2 text-xs text-red-500">
                        {errors.apiKey?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4">
                {isNewCredential ? (
                  <>
                    <Button color="secondary" className="h-10" onClick={onCancel}>
                      Cancel
                    </Button>
                    <Button
                      className="h-10"
                      color="primary"
                      type="submit"
                      disabled={loading || validating || !updatable}>
                      {loading ? (
                        <>
                          <Icon name="loader" className="mr-2 animate-spin" />
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
            </form>
          </div>
        ) : (
          <AppNotInstalledMessage appName="btcpayserver" />
        )}
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
