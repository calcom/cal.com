import { QueryCell } from "@lib/QueryCell";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell, { ShellContent, ShellHeading } from "@components/Shell";

export default function IntegrationsPage() {
  const query = trpc.useQuery(["viewer.integrations"]);
  const calendarsHeading = (
    <ShellHeading
      heading="Calendars"
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
    <Shell heading="Conferencing" subtitle="Connect your favourite video call app." skipWrapper>
      <QueryCell
        query={query}
        success={({ data }) => {
          return (
            <>
              <pre>{JSON.stringify(data, null, 4)}</pre>
              {calendarsHeading}
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
