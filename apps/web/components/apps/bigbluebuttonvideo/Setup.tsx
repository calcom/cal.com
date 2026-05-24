"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { Button } from "@calcom/ui/components/button";
import {
  Form,
  FormField,
  Input,
  PasswordField,
  Label,
} from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

/** 表单字段验证模式 */
const formSchema = z.object({
  serverUrl: z.string().url(),
  sharedSecret: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * BigBlueButton Setup 组件
 * 收集用户的 BBB 服务器 URL 和共享密钥
 */
export default function BigBlueButtonSetup() {
  const { t } = useLocale();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      serverUrl: "",
      sharedSecret: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/integrations/bigbluebuttonvideo/add", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const json = await res.json();
        throw new HttpError({ statusCode: res.status, message: json.message });
      }

      const json = await res.json();
      router.push(json.url);
    } catch (err) {
      if (err instanceof HttpError) {
        showToast(err.message, "error");
      } else {
        showToast(t("something_went_wrong"), "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Form form={form} handleSubmit={onSubmit}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="serverUrl"
          render={({ field }) => (
            <div>
              <Label>{t("bbb_server_url")}</Label>
              <Input
                {...field}
                type="url"
                placeholder="https://your-bbb-server.com/bigbluebutton"
                required
              />
            </div>
          )}
        />
        <FormField
          control={form.control}
          name="sharedSecret"
          render={({ field }) => (
            <div>
              <Label>{t("bbb_shared_secret")}</Label>
              <PasswordField
                {...field}
                placeholder={t("bbb_shared_secret_placeholder")}
                required
              />
            </div>
          )}
        />
      </div>
      <Button
        type="submit"
        loading={isSubmitting}
        className="mt-4 w-full"
        data-testid="bbb-submit-button">
        {t("submit")}
      </Button>
    </Form>
  );
}