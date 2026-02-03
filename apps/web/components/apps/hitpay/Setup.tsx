import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { z } from "zod";

import AppNotInstalledMessage from "@calcom/app-store/_components/AppNotInstalledMessage";
import KeyField from "@calcom/app-store/hitpay/components/KeyInput";
import { hitpayCredentialKeysSchema } from "@calcom/app-store/hitpay/lib/hitpayCredentialKeysSchema";
import type { IHitPaySetupProps } from "@calcom/app-store/hitpay/pages/setup/_getServerSideProps";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

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
  const [isSandbox, SetIsSandbox] = useState<boolean>(props.isSandbox || false);
  const [keyData, setKeyData] = useState<
    | {
        apiKey: string;
        saltKey: string;
      }
    | undefined
  >();
  const session = useSession();
  const router = useRouter();
  const { t } = useLocale();

  const settingsSchema = z.object({
    apiKey: z
      .string()
      .trim()
      .min(64)
      .max(128, {
        message: t("max_limit_allowed_hint", { limit: 128 }),
      }),
    saltKey: z
      .string()
      .trim()
      .min(64)
      .max(128, {
        message: t("max_limit_allowed_hint", { limit: 128 }),
      }),
  });

  const integrations = trpc.viewer.apps.integrations.useQuery({ variant: "payment", appId: "hitpay" });
  const [HitPayPaymentAppCredentials] = integrations.data?.items || [];
  const [credentialId] = HitPayPaymentAppCredentials?.userCredentialIds || [-1];
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
      router.push("/apps/hitpay");
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
    const keyObj = isSandbox ? props.sandbox : props.prod;
    const _keyData = {
      apiKey: keyObj?.apiKey || "",
      saltKey: keyObj?.saltKey || "",
    };

    reset(_keyData);
    setKeyData(_keyData);
  }, [isSandbox]);

  useEffect(() => {
    const subscription = watch((value) => {
      const { apiKey, saltKey } = value;
      if (apiKey && saltKey && (keyData?.apiKey !== apiKey || keyData?.saltKey !== saltKey)) {
        setUpdatable(true);
      } else {
        setUpdatable(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, keyData]);

  const onSubmit = handleSubmit(async (data) => {
    if (loading) return;
    setLoading(true);
    try {
      const keyParams = {
        isSandbox,
        prod: isSandbox ? props.prod : data,
        sandbox: isSandbox ? data : props.sandbox,
      };
      saveKeysMutation.mutate({
        credentialId,
        key: hitpayCredentialKeysSchema.parse(keyParams),
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
      <div className="bg-default flex h-screen items-center justify-center">
        {showContent ? (
          <div className="flex w-full w-full max-w-[43em] flex-col items-center justify-center stack-y-4 p-4 lg:stack-y-5">
            <div className="rounded bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Icon name="info" className="mb-0.5 inline-flex h-4 w-4" /> Create or connect to an existing
              HitPay account to receive payments for your paid bookings.
            </div>

            <form className="w-full stack-y-4" onSubmit={onSubmit}>
              <div className="bg-default border-subtle overflow-auto rounded border">
                <div className="border-subtle flex items-center justify-between border-b p-4 md:p-5">
                  <h2 className="text-2xl font-semibold">Account Information</h2>
                  <div className="ml-auto flex items-center">
                    <Switch
                      onCheckedChange={(value) => SetIsSandbox(value as boolean)}
                      checked={isSandbox}
                      label="Sandbox"
                    />
                  </div>
                </div>
                <div className="w-full stack-y-4 p-4 md:p-5">
                  <div className="w-full">
                    <KeyField
                      {...register("apiKey", {
                        required: true,
                      })}
                      id="apiKey"
                      name="apiKey"
                      containerClassName="w-full"
                      label={t("api_key")}
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
                  <div className="w-full">
                    <KeyField
                      {...register("saltKey", {
                        required: true,
                      })}
                      id="saltKey"
                      name="saltKey"
                      containerClassName="w-full"
                      label="Salt"
                      autoComplete="off"
                      autoCorrect="off"
                      defaultValue={keyData?.saltKey || ""}
                    />

                    {errors.saltKey && (
                      <p data-testid="required" className="py-2 text-xs text-red-500">
                        {errors.saltKey?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {!props.prod && !props.sandbox ? (
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
