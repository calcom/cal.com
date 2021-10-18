import { PencilAltIcon, TrashIcon } from "@heroicons/react/outline";
import { WebhookTriggerEvents } from "@prisma/client";
import Image from "next/image";
import { getErrorFromUnknown } from "pages/_error";
import { Fragment, ReactNode, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "react-query";

import { QueryCell } from "@lib/QueryCell";
import classNames from "@lib/classNames";
import * as fetcher from "@lib/core/http/fetch-wrapper";
import { useLocale } from "@lib/hooks/useLocale";
import { AddAppleIntegrationModal } from "@lib/integrations/Apple/components/AddAppleIntegration";
import { AddCalDavIntegrationModal } from "@lib/integrations/CalDav/components/AddCalDavIntegration";
import showToast from "@lib/notification";
import { inferQueryOutput, trpc } from "@lib/trpc";

import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@components/Dialog";
import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import Shell, { ShellSubHeading } from "@components/Shell";
import { Tooltip } from "@components/Tooltip";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import { FieldsetLegend, Form, InputGroupBox, TextField } from "@components/form/fields";
import { Alert } from "@components/ui/Alert";
import Badge from "@components/ui/Badge";
import Button, { ButtonBaseProps } from "@components/ui/Button";
import Switch from "@components/ui/Switch";

function pluralize(opts: { num: number; plural: string; singular: string }) {
  if (opts.num === 0) {
    return opts.singular;
  }
  return opts.singular;
}

type TIntegrations = inferQueryOutput<"viewer.integrations">;
type TWebhook = TIntegrations["webhooks"][number];

const ALL_TRIGGERS: WebhookTriggerEvents[] = [
  //
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
];
function WebhookListItem(props: { webhook: TWebhook; onEditWebhook: () => void }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const deleteWebhook = useMutation(async () => fetcher.remove(`/api/webhooks/${props.webhook.id}`, null), {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.integrations"]);
    },
  });

  return (
    <ListItem className="p-4 flex w-full">
      <div className="flex w-full justify-between my-4">
        <div className="flex pr-2 border-r border-gray-100">
          <span className="flex flex-col space-y-2 text-xs">
            {props.webhook.eventTriggers.map((eventTrigger, ind) => (
              <span key={ind} className="px-1 text-xs text-blue-700 rounded-md w-max bg-blue-50">
                {t(`${eventTrigger.toLowerCase()}`)}
              </span>
            ))}
          </span>
        </div>
        <div className="flex w-full">
          <div className="self-center inline-block ml-3 space-y-1">
            <span className="flex text-sm text-neutral-700">{props.webhook.subscriberUrl}</span>
          </div>
        </div>
        <div className="flex">
          {!props.webhook.active && (
            <span className="self-center h-6 px-3 py-1 text-xs text-red-700 capitalize rounded-md bg-red-50">
              {t("disabled")}
            </span>
          )}
          {!!props.webhook.active && (
            <span className="self-center h-6 px-3 py-1 text-xs text-green-700 capitalize rounded-md bg-green-50">
              {t("enabled")}
            </span>
          )}

          <Tooltip content={t("edit_webhook")}>
            <Button
              onClick={() => props.onEditWebhook()}
              color="minimal"
              size="icon"
              StartIcon={PencilAltIcon}
              className="self-center w-full p-2 ml-4"></Button>
          </Tooltip>
          <Dialog>
            <Tooltip content={t("delete_webhook")}>
              <DialogTrigger asChild>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  color="minimal"
                  size="icon"
                  StartIcon={TrashIcon}
                  className="self-center w-full p-2 ml-2"></Button>
              </DialogTrigger>
            </Tooltip>
            <ConfirmationDialogContent
              variety="danger"
              title={t("delete_webhook")}
              confirmBtnText={t("confirm_delete_webhook")}
              cancelBtnText={t("cancel")}
              onConfirm={() => deleteWebhook.mutate()}>
              {t("delete_webhook_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        </div>
      </div>
    </ListItem>
  );
}

function WebhookDialogForm(props: {
  //
  defaultValues?: TWebhook;
  handleClose: () => void;
}) {
  const { t } = useLocale();

  const utils = trpc.useContext();
  const {
    defaultValues = {
      id: "",
      eventTriggers: ALL_TRIGGERS,
      subscriberUrl: "",
      active: true,
    },
  } = props;

  const form = useForm({
    defaultValues,
  });
  return (
    <Form
      data-testid="WebhookDialogForm"
      form={form}
      onSubmit={(event) => {
        form
          .handleSubmit(async (values) => {
            const { id } = values;
            const body = {
              subscriberUrl: values.subscriberUrl,
              enabled: values.active,
              eventTriggers: values.eventTriggers,
            };
            if (id) {
              await fetcher.patch(`/api/webhooks/${id}`, body);
              await utils.invalidateQueries(["viewer.integrations"]);
              showToast(t("webhook_updated_successfully"), "success");
            } else {
              await fetcher.post("/api/webhook", body);
              await utils.invalidateQueries(["viewer.integrations"]);
              showToast(t("webhook_created_successfully"), "success");
            }

            props.handleClose();
          })(event)
          .catch((err) => {
            showToast(`${getErrorFromUnknown(err).message}`, "error");
          });
      }}
      className="space-y-4">
      <input type="hidden" {...form.register("id")} />
      <TextField label={t("subscriber_url")} {...form.register("subscriberUrl")} required type="url" />

      <fieldset className="space-y-2">
        <FieldsetLegend>{t("event_triggers")}</FieldsetLegend>
        <InputGroupBox>
          {ALL_TRIGGERS.map((key) => (
            <Controller
              key={key}
              control={form.control}
              name="eventTriggers"
              render={({ field }) => (
                <Switch
                  label={t(key.toLowerCase())}
                  defaultChecked={field.value.includes(key)}
                  onCheckedChange={(isChecked) => {
                    const value = field.value;
                    const newValue = isChecked ? [...value, key] : value.filter((v) => v !== key);

                    form.setValue("eventTriggers", newValue, {
                      shouldDirty: true,
                    });
                  }}
                />
              )}
            />
          ))}
        </InputGroupBox>
      </fieldset>
      <fieldset className="space-y-2">
        <FieldsetLegend>{t("webhook_status")}</FieldsetLegend>
        <InputGroupBox>
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <Switch
                label={t("webhook_enabled")}
                defaultChecked={field.value}
                onCheckedChange={(isChecked) => {
                  form.setValue("active", isChecked);
                }}
              />
            )}
          />
        </InputGroupBox>
      </fieldset>
      <DialogFooter>
        <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
          {t("cancel")}
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t("save")}
        </Button>
      </DialogFooter>
    </Form>
  );
}

