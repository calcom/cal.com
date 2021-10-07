import { ReactNode } from "react";

import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import Shell, { ShellSubHeading } from "@components/Shell";
import Badge from "@components/ui/Badge";
import Button from "@components/ui/Button";

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
                    numConnections={data.conferencing.length}
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
                {data.conferencing.map((item) => (
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
              <pre className="text-xs">{JSON.stringify(data.conferencing, null, 4)}</pre>

              <ShellSubHeading
                className="mt-6"
                title={
                  <SubHeadingTitleWithConnections title="Payment" numConnections={data.payment.length} />
                }
              />
              <List>
                {data.payment.map((item) => (
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
                  <SubHeadingTitleWithConnections title="Calendars" numConnections={data.calendar.length} />
                }
                subtitle={
                  <>
                    Configure how your links integrate with your calendars.
                    <br />
                    You can override these settings on a per event basis.
                  </>
                }
              />
              <pre className="text-xs">{JSON.stringify(data.calendar, null, 4)}</pre>
            </>
          );
        }}
      />
    </Shell>
  );
}
