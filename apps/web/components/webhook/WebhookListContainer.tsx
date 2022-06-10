import { PlusIcon } from "@heroicons/react/solid";
import { useState } from "react";

import Button from "@calcom/ui/Button";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";

import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import { List } from "@components/List";
import { ShellSubHeading } from "@components/Shell";
import SkeletonLoader from "@components/apps/SkeletonLoader";
import WebhookDialogForm from "@components/webhook/WebhookDialogForm";
import WebhookListItem, { TWebhook } from "@components/webhook/WebhookListItem";

export type WebhookListContainerType = {
  title: string;
  subtitle: string;
  eventTypeId?: number;
};

export default function WebhookListContainer(props: WebhookListContainerType) {
  const query = trpc.useQuery(["viewer.webhook.list", { eventTypeId: props.eventTypeId }], {
    suspense: true,
  });
  const [newWebhookModal, setNewWebhookModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<TWebhook | null>(null);
  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader />}
      success={({ data }) => (
        <div className="border-b border-gray-200 py-8 pl-2 pr-1">
          <ShellSubHeading
            className="mt-2"
            title={props.title}
            subtitle={props.subtitle}
            actions={
              <Button
                color="secondary"
                size="icon"
                StartIcon={PlusIcon}
                onClick={() => setNewWebhookModal(true)}
                data-testid="new_webhook"
              />
            }
          />

          {data.length ? (
            <List className="mt-6">
              {data.map((item) => (
                <WebhookListItem
                  key={item.id}
                  webhook={item}
                  onEditWebhook={() => {
                    setEditing(item);
                    setEditModalOpen(true);
                  }}
                />
              ))}
            </List>
          ) : null}

          {/* New webhook dialog */}
          <Dialog open={newWebhookModal} onOpenChange={(isOpen) => !isOpen && setNewWebhookModal(false)}>
            <DialogContent>
              <WebhookDialogForm
                eventTypeId={props.eventTypeId}
                handleClose={() => setNewWebhookModal(false)}
              />
            </DialogContent>
          </Dialog>
          {/* Edit webhook dialog */}
          <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
            <DialogContent>
              {editing && (
                <WebhookDialogForm
                  key={editing.id}
                  eventTypeId={props.eventTypeId || undefined}
                  handleClose={() => setEditModalOpen(false)}
                  defaultValues={editing}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    />
  );
}
