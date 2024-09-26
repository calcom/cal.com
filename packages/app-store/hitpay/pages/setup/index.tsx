import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Badge, Button, showToast, Icon } from "@calcom/ui";
import { Input } from "@calcom/ui";

import { NEXT_PUBLIC_API_HITPAY } from "../../lib/constants";
import { hitpayCredentialKeysSchema } from "../../lib/hitpayCredentialKeysSchema";

export interface IHitPaySetupProps {
  email: string | null;
  apiKey: string | null;
  saltKey: string | null;
}

export interface IHitPayWebhookEventReturn {
  id: string;
  business_id: string;
  name: string;
  url: string;
  event_types: string[];
  created_at: string;
  updated_at: string;
}

export default function HitPaySetup(props: IHitPaySetupProps) {
  const params = useCompatSearchParams();
  if (params?.get("callback") === "true") {
    return <HitPaySetupCallback />;
  }

  return <HitPaySetupPage {...props} />;
}

function HitPaySetupCallback() {
  const [error, setError] = useState<string | null>(null);
  const searchParams = useCompatSearchParams();

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    if (!window.opener) {
      setError("Something went wrong. Opener not available. Please contact support@getalby.com");
      return;
    }

    const code = searchParams?.get("code");
    const error = searchParams?.get("error");

    if (!code) {
      setError("declined");
    }
    if (error) {
      setError(error);
      alert(error);
      return;
    }

    window.opener.postMessage({
      type: "alby:oauth:success",
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

function HitPaySetupPage(props: IHitPaySetupProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const session = useSession();
  const router = useRouter();
  const { t } = useLocale();
  const integrations = trpc.viewer.integrations.useQuery({ variant: "payment", appId: "hitpay" });
  console.log("hitpay setup integrations =>", integrations);
  const [HitPayPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = HitPayPaymentAppCredentials?.userCredentialIds || [-1];
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

  const settingsSchema = z.object({
    apiKey: z
      .string()
      .trim()
      .min(64)
      .max(64, {
        message: t("max_limit_allowed_hint", { limit: 64 }),
      }),
    saltKey: z
      .string()
      .trim()
      .min(64)
      .max(64, {
        message: t("max_limit_allowed_hint", { limit: 64 }),
      }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof settingsSchema>>({
    defaultValues: {
      apiKey: props?.apiKey || "",
      saltKey: props?.saltKey || "",
    },
    reValidateMode: "onChange",
    resolver: zodResolver(settingsSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    if (loading) return;
    setLoading(true);
    const { apiKey, saltKey } = data;
    const webhookBody = {
      name: `cal-${session?.data?.user?.username}`,
      url: `${WEBAPP_URL}/api/integrations/hitpay/webhook`,
      event_types: [
        "charge.created",
        "charge.updated",
        "payout.created",
        "order.created",
        "order.updated",
        "invoice.created",
      ],
    };
    try {
      const options = {
        method: "POST",
        headers: {
          "X-BUSINESS-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookBody),
      };

      const response = await fetch(`${NEXT_PUBLIC_API_HITPAY}/v1/webhook-events`, options);
      if (!response.ok) {
        throw new Error(response?.status);
      }

      const webhookRet = await response.json();

      saveKeysMutation.mutate({
        credentialId,
        key: hitpayCredentialKeysSchema.parse({
          api_key: apiKey,
          salt_key: saltKey,
          webhook_endpoint_id: webhookRet.id,
          webhook_endpoint_name: webhookRet.name,
          webhook_endpoint_url: webhookRet.url,
          webhook_endpoint_business_id: webhookRet.business_id,
          webhook_endpoint_salt: webhookRet.salt,
        }),
      });
    } catch (error: any) {
      console.log("HitPay setup error =>", error);
      showToast(error.message || error.toString(), "error");
    } finally {
      setLoading(false);
    }
  });

  const hitpayIcon = (
    <>
      <img className="h-5 w-5" src="/app-store/hitpay/icon.svg" alt="HitPay Icon" />
    </>
  );

  if (session.status === "loading") return <></>;

  if (integrations.isPending) {
    return <div className="absolute z-50 flex h-screen w-full items-center bg-gray-200" />;
  }

  return (
    <div className="bg-default flex h-screen items-center justify-center">
      {showContent ? (
        <div className="flex w-full w-full max-w-[43em] flex-col items-center justify-center space-y-4 p-4 lg:space-y-5">
          <div className="rounded bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Icon name="info" className="mb-0.5 inline-flex h-4 w-4" /> Create or connect to an existing
            HitPay account to receive payments for your paid bookings.
          </div>

          {!props.apiKey || !props.saltKey ? (
            <form className="w-full space-y-4" onSubmit={onSubmit}>
              <div className="bg-default border-subtle overflow-auto rounded border">
                <div className="border-subtle border-b-[1px] p-4 md:p-5">
                  <h2 className="text-2xl font-semibold">Account Information</h2>
                </div>
                <div className="w-full space-y-4 p-4 md:p-5">
                  <div className="w-full">
                    <label htmlFor="apiKey" className="text-default mb-2 block text-sm font-medium">
                      {t("api_key")}
                    </label>
                    <Input
                      {...register("apiKey", {
                        required: true,
                      })}
                      id="apiKey"
                      name="apiKey"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                    />
                    {errors.apiKey && (
                      <p data-testid="required" className="py-2 text-xs text-red-500">
                        {errors.apiKey?.message}
                      </p>
                    )}
                  </div>
                  <div className="w-full">
                    <label htmlFor="apiKey" className="text-default mb-2 block text-sm font-medium">
                      Salt
                    </label>
                    <Input
                      {...register("saltKey", {
                        required: true,
                      })}
                      id="saltKey"
                      name="saltKey"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                    />
                    {errors.saltKey && (
                      <p data-testid="required" className="py-2 text-xs text-red-500">
                        {errors.saltKey?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <Link href="/apps">
                  <Button color="secondary" className="h-10 text-base">
                    Cancel
                  </Button>
                </Link>
                <button
                  className="font-body flex h-10 w-56 items-center justify-center gap-2 rounded-md font-bold text-black shadow transition-all hover:brightness-90 active:scale-95"
                  style={{
                    background: "linear-gradient(180deg, #FFDE6E 63.72%, #F8C455 95.24%)",
                  }}
                  type="submit"
                  disabled={loading}>
                  {hitpayIcon}
                  <span className="mr-2">Connect with HitPay</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-default border-subtle space-y-4 overflow-auto rounded border p-4 md:p-5 lg:space-y-5">
              <div className="space-y-4 lg:space-y-5">
                {hitpayIcon}
                <p>HitPay Connected!</p>
                <Badge>Email: {props.email}</Badge>
                <Badge>API Key: {props.apiKey}</Badge>
                <Badge>API Key: {props.saltKey}</Badge>
              </div>
              <Link href="/apps/hitpay" className="inline-block">
                <Button color="secondary">Go to App Store</Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <AppNotInstalledMessage appName="hitpay" />
      )}
      <Toaster position="bottom-right" />
    </div>
  );
}
