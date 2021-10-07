import { Maybe } from "@trpc/server";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { useMutation } from "react-query";

import { QueryCell } from "@lib/QueryCell";
import classNames from "@lib/classNames";
import { AddAppleIntegrationModal } from "@lib/integrations/Apple/components/AddAppleIntegration";
import { AddCalDavIntegrationModal } from "@lib/integrations/CalDav/components/AddCalDavIntegration";
import { trpc } from "@lib/trpc";

import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import Shell, { ShellSubHeading } from "@components/Shell";
import Badge from "@components/ui/Badge";
import Button, { ButtonBaseProps } from "@components/ui/Button";

function pluralize(opts: { num: number; plural: string; singular: string }) {
  if (opts.num === 0) {
    return opts.singular;
  }
  return opts.singular;
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

function ConnectIntegration(props: {
  /**
   * @example apple_calendar
   */
  type: string;
  render: (renderProps: ButtonBaseProps) => JSX.Element;
}) {
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  // refetch intergrations when modal closes
  const utils = trpc.useContext();
  useEffect(() => {
    utils.invalidateQuery(["viewer.integrations"]);
  }, [isModalOpen, utils]);

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
  render: (renderProps: {
    //
    onClick: () => void;
    loading: boolean;
  }) => JSX.Element;
}) {
  const utils = trpc.useContext();
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
        await utils.invalidateQuery(["viewer.integrations"]);
      },
    }
  );
  return props.render({
    onClick() {
      mutation.mutate();
    },
    loading: mutation.isLoading,
  });
}

function ConnectOrDisconnectIntegrationButton(props: {
  //
  credential: Maybe<{ id: number }>;
  type: string;
}) {
  if (props.credential) {
    <DisconnectIntegration
      id={props.credential.id}
      render={(btnProps) => <Button {...btnProps}>Connect</Button>}
    />;
  }
  return (
    <ConnectIntegration type={props.type} render={(btnProps) => <Button {...btnProps}>Connect</Button>} />
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
      <div className={classNames("flex flex-1 space-x-2 w-full p-4")}>
        <div>
          <Image width={40} height={40} src={`/${props.imageSrc}`} alt={props.title} />
        </div>
        <div className="flex-grow">
          <ListItemTitle component="h3">{props.title}</ListItemTitle>
          <ListItemText component="p">{props.description}</ListItemText>
        </div>
        <div>{props.actions}</div>
      </div>
      {props.children && <div className="w-full border-t border-gray-200">{props.children}</div>}
    </ListItem>
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
                className="mt-6"
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
                className="mt-6"
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

              <List>
                {data.calendar.items.map((item) =>
                  item.credential ? (
                    <IntegrationListItem
                      key={item.title}
                      {...item}
                      actions={
                        <DisconnectIntegration
                          id={item.credential.id}
                          render={(btnProps) => <Button {...btnProps}>Disconnect</Button>}
                        />
                      }>
                      hello
                    </IntegrationListItem>
                  ) : (
                    <IntegrationListItem
                      key={item.title}
                      {...item}
                      actions={<ConnectOrDisconnectIntegrationButton {...item} />}
                    />
                  )
                )}
              </List>
            </>
          );
        }}
      />
    </Shell>
  );
}
