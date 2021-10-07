import Image from "next/image";
import { ReactNode, useState } from "react";
import { useMutation } from "react-query";

import { QueryCell } from "@lib/QueryCell";
import classNames from "@lib/classNames";
import { AddCalDavIntegrationModal } from "@lib/integrations/CalDav/components/AddCalDavIntegration";
import { trpc } from "@lib/trpc";

import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import Shell, { ShellSubHeading } from "@components/Shell";
import Badge from "@components/ui/Badge";
import Button, { ButtonProps } from "@components/ui/Button";

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
  render: (renderProps: ButtonProps) => JSX.Element;
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
  return (
    <>
      {props.render({
        onClick() {
          if (type === "caldav_calendar") {
            setIsModalOpen(true);
            return;
          }

          if (type === "apple_calendar") {
            // setAddAppleError(null);
            // setIsAddAppleIntegrationDialogOpen(true);
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

function IntegrationListItem(props: {
  imageSrc: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <ListItem className={classNames("flex-col", props.children && "my-2")}>
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
      {props.children && <div className="w-full border-t border-gray-200 ">{props.children}</div>}
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
                    actions={<>{item.credential ? <Button>TODO</Button> : <Button>Connect</Button>}</>}
                  />
                ))}
              </List>
              <pre className="text-xs">{JSON.stringify(data.conferencing, null, 4)}</pre>

              <ShellSubHeading
                className="mt-6"
                title={
                  <SubHeadingTitleWithConnections title="Payment" numConnections={data.payment.numActive} />
                }
              />
              <List>
                {data.payment.items.map((item) => (
                  <ListItem key={item.title} className="p-4 space-x-4">
                    <div className="flex-shrink-0">
                      <img className="h-10 w-10 mr-2" src={`/${item.imageSrc}`} alt={item.title} />
                    </div>
                    <div className="flex-grow">
                      <ListItemTitle component="h3">{item.title}</ListItemTitle>
                      <ListItemText component="p">{item.description}</ListItemText>
                    </div>
                    <div>{item.credential ? <Button>TODO</Button> : <Button>Connect</Button>}</div>
                  </ListItem>
                ))}
              </List>
              <pre className="text-xs">{JSON.stringify(data.payment, null, 4)}</pre>
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
                      actions={
                        <ConnectIntegration
                          type={item.type}
                          render={(btnProps) => <Button {...btnProps}>Connect</Button>}
                        />
                      }
                    />
                  )
                )}
              </List>
              <pre className="text-xs">{JSON.stringify(data.calendar, null, 4)}</pre>
            </>
          );
        }}
      />
    </Shell>
  );
}
