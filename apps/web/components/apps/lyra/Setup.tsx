import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Toaster } from "sonner";
import z from "zod";

const formSchema = z.object({
  api_key: z.string().min(1, "API key is required"),
});

export default function LyraSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);

  const form = useForm<{ api_key: string }>({
    resolver: zodResolver(formSchema),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f7] p-4 dark:bg-[#0f0f0f]">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-[0_0_5px_rgba(0,0,0,0.02),0_16px_32px_rgba(0,0,0,0.08)] dark:bg-[#171717]">
        {/* Header */}
        <div className="flex items-center gap-4 border-[#e9eaeb] border-b bg-[rgba(0,0,0,0.02)] px-6 py-4 dark:border-[#222] dark:bg-[rgba(255,255,255,0.02)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#ff5207]/10">
            <Image src="/api/app-store/lyra/icon.svg" alt="Lyra" width={32} height={32} />
          </div>
          <div>
            <h1 className="font-medium text-[#1b1c1e] text-lg tracking-tight dark:text-[#eee]">
              Connect Lyra
            </h1>
            <p className="text-[#7a7c80] text-sm dark:text-[#b3b3b3]">The meeting platform built for pros.</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="mb-6 text-[#5c5d62] text-sm leading-relaxed dark:text-[#b3b3b3]">
            Enter your Lyra API key to enable AI-powered video meetings. You can generate one in your{" "}
            <a
              className="font-medium text-[#ff5207] transition-colors hover:text-[#f14400]"
              href="https://app.lyra.so/settings/account/api-keys"
              target="_blank"
              rel="noopener noreferrer">
              Lyra settings
            </a>
            . Your key will be stored securely and encrypted.
          </p>

          <Form
            form={form}
            handleSubmit={async (values) => {
              setIsValidating(true);

              // First, verify the API key with Lyra
              try {
                const checkRes = await fetch("/api/integrations/lyra/check", {
                  method: "POST",
                  body: JSON.stringify({ api_key: values.api_key }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                });

                if (!checkRes.ok) {
                  const checkJson = await checkRes.json();
                  showToast(checkJson.message || "Invalid API key", "error");
                  setIsValidating(false);
                  return;
                }
              } catch {
                showToast("Failed to verify API key", "error");
                setIsValidating(false);
                return;
              }

              // API key is valid, now save it
              const res = await fetch("/api/integrations/lyra/add", {
                method: "POST",
                body: JSON.stringify(values),
                headers: {
                  "Content-Type": "application/json",
                },
              });
              const json = await res.json();

              setIsValidating(false);

              if (res.ok) {
                router.push(json.url);
              } else {
                showToast(json.message, "error");
              }
            }}>
            <fieldset className="space-y-4" disabled={form.formState.isSubmitting || isValidating}>
              <Controller
                name="api_key"
                control={form.control}
                render={({ field: { onBlur, onChange, value } }) => (
                  <TextField
                    label="API Key"
                    labelProps={{ className: "!text-[#5c5d62] dark:!text-[#b3b3b3]" }}
                    className="!rounded-lg !border-[#e1e2e3] !bg-white !px-4 !py-3 !text-sm !shadow-none !ring-0 focus-within:!border-[#ff5207] focus-within:!ring-2 focus-within:!ring-[#ff5207]/20 dark:!border-[#292929] dark:!bg-[#191919] transition-all"
                    onBlur={onBlur}
                    name="api_key"
                    placeholder="lyra_xxxxxxxxxxxx..."
                    value={value || ""}
                    onChange={(e) => {
                      onChange(e.target.value);
                    }}
                  />
                )}
              />
            </fieldset>

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                color="secondary"
                className="!rounded-lg !border-0 !px-4 !py-2 !text-sm !font-medium !shadow-none !outline-none !ring-0 !transition-colors !duration-150"
                onClick={() => router.back()}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                loading={form.formState.isSubmitting || isValidating}
                className="!rounded-lg !border-0 !bg-[#ff5207] !px-4 !py-2 !text-sm !font-medium !shadow-none !outline-none !ring-0 !transition-colors !duration-150 hover:!bg-[#f14400]">
                {t("save")}
              </Button>
            </div>
          </Form>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
