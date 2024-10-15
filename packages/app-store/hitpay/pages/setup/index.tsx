import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import { z } from "zod";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, showToast, Icon } from "@calcom/ui";
import { Input } from "@calcom/ui";
import { HeadSeo } from "@calcom/ui";

import { hitpayCredentialKeysSchema } from "../../lib/hitpayCredentialKeysSchema";

export interface IHitPaySetupProps {
  email: string | null;
  apiKey: string | null;
  saltKey: string | null;
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
      type: "hitpay:oauth:success",
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
  const [updatable, setUpdatable] = useState<boolean>(false);
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

  const deleteMutation = trpc.viewer.deleteCredential.useMutation({
    onSuccess: () => {
      router.push("/apps/hitpay");
    },
    onError: () => {
      showToast(t("error_removing_app"), "error");
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
    watch,
  } = useForm<z.infer<typeof settingsSchema>>({
    defaultValues: {
      apiKey: props?.apiKey || "",
      saltKey: props?.saltKey || "",
    },
    reValidateMode: "onChange",
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    const subscription = watch((value) => {
      const { apiKey, saltKey } = value;
      if (props.apiKey !== apiKey || props.saltKey !== saltKey) {
        setUpdatable(true);
      } else {
        setUpdatable(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, props]);

  const onSubmit = handleSubmit(async (data) => {
    if (loading) return;
    setLoading(true);
    const { apiKey, saltKey } = data;
    try {
      saveKeysMutation.mutate({
        credentialId,
        key: hitpayCredentialKeysSchema.parse({
          api_key: apiKey,
          salt_key: saltKey,
        }),
      });
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
    <>
      <HeadSeo nextSeoProps={{ noindex: true, nofollow: true }} title="HitPay" description="" />
      <div className="bg-default flex h-screen items-center justify-center">
        {showContent ? (
          <div className="flex w-full w-full max-w-[43em] flex-col items-center justify-center space-y-4 p-4 lg:space-y-5">
            <div className="rounded bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Icon name="info" className="mb-0.5 inline-flex h-4 w-4" /> Create or connect to an existing
              HitPay account to receive payments for your paid bookings.
            </div>

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
              {!props.apiKey || !props.saltKey ? (
                <div className="flex justify-end gap-4">
                  <Button color="secondary" className="h-10 text-base" onClick={onCancel}>
                    Cancel
                  </Button>
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
              ) : (
                <div className="flex justify-end gap-4">
                  <Link href="/apps/hitpay" className="inline-block">
                    <Button color="secondary">Go to App Store</Button>
                  </Link>
                  <Button color="primary" type="submit" disabled={!updatable}>
                    Update
                  </Button>
                </div>
              )}
            </form>
          </div>
        ) : (
          <AppNotInstalledMessage appName="hitpay" />
        )}
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
