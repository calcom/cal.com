import { useRouter } from "next/router";
import { useState } from "react";

import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";
import { List } from "@calcom/ui/List";
import { ShellSubHeading } from "@calcom/ui/Shell";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";

import { QueryCell } from "@lib/QueryCell";

import WebhookDialogForm from "@components/webhook/WebhookDialogForm";
import WebhookListItem, { TWebhook } from "@components/webhook/WebhookListItem";

export type WebhookListContainerType = {
  title: string;
  subtitle: string;
  eventTypeId?: number;
  appId?: string;
};

export default function WebhookListContainer(props: WebhookListContainerType) {
  const router = useRouter();
  const query = trpc.useQuery(
    ["viewer.webhook.list", { eventTypeId: props.eventTypeId, appId: props.appId }],
    {
      suspense: true,
      enabled: router.isReady,
    }
  );
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
                color="minimal"
                size="icon"
                StartIcon={Icon.FiPlus}
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
                app={props.appId}
                webhooks={data}
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
                  app={props.appId}
                  key={editing.id}
                  webhooks={data}
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
