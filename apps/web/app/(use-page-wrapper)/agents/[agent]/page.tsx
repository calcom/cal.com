import type { PageProps } from "app/_types";
import { z } from "zod";

import AgentPage from "@calcom/features/ee/cal-ai-phone/pages/agent";

const querySchema = z.object({
  agent: z.string(),
});

const Page = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) throw new Error("Invalid agent id");

  return <AgentPage agentId={parsed.data.agent} />;
};

export default Page;