function WebhookEmbed(props: { webhooks: TWebhook[] }) {
  const { t } = useLocale();
  const user = trpc.useQuery(["viewer.me"]).data;

  const iframeTemplate = `<iframe src="${process.env.NEXT_PUBLIC_BASE_URL}/${user?.username}" frameborder="0" allowfullscreen></iframe>`;
  const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${t(
    "schedule_a_meeting"
  )}</title><style>body {margin: 0;}iframe {height: calc(100vh - 4px);width: calc(100vw - 4px);box-sizing: border-box;}</style></head><body>${iframeTemplate}</body></html>`;

  const [newWebhookModal, setNewWebhookModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<TWebhook | null>(null);
  return (
    <>
      <ShellSubHeading className="mt-10" title={t("Webhooks")} subtitle={t("receive_cal_meeting_data")} />
      <List>
        <ListItem className={classNames("flex-col")}>
          <div className={classNames("flex flex-1 space-x-2 w-full p-3 items-center")}>
            <Image width={40} height={40} src="/integrations/webhooks.svg" alt="Webhooks" />
            <div className="flex-grow pl-2 truncate">
              <ListItemTitle component="h3">Webhooks</ListItemTitle>
              <ListItemText component="p">Automation</ListItemText>
            </div>
            <div>
              <Button color="secondary" onClick={() => setNewWebhookModal(true)} data-testid="new_webhook">
                {t("new_webhook")}
              </Button>
            </div>
          </div>
        </ListItem>
      </List>

      {props.webhooks.length ? (
        <List>
          {props.webhooks.map((item) => (
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
      <div className="divide-y divide-gray-200 lg:col-span-9">
        <div className="py-6 lg:pb-8">
          <div>
            {/* {!!props.webhooks.length && (
              <WebhookList
                webhooks={props.webhooks}
                onChange={() => {}}
                onEditWebhook={editWebhook}></WebhookList>
            )} */}
          </div>
        </div>
      </div>

      <ShellSubHeading className="mt-10" title={t("iframe_embed")} subtitle={t("embed_calcom")} />
      <div className="py-6 lg:pb-8 lg:col-span-9">
        <div className="mb-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900 font-cal"></h2>
          <p className="mt-1 text-sm text-gray-500"></p>
        </div>
        <div className="grid grid-cols-2 space-x-4">
          <div>
            <label htmlFor="iframe" className="block text-sm font-medium text-gray-700">
              {t("standard_iframe")}
            </label>
            <div className="mt-1">
              <textarea
                id="iframe"
                className="block w-full h-32 border-gray-300 rounded-sm shadow-sm focus:ring-black focus:border-black sm:text-sm"
                placeholder={t("loading")}
                defaultValue={iframeTemplate}
                readOnly
              />
            </div>
          </div>
          <div>
            <label htmlFor="fullscreen" className="block text-sm font-medium text-gray-700">
              {t("responsive_fullscreen_iframe")}
            </label>
            <div className="mt-1">
              <textarea
                id="fullscreen"
                className="block w-full h-32 border-gray-300 rounded-sm shadow-sm focus:ring-black focus:border-black sm:text-sm"
                placeholder={t("loading")}
                defaultValue={htmlTemplate}
                readOnly
              />
            </div>
          </div>
        </div>

        <ShellSubHeading className="mt-10" title="Cal.com API" subtitle={t("leverage_our_api")} />
        <a href="https://developer.cal.com/api" className="btn btn-primary">
          {t("browse_api_documentation")}
        </a>
      </div>

      {/* New webhook dialog */}
      <Dialog open={newWebhookModal} onOpenChange={(isOpen) => !isOpen && setNewWebhookModal(false)}>
        <DialogContent>
          <WebhookDialogForm handleClose={() => setNewWebhookModal(false)} />
        </DialogContent>
      </Dialog>
      {/* Edit webhook dialog */}
      <Dialog open={editModalOpen} onOpenChange={(isOpen) => !isOpen && setEditModalOpen(false)}>
        <DialogContent>
          {editing && (
            <WebhookDialogForm
              key={editing.id}
              handleClose={() => setEditModalOpen(false)}
              defaultValues={editing}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubHeadingTitleWithConnections(props: { title: ReactNode; numConnections?: number }) {
  const num = props.numConnections;
  return (
    <>
      <span>{props.title}</span>
      {num ? (
        <Badge variant="success">
          {num}{" "}
          {pluralize({
            num,
            singular: "connection",
            plural: "connections",
          })}
        </Badge>
      ) : null}
    </>
  );
}

function ConnectIntegration(props: { type: string; render: (renderProps: ButtonBaseProps) => JSX.Element }) {
  const { type } = props;
  const [isLoading, setIsLoading] = useState(false);
  const mutation = useMutation(async () => {
    const res = await fetch("/api/integrations/" + type.replace("_", "") + "/add");
    if (!res.ok) {
      throw new Error("Something went wrong");
    }
    const json = await res.json();
    window.location.href = json.url;
    setIsLoading(true);
  });
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const utils = trpc.useContext();

  const setIsModalOpen: typeof _setIsModalOpen = (v) => {
    _setIsModalOpen(v);
    // refetch intergrations on modal toggles

    utils.invalidateQueries(["viewer.integrations"]);
  };

  return (
    <>
      {props.render({
        onClick() {
          if (["caldav_calendar", "apple_calendar"].includes(type)) {
            // special handlers
            setIsModalOpen(true);
            return;
          }

          mutation.mutate();
        },
        loading: mutation.isLoading || isLoading,
        disabled: isModalOpen,
      })}
      {type === "caldav_calendar" && (
        <AddCalDavIntegrationModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}

      {type === "apple_calendar" && (
        <AddAppleIntegrationModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      )}
    </>
  );
}

function DisconnectIntegration(props: {
  /**
   * Integration credential id
   */
  id: number;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
}) {
  const utils = trpc.useContext();
  const [modalOpen, setModalOpen] = useState(false);
  const mutation = useMutation(
    async () => {
      const res = await fetch("/api/integrations", {
        method: "DELETE",
        body: JSON.stringify({ id: props.id }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Something went wrong");
      }
    },
    {
      async onSettled() {
        await utils.invalidateQueries(["viewer.integrations"]);
      },
      onSuccess() {
        setModalOpen(false);
      },
    }
  );
  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title="Disconnect Integration"
          confirmBtnText="Yes, disconnect integration"
          cancelBtnText="Cancel"
          onConfirm={() => {
            mutation.mutate();
          }}>
          Are you sure you want to disconnect this integration?
        </ConfirmationDialogContent>
      </Dialog>
      {props.render({
        onClick() {
          setModalOpen(true);
        },
        disabled: modalOpen,
        loading: mutation.isLoading,
      })}
    </>
  );
}

function ConnectOrDisconnectIntegrationButton(props: {
  //
  credentialIds: number[];
  type: string;
  installed: boolean;
}) {
  const [credentialId] = props.credentialIds;
  if (credentialId) {
    return (
      <DisconnectIntegration
        id={credentialId}
        render={(btnProps) => (
          <Button {...btnProps} color="warn">
            Disconnect
          </Button>
        )}
      />
    );
  }
  if (!props.installed) {
    return (
      <div className="flex items-center truncate">
        <Alert severity="warning" title="Not installed" />
      </div>
    );
  }
  /** We don't need to "Connect", just show that it's installed */
  if (props.type === "daily_video") {
    return (
      <div className="px-3 py-2 truncate">
        <h3 className="text-sm font-medium text-gray-700">Installed</h3>
      </div>
    );
  }
  return (
    <ConnectIntegration
      type={props.type}
      render={(btnProps) => (
        <Button color="secondary" {...btnProps}>
          Connect
        </Button>
      )}
    />
  );
}

function IntegrationListItem(props: {
  imageSrc: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <ListItem expanded={!!props.children} className={classNames("flex-col")}>
      <div className={classNames("flex flex-1 space-x-2 w-full p-3 items-center")}>
        <Image width={40} height={40} src={`/${props.imageSrc}`} alt={props.title} />
        <div className="flex-grow pl-2 truncate">
          <ListItemTitle component="h3">{props.title}</ListItemTitle>
          <ListItemText component="p">{props.description}</ListItemText>
        </div>
        <div>{props.actions}</div>
      </div>
      {props.children && <div className="w-full border-t border-gray-200">{props.children}</div>}
    </ListItem>
  );
}

export function CalendarSwitch(props: {
  type: string;
  externalId: string;
  title: string;
  defaultSelected: boolean;
}) {
  const utils = trpc.useContext();

  const mutation = useMutation<
    unknown,
    unknown,
    {
      isOn: boolean;
    }
  >(
    async ({ isOn }) => {
      const body = {
        integration: props.type,
        externalId: props.externalId,
      };
      if (isOn) {
        const res = await fetch("/api/availability/calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      } else {
        const res = await fetch("/api/availability/calendar", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      }
    },
    {
      async onSettled() {
        await utils.invalidateQueries(["viewer.integrations"]);
      },
      onError() {
        showToast(`Something went wrong when toggling "${props.title}""`, "error");
      },
    }
  );
  return (
    <div className="py-1">
      <Switch
        key={props.externalId}
        name="enabled"
        label={props.title}
        defaultChecked={props.defaultSelected}
        onCheckedChange={(isOn: boolean) => {
          mutation.mutate({ isOn });
        }}
      />
    </div>
  );
}

