import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField, TextAreaField, InputError } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

const contactFormSchema = z.object({
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export function IntercomContactForm() {
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/intercom-conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      showToast(t("message_sent_successfully"), "success");
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("something_went_wrong");
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{t("contact_support")}</h3>
        <p className="text-sm text-gray-600">{t("contact_support_description")}</p>
      </div>

      <Form form={form} handleSubmit={onSubmit}>
        <TextField
          label={`${t("subject")} (${t("optional")})`}
          placeholder={t("subject_placeholder")}
          {...form.register("subject")}
        />

        <TextAreaField
          label={t("message")}
          placeholder={t("message_placeholder")}
          required
          {...form.register("message")}
          rows={4}
        />

        {errorMessage && <InputError message={errorMessage} />}

        <Button type="submit" loading={isSubmitting} className="w-full">
          {t("send_message")}
        </Button>
      </Form>
    </div>
  );
}
