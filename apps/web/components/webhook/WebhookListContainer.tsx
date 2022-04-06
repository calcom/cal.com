import classNames from "classnames";
import Image from "next/image";
import { useState } from "react";

import Button from "@calcom/ui/Button";
import { Dialog, DialogContent } from "@calcom/ui/Dialog";

import { QueryCell } from "@lib/QueryCell";
import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import { ShellSubHeading } from "@components/Shell";
import WebhookDialogForm from "@components/webhook/WebhookDialogForm";
import WebhookListItem, { TWebhook } from "@components/webhook/WebhookListItem";

export type WebhookListContainerType = {
  title: string;
  subtitle: string;
  eventTypeId?: number;
};

export default function WebhookListContainer(props: WebhookListContainerType) {
  const { t } = useLocale();
  const query = props.eventTypeId
    ? trpc.useQuery(["viewer.webhook.list", { eventTypeId: props.eventTypeId }], {
        suspense: true,
      })
    : trpc.useQuery(["viewer.webhook.list"], {
        suspense: true,
      });

  const [newWebhookModal, setNewWebhookModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<TWebhook | null>(null);
  return (
    <QueryCell
      query={query}
      success={({ data }) => (
        <>
          <ShellSubHeading className="mt-10" title={props.title} subtitle={props.subtitle} />
          <List>
            <ListItem className={classNames("flex-col")}>
              <div
                className={classNames("flex w-full flex-1 items-center space-x-2 p-3 rtl:space-x-reverse")}>
                <Image width={40} height={40} src="/apps/webhooks.svg" alt="Webhooks" />
                <div className="flex-grow truncate pl-2">
                  <ListItemTitle component="h3">Webhooks</ListItemTitle>
                  <ListItemText component="p">{t("automation")}</ListItemText>
                </div>
                <div>
                  <Button
                    color="secondary"
                    onClick={() => setNewWebhookModal(true)}
                    data-testid="new_webhook">
                    {t("new_webhook")}
                  </Button>
                </div>
              </div>
            </ListItem>
          </List>

          {data.length ? (
            <List>
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
        </>
      )}
    />
  );
}
