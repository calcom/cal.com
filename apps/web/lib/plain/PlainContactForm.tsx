"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { FileUploader, type FileData } from "@calcom/ui/components/file-uploader";
import { Input, Label, TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments?: FileData[];
}

const PlainContactForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const { t } = useLocale();

  const [formData, setFormData] = useState<ContactFormData>({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    subject: "",
    message: "",
    attachments: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilesChange = (files: FileData[]) => {
    setFormData((prev) => ({ ...prev, attachments: files }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/plain-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit contact form");
      }

      setIsSubmitted(true);
      setFormData({
        name: session?.user?.name || "",
        email: session?.user?.email || "",
        subject: "",
        message: "",
        attachments: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setError(null);
    setFormData({
      name: session?.user?.name || "",
      email: session?.user?.email || "",
      subject: "",
      message: "",
      attachments: [],
    });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-800">
          <Icon name="messages-square" className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="w-80 rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">{t("contact_support")}</h3>
          <Button variant="icon" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0">
            <Icon name="x" className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          {isSubmitted ? (
            <div className="text-center">
              <div className="mb-4 text-green-600">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-medium text-gray-900">{t("message_sent")}</h4>
              <p className="mb-4 text-sm text-gray-600">{t("contact_form_success_message")}</p>
              <Button onClick={resetForm} variant="button" size="sm">
                {t("send_another_message")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="subject">{t("subject")}</Label>
                <Input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="message">{t("message")}</Label>
                <TextArea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                />
              </div>

              <div>
                <Label>{t("attachments_optional")}</Label>
                <FileUploader
                  id="contact-attachments"
                  buttonMsg={t("add_files")}
                  onFilesChange={handleFilesChange}
                  acceptedFileTypes="image/*,video/*"
                  maxFiles={5}
                  maxFileSize={10 * 1024 * 1024}
                  disabled={isSubmitting}
                  testId="contact-form-file-upload"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <Icon name="send" className="mr-2 h-4 w-4" />
                    {t("send_message")}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlainContactForm;
