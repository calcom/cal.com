"use client";

import { Button } from "@calid/features/ui/components/button";
import { Card, CardContent } from "@calid/features/ui/components/card";
import { Separator } from "@calid/features/ui/components/separator";
import { format } from "date-fns";
import { CalendarPlus, Edit2, Mail, Phone, Share2, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Contact } from "../types";
import { ContactAvatar } from "./ContactAvatar";
import { DeleteContactDialog } from "./DeleteContactDialog";

interface ContactProfileCardProps {
  contact: Contact;
  onEdit: () => void;
  onShare: () => void;
  onSchedule: () => void;
  onDelete: () => Promise<void> | void;
  isDeleting?: boolean;
  deleteErrorMessage?: string | null;
}

export const ContactProfileCard = ({
  contact,
  onEdit,
  onShare,
  onSchedule,
  onDelete,
  isDeleting = false,
  deleteErrorMessage,
}: ContactProfileCardProps) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    await onDelete();
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <ContactAvatar name={contact.name} avatar={contact.avatar} size="lg" />
            <h2 className="text-lg font-semibold">{contact.name}</h2>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
            {contact.phone ? (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>{contact.phone}</span>
              </div>
            ) : null}
            {contact.secondaryPhones.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">Secondary numbers</p>
                {contact.secondaryPhones.map((phone) => (
                  <div key={phone} className="flex items-center gap-3 text-sm">
                    <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span>{phone}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Button color="secondary" className="w-full justify-start" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" /> Edit Contact
            </Button>
            <Button color="secondary" className="w-full justify-start" onClick={onShare}>
              <Share2 className="h-3.5 w-3.5" /> Share Availability
            </Button>
            <Button color="secondary" className="w-full justify-start" onClick={onSchedule}>
              <CalendarPlus className="h-3.5 w-3.5" /> Schedule Meeting
            </Button>
            <Button
              color="secondary"
              className="text-destructive hover:text-destructive w-full justify-start"
              onClick={() => setConfirmDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete Contact
            </Button>
          </div>

          <div className="text-muted-foreground mt-4 text-xs">
            Added {format(contact.createdAt, "MMM d, yyyy")}
          </div>
        </CardContent>
      </Card>

      <DeleteContactDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        contactName={contact.name}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        errorMessage={deleteErrorMessage}
      />
    </>
  );
};
