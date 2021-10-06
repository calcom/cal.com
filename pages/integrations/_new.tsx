import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import Loader from "@components/Loader";
import Shell, { ShellContent, ShellHeading } from "@components/Shell";
import Badge from "@components/ui/Badge";
import Button from "@components/ui/Button";

export default function IntegrationsPage() {
  const query = trpc.useQuery(["viewer.integrations"]);

  const numCalConnections = query.data?.integrations.reduce(
    (sum, integration) =>
      sum +
      (integration.credential && integration.type.endsWith("_calendar") && integration.installed ? 1 : 0),
    0
  );
  const numVideoConnections = query.data?.integrations.reduce(
    (sum, integration) =>
      sum + (integration.credential && integration.type.endsWith("_video") && integration.installed ? 1 : 0),
    0
  );
  const calendarsHeading = (
    <ShellHeading
      className="mt-8"
      heading={
        <div className="flex items-center content-center space-x-2">
          <span>Calendars</span>
          {numCalConnections ? (
            <Badge variant="success" className="text-xs font-normal">
              {numCalConnections} connections
            </Badge>
          ) : null}
        </div>
      }
      subtitle={
        <>
          Configure how your links integrate with your calendars.
          <br />
          You can override these settings on a per event basis.
        </>
      }
    />
  );
  return (
    <Shell
      heading={
        <div className="flex items-center content-center space-x-2">
          <span>Conferencing</span>
          {numVideoConnections ? (
            <Badge variant="success" className="text-xs font-normal">
              {numVideoConnections} connections
            </Badge>
          ) : null}
        </div>
      }
      subtitle="Connect your favourite video call app."
      skipWrapper>
      <QueryCell
        query={query}
        success={({ data }) => {
          const conferencing = data.integrations.filter((item) => item.variant === "conferencing");
          const calendars = data.integrations.filter((item) => item.variant === "calendar");
          return (
            <>
              {/* conferencing */}
              <ShellContent>
                <List>
                  {conferencing.map((item) => (
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
              </ShellContent>
              {/* calendars */}
              {calendarsHeading}
              <ShellContent>
                <pre>{JSON.stringify({ videos: conferencing, calendars }, null, 4)}</pre>
              </ShellContent>
            </>
          );
        }}
        loading={() => (
          <ShellContent>
            <Loader />
            {calendarsHeading}
            <Loader />
          </ShellContent>
        )}
      />
    </Shell>
  );
}
