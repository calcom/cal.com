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
      nextErrors.name = "Name is required";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Invalid email format";
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
      <DialogContent size="md" enableOverflow className="max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            {isEditMode ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isEditMode ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="e.g. John Doe"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name ? <p className="text-destructive text-xs">{errors.name}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="e.g. john@gmail.com"
              readOnly={isEditMode}
              className={`${errors.email ? "border-destructive" : ""} ${
                isEditMode ? "bg-muted cursor-not-allowed" : ""
              }`}
            />
            {errors.email ? <p className="text-destructive text-xs">{errors.email}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">Phone Number</Label>
            <Input
              id="contact-phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+91 98xxxxxxx"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-notes">Notes</Label>
            <TextArea
              id="contact-notes"
              rows={3}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Add any relevant notes..."
              className="border-default text-sm shadow"
            />
          </div>

          {errorMessage ? <p className="text-destructive text-xs">{errorMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button color="secondary" onClick={() => onOpenChange(false)} StartIcon="x" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            CustomStartIcon={
              isEditMode ? <Save className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />
            }>
            {isEditMode ? "Update Contact" : "Create Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
