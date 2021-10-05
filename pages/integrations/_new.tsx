import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell, { ShellContent, ShellHeading } from "@components/Shell";
import Badge from "@components/ui/Badge";

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
          return (
            <>
              {calendarsHeading}

              <pre>{JSON.stringify(data, null, 4)}</pre>
            </>
          );
        }}
        loading={() => (
          <>
            <Loader />
            {calendarsHeading}
            <Loader />
          </>
        )}
      />
      <ShellContent>hello</ShellContent>
    </Shell>
  );
}
