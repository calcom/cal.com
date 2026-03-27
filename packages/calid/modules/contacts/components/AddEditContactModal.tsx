"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import { Save, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { Contact, ContactDraft } from "../types";

interface AddEditContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSave: (draft: ContactDraft) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

interface ContactFormState {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export const AddEditContactModal = ({
  open,
  onOpenChange,
  contact,
  onSave,
  isSubmitting = false,
  errorMessage,
}: AddEditContactModalProps) => {
  const { t } = useLocale();
  const isEditMode = Boolean(contact);

  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes,
      });
    } else {
      setForm({ name: "", email: "", phone: "", notes: "" });
    }

    setErrors({});
  }, [contact, open]);

  const updateField = (field: keyof ContactFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));

    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: "" }));
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = t("contacts_name_is_required");
    }

    if (!form.email.trim()) {
      nextErrors.email = t("contacts_email_is_required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = t("contacts_invalid_email_format");
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    await onSave({
      ...form,
      ...(contact ? { id: contact.id } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" enableOverflow className="flex max-h-[92vh] flex-col sm:max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            {isEditMode ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isEditMode ? t("contacts_edit_contact") : t("contacts_add_contact")}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable form body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-1 pb-1 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">
                {t("contacts_full_name")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder={t("contacts_name_placeholder")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name ? <p className="text-destructive text-xs">{errors.name}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email">
                {t("contacts_email_address")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder={t("contacts_email_placeholder")}
                readOnly={isEditMode}
                className={`${errors.email ? "border-destructive" : ""} ${
                  isEditMode ? "bg-muted cursor-not-allowed" : ""
                }`}
              />
              {errors.email ? <p className="text-destructive text-xs">{errors.email}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">{t("contacts_phone_number")}</Label>
              <Input
                id="contact-phone"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder={t("contacts_phone_placeholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">{t("contacts_notes")}</Label>
              <TextArea
                id="contact-notes"
                rows={3}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder={t("contacts_add_relevant_notes")}
                className="border-default text-sm shadow"
              />
            </div>

            {errorMessage ? <p className="text-destructive text-xs">{errorMessage}</p> : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-0">
          <Button
            color="secondary"
            onClick={() => onOpenChange(false)}
            StartIcon="x"
            disabled={isSubmitting}
            className="w-full sm:w-auto">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
            CustomStartIcon={
              isEditMode ? <Save className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />
            }>
            {isEditMode ? t("contacts_update_contact") : t("contacts_create_contact")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
