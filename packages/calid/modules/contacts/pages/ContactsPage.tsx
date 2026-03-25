"use client";

import { Button } from "@calid/features/ui/components/button";
import { triggerToast } from "@calid/features/ui/components/toast";
import { keepPreviousData } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { trpc } from "@calcom/trpc/react";

import { AddEditContactModal } from "../components/AddEditContactModal";
import { NoContactsState, NoContactResultsState } from "../components/ContactsEmptyStates";
import { ContactsMobileList } from "../components/ContactsMobileList";
import { ContactsPagination } from "../components/ContactsPagination";
import { ContactsTable } from "../components/ContactsTable";
import { ContactsToolbar } from "../components/ContactsToolbar";
import { ScheduleMeetingModal } from "../components/ScheduleMeetingModal";
import { ShareAvailabilityModal } from "../components/ShareAvailabilityModal";
import { useContactsListState } from "../hooks/useContactsListState";
import { mapContactDraftToCreateInput, mapContactRowToContact } from "../mappers/contactMappers";
import type { Contact, ContactDraft } from "../types";

const ContactsPage = () => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const { search, sortKey, sortDirection, page, limit, queryInput, onSearchChange, onSortChange, setPage } =
    useContactsListState();

  const listQuery = trpc.viewer.calIdContacts.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const contacts = useMemo(
    () => (listQuery.data?.rows ?? []).map(mapContactRowToContact),
    [listQuery.data?.rows]
  );
  const totalItems = listQuery.data?.meta.totalRowCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const hasActiveSearch = search.trim().length > 0;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, setPage, totalPages]);

  const [addOpen, setAddOpen] = useState(false);
  const [shareContact, setShareContact] = useState<Contact | null>(null);
  const [scheduleContact, setScheduleContact] = useState<Contact | null>(null);
  const [addEditErrorMessage, setAddEditErrorMessage] = useState<string | null>(null);

  const createContactMutation = trpc.viewer.calIdContacts.create.useMutation({
    async onSuccess() {
      await utils.viewer.calIdContacts.list.invalidate();
    },
  });

  const handleRowClick = (contactId: number) => {
    router.push(`/contacts/${contactId}`);
  };

  const handleSaveContact = async (draft: ContactDraft) => {
    setAddEditErrorMessage(null);

    try {
      await createContactMutation.mutateAsync(mapContactDraftToCreateInput(draft));
      triggerToast("Contact created", "success");
      setPage(1);
      setAddOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save contact";
      setAddEditErrorMessage(message);
      triggerToast(message, "error");
    }
  };

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="mb-1 text-lg font-semibold">Failed to load contacts</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {listQuery.error.message || "Please try again in a moment."}
        </p>
        <Button color="secondary" onClick={() => listQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (totalItems === 0 && !hasActiveSearch) {
    return (
      <>
        <NoContactsState onAddContact={() => setAddOpen(true)} />
        <AddEditContactModal
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) {
              setAddEditErrorMessage(null);
            }
          }}
          onSave={handleSaveContact}
          isSubmitting={createContactMutation.isPending}
          errorMessage={addEditErrorMessage}
        />
      </>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <ContactsToolbar
        isMobile={isMobile}
        search={search}
        onSearchChange={onSearchChange}
        onAddContact={() => setAddOpen(true)}
      />

      {listQuery.isFetching ? (
        <div className="flex items-center gap-2 text-xs">
          <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
          <span className="text-muted-foreground">Updating contacts…</span>
        </div>
      ) : null}

      {contacts.length === 0 ? <NoContactResultsState /> : null}

      {contacts.length > 0 && !isMobile ? (
        <ContactsTable
          contacts={contacts}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          onRowClick={handleRowClick}
          onShare={setShareContact}
          onSchedule={setScheduleContact}
        />
      ) : null}

      {contacts.length > 0 && isMobile ? (
        <ContactsMobileList
          contacts={contacts}
          onRowClick={handleRowClick}
          onShare={setShareContact}
          onSchedule={setScheduleContact}
        />
      ) : null}

      <ContactsPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
      />

      <AddEditContactModal
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setAddEditErrorMessage(null);
          }
        }}
        onSave={handleSaveContact}
        isSubmitting={createContactMutation.isPending}
        errorMessage={addEditErrorMessage}
      />
      <ShareAvailabilityModal
        open={Boolean(shareContact)}
        onOpenChange={(open) => {
          if (!open) {
            setShareContact(null);
          }
        }}
        contact={shareContact}
      />
      <ScheduleMeetingModal
        open={Boolean(scheduleContact)}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleContact(null);
          }
        }}
        contact={scheduleContact}
      />
    </div>
  );
};

export default ContactsPage;