export default function IntegrationsPage() {
  const query = trpc.useQuery(["viewer.integrations"]);

  return (
    <Shell heading="Integrations" subtitle="Connect your favourite apps.">
      <QueryCell
        query={query}
        success={({ data }) => {
          return (
            <>
              <ShellSubHeading
                title={
                  <SubHeadingTitleWithConnections
                    title="Conferencing"
                    numConnections={data.conferencing.numActive}
                  />
                }
              />
              <List>
                {data.conferencing.items.map((item) => (
                  <IntegrationListItem
                    key={item.title}
                    {...item}
                    actions={<ConnectOrDisconnectIntegrationButton {...item} />}
                  />
                ))}
              </List>

              <ShellSubHeading
                className="mt-10"
                title={
                  <SubHeadingTitleWithConnections title="Payment" numConnections={data.payment.numActive} />
                }
              />
              <List>
                {data.payment.items.map((item) => (
                  <IntegrationListItem
                    key={item.title}
                    {...item}
                    actions={<ConnectOrDisconnectIntegrationButton {...item} />}
                  />
                ))}
              </List>

              <ShellSubHeading
                className="mt-10"
                title={
                  <SubHeadingTitleWithConnections
                    title="Calendars"
                    numConnections={data.calendar.numActive}
                  />
                }
                subtitle={
                  <>
                    Configure how your links integrate with your calendars.
                    <br />
                    You can override these settings on a per event basis.
                  </>
                }
              />

              {data.connectedCalendars.length > 0 && (
                <>
                  <List>
                    {data.connectedCalendars.map((item) => (
                      <Fragment key={item.credentialId}>
                        {item.calendars ? (
                          <IntegrationListItem
                            {...item.integration}
                            description={item.primary.externalId}
                            actions={
                              <DisconnectIntegration
                                id={item.credentialId}
                                render={(btnProps) => (
                                  <Button {...btnProps} color="warn">
                                    Disconnect
                                  </Button>
                                )}
                              />
                            }>
                            <ul className="p-4 space-y-2">
                              {item.calendars.map((cal) => (
                                <CalendarSwitch
                                  key={cal.externalId}
                                  externalId={cal.externalId}
                                  title={cal.name}
                                  type={item.integration.type}
                                  defaultSelected={cal.isSelected}
                                />
                              ))}
                            </ul>
                          </IntegrationListItem>
                        ) : (
                          <Alert
                            severity="warning"
                            title="Something went wrong"
                            message={item.error.message}
                            actions={
                              <DisconnectIntegration
                                id={item.credentialId}
                                render={(btnProps) => (
                                  <Button {...btnProps} color="warn">
                                    Disconnect
                                  </Button>
                                )}
                              />
                            }
                          />
                        )}
                      </Fragment>
                    ))}
                  </List>
                  <ShellSubHeading
                    className="mt-6"
                    title={<SubHeadingTitleWithConnections title="Connect an additional calendar" />}
                  />
                </>
              )}
              <List>
                {data.calendar.items.map((item) => (
                  <IntegrationListItem
                    key={item.title}
                    {...item}
                    actions={
                      <ConnectIntegration
                        type={item.type}
                        render={(btnProps) => (
                          <Button color="secondary" {...btnProps}>
                            Connect
                          </Button>
                        )}
                      />
                    }
                  />
                ))}
              </List>
              <WebhookEmbed webhooks={data.webhooks} />
            </>
          );
        }}
      />
    </Shell>
  );
}
