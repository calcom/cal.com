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
import { useLocale } from "@calcom/lib/hooks/useLocale";
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

export const ShareAvailabilityModal = ({ open, onOpenChange, contact }: ShareAvailabilityModalProps) => {
  const { t } = useLocale();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [message, setMessage] = useState(t("contacts_share_message_default"));
  const [copyPending, setCopyPending] = useState(false);
  const bookerUrl = useBookerUrl();
  const noEventTypeOption = useMemo(
    () => ({
      label: t("contacts_no_event_type"),
      value: NO_EVENT_TYPE_VALUE,
    }),
    [t]
  );

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
      label: `${eventType.title} (${t("contacts_duration_in_min", { duration: eventType.length })})`,
      value: `${eventType.id}`,
    }));
    return [noEventTypeOption, ...realOptions];
  }, [eventTypesQuery.data, noEventTypeOption, t]);

  const selectedEventOption = useMemo(() => {
    if (selectedEventId === null) {
      return noEventTypeOption;
    }

    return eventTypeOptions.find((option) => option.value === `${selectedEventId}`) ?? noEventTypeOption;
  }, [eventTypeOptions, selectedEventId, noEventTypeOption]);

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
      triggerToast(t("contacts_availability_link_not_available"), "error");
      return;
    }

    try {
      setCopyPending(true);
      await navigator.clipboard.writeText(shareLink);
      triggerToast(t("contacts_availability_link_copied"), "success");
    } catch {
      triggerToast(t("contacts_could_not_copy_availability_link"), "error");
    } finally {
      setCopyPending(false);
    }
  };

  const shareViaEmail = () => {
    if (!contact) {
      return;
    }
    if (!shareLink) {
      triggerToast(t("contacts_availability_link_not_available"), "error");
      return;
    }

    const subject = t("contacts_availability_from_name", { name: contact.name });
    const body = `${message}\n\n${shareLink}`;
    window.open(
      `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
    triggerToast(t("contacts_email_draft_opened"), "success");
  };

  const shareViaWhatsApp = () => {
    if (!shareLink) {
      triggerToast(t("contacts_availability_link_not_available"), "error");
      return;
    }
    const payload = `${message} ${shareLink}`.trim();
    window.open(`https://wa.me/?text=${encodeURIComponent(payload)}`, "_blank", "noopener,noreferrer");
    triggerToast(t("contacts_share_window_opened"), "success");
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
            {contact
              ? t("contacts_share_availability_with_name", { name: contact.name })
              : t("contacts_share_availability")}
          </DialogTitle>
          <DialogDescription>{t("contacts_send_availability_using_preferred_channel")}</DialogDescription>
        </DialogHeader>

        {/* Scrollable content body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-1 pb-1 pt-2">
            <div className="space-y-1.5">
              <Label>{t("select_event_type")}</Label>
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
                  <p>{eventTypesQuery.error.message || t("contacts_could_not_load_event_types")}</p>
                  <Button color="secondary" size="sm" onClick={() => eventTypesQuery.refetch()}>
                    {t("retry")}
                  </Button>
                </div>
              ) : null}
              {selectedEventId !== null && selectedEventQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("contacts_loading_event_details")}
                </div>
              ) : null}
              {selectedEventQuery.isError ? (
                <p className="text-xs text-red-600">
                  {selectedEventQuery.error.message ||
                    t("contacts_could_not_load_selected_event_type_details")}
                </p>
              ) : null}
              {selectedEventId === null && meQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("contacts_loading_public_booking_page")}
                </div>
              ) : null}
              {selectedEventId === null && meQuery.isError ? (
                <p className="text-xs text-red-600">
                  {meQuery.error.message || t("contacts_could_not_load_public_booking_page")}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="availability-link">{t("contacts_availability_link")}</Label>
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
                  {t("contacts_copy")}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="share-message">{t("contacts_message")}</Label>
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
                    {t(option.labelKey)}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">{t(option.descriptionKey)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button color="primary" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
