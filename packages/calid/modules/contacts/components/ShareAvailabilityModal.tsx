"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calid/features/ui/components/dialog";
import { Select } from "@calid/features/ui/components/form/select";
import { Input } from "@calid/features/ui/components/input/input";
import { TextArea } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import { triggerToast } from "@calid/features/ui/components/toast";
import { Copy, Loader2, Mail, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { trpc } from "@calcom/trpc/react";

import { CONTACT_SHARE_OPTIONS } from "../constants";
import type { Contact } from "../types";
import { createAvailabilityShareLink } from "../utils/contactUtils";

interface ShareAvailabilityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

const NO_EVENT_TYPE_VALUE = "__no_event_type__";
const NO_EVENT_TYPE_OPTION = {
  label: "No event type",
  value: NO_EVENT_TYPE_VALUE,
};

export const ShareAvailabilityModal = ({ open, onOpenChange, contact }: ShareAvailabilityModalProps) => {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [message, setMessage] = useState(
    "Hi! Here is my availability link so you can pick a time that works for you."
  );
  const [copyPending, setCopyPending] = useState(false);
  const bookerUrl = useBookerUrl();

  const eventTypesQuery = trpc.viewer.eventTypes.list.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false,
  });
  const meQuery = trpc.viewer.me.get.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const selectedEventQuery = trpc.viewer.eventTypes.get.useQuery(
    {
      id: selectedEventId ?? 0,
    },
    {
      enabled: open && selectedEventId !== null,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!open) {
      setSelectedEventId(null);
      setCopyPending(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || selectedEventId === null || !eventTypesQuery.data) {
      return;
    }

    if (!eventTypesQuery.data.some((eventType) => eventType.id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [eventTypesQuery.data, open, selectedEventId]);

  const eventTypeOptions = useMemo(() => {
    const realOptions = (eventTypesQuery.data ?? []).map((eventType) => ({
      label: `${eventType.title} (${eventType.length} min)`,
      value: `${eventType.id}`,
    }));
    return [NO_EVENT_TYPE_OPTION, ...realOptions];
  }, [eventTypesQuery.data]);

  const selectedEventOption = useMemo(() => {
    if (selectedEventId === null) {
      return NO_EVENT_TYPE_OPTION;
    }

    return eventTypeOptions.find((option) => option.value === `${selectedEventId}`) ?? NO_EVENT_TYPE_OPTION;
  }, [eventTypeOptions, selectedEventId]);

  const shareLink = useMemo(() => {
    const selectedEventDetail = selectedEventQuery.data?.eventType;
    const usernameFromProfile = meQuery.data?.username ?? null;
    const normalizedBookerUrl = bookerUrl.replace(/\/+$/, "");

    if (selectedEventId === null) {
      if (!usernameFromProfile) {
        return "";
      }
      return `${normalizedBookerUrl}/${usernameFromProfile}`;
    }

    const eventSlug = selectedEventDetail?.slug;
    const eventBookerUrl = selectedEventDetail?.bookerUrl;
    const username = selectedEventDetail?.users.at(0)?.username ?? null;
    const teamSlug = selectedEventDetail?.team?.slug ?? null;
    const isOrgTeam = Boolean(selectedEventDetail?.team?.parentId);

    if (!selectedEventDetail || !eventSlug || !eventBookerUrl) {
      return "";
    }

    return createAvailabilityShareLink({
      bookerUrl: eventBookerUrl,
      eventSlug,
      username,
      teamSlug,
      isOrgTeam,
    });
  }, [bookerUrl, meQuery.data?.username, selectedEventId, selectedEventQuery.data?.eventType]);

  const copyLink = async () => {
    if (!shareLink) {
      triggerToast("Availability link is not available yet.", "error");
      return;
    }

    try {
      setCopyPending(true);
      await navigator.clipboard.writeText(shareLink);
      triggerToast("Availability link copied", "success");
    } catch {
      triggerToast("Could not copy availability link", "error");
    } finally {
      setCopyPending(false);
    }
  };

  const shareViaEmail = () => {
    if (!contact) {
      return;
    }
    if (!shareLink) {
      triggerToast("Availability link is not available yet.", "error");
      return;
    }

    const subject = `Availability from ${contact.name}`;
    const body = `${message}\n\n${shareLink}`;
    window.open(
      `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
    triggerToast("Email draft opened", "success");
  };

  const shareViaWhatsApp = () => {
    if (!shareLink) {
      triggerToast("Availability link is not available yet.", "error");
      return;
    }
    const payload = `${message} ${shareLink}`.trim();
    window.open(`https://wa.me/?text=${encodeURIComponent(payload)}`, "_blank", "noopener,noreferrer");
    triggerToast("Share window opened", "success");
  };

  const handleQuickShare = (shareId: string) => {
    if (shareId === "copy") {
      void copyLink();
      return;
    }

    if (shareId === "email") {
      shareViaEmail();
      return;
    }

    shareViaWhatsApp();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" enableOverflow className="flex max-h-[92vh] flex-col sm:max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Share2 className="h-4 w-4" />
            Share Availability {contact ? `with ${contact.name}` : ""}
          </DialogTitle>
          <DialogDescription>Send your availability link using your preferred channel.</DialogDescription>
        </DialogHeader>

        {/* Scrollable content body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-1 pb-1 pt-2">
            <div className="space-y-1.5">
              <Label>Select Event Type</Label>
              <Select
                options={eventTypeOptions}
                value={selectedEventOption}
                isLoading={eventTypesQuery.isLoading}
                isDisabled={eventTypesQuery.isError}
                onChange={(option) => {
                  if (!option) {
                    setSelectedEventId(null);
                    return;
                  }

                  if (option.value === NO_EVENT_TYPE_VALUE) {
                    setSelectedEventId(null);
                    return;
                  }

                  const parsedId = Number(option.value);
                  if (Number.isNaN(parsedId)) {
                    setSelectedEventId(null);
                    return;
                  }

                  setSelectedEventId(parsedId);
                }}
              />
              {eventTypesQuery.isError ? (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p>{eventTypesQuery.error.message || "Could not load event types."}</p>
                  <Button color="secondary" size="sm" onClick={() => eventTypesQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : null}
              {selectedEventId !== null && selectedEventQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading event details...
                </div>
              ) : null}
              {selectedEventQuery.isError ? (
                <p className="text-xs text-red-600">
                  {selectedEventQuery.error.message || "Could not load selected event type details."}
                </p>
              ) : null}
              {selectedEventId === null && meQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading your public booking page...
                </div>
              ) : null}
              {selectedEventId === null && meQuery.isError ? (
                <p className="text-xs text-red-600">
                  {meQuery.error.message || "Could not load your public booking page."}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="availability-link">Availability Link</Label>
              {/* Stack input + copy button on very narrow screens */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="availability-link"
                  value={shareLink}
                  readOnly
                  className="min-w-0 flex-1 truncate"
                />
                <Button
                  color="secondary"
                  onClick={copyLink}
                  className="shrink-0"
                  loading={copyPending}
                  disabled={!shareLink || copyPending}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="share-message">Message</Label>
              <TextArea
                id="share-message"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="border-default text-sm shadow"
              />
            </div>

            {/* Share option cards: 1 col on mobile, 3 cols on sm+ */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CONTACT_SHARE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuickShare(option.id)}
                  disabled={!shareLink}
                  className="border-border hover:bg-muted disabled:bg-muted/30 disabled:text-muted-foreground rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {option.id === "copy" ? <Copy className="h-3.5 w-3.5 shrink-0" /> : null}
                    {option.id === "email" ? <Mail className="h-3.5 w-3.5 shrink-0" /> : null}
                    {option.id === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5 shrink-0" /> : null}
                    {option.label}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button color="primary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
