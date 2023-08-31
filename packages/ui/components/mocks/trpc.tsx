import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

import { httpBatchLink } from "@calcom/trpc";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";

import { createTRPCReact } from "@trpc/react-query";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockedTrpc: any = createTRPCReact<AppRouter>();
export const StorybookTrpcProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } }));

  const [trpcClient] = useState(() =>
    mockedTrpc.createClient({
      links: [httpBatchLink({ url: "" })],
    })
  );

  return (
    <mockedTrpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </mockedTrpc.Provider>
  );
};
