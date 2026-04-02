import type { FormValues } from "@calcom/features/ee/workflows/lib/types";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";

type AgentData = RouterOutputs["viewer"]["aiVoiceAgent"]["get"];

interface AgentQuery {
  data: AgentData | undefined;
  isPending: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface UseAgentsDataReturn {
  outboundAgentQueries: AgentQuery[];
  inboundAgentQueries: AgentQuery[];
}

const emptyQuery: AgentQuery = { data: undefined, isPending: false, isLoading: false, error: null };

/**
 * Custom hook to fetch and manage agent data for workflow steps.
 *
 * @param form - React Hook Form instance for workflow form values
 * @returns Object containing outbound and inbound agent queries with proper typing
 */
export function useAgentsData(form: UseFormReturn<FormValues>): UseAgentsDataReturn {
  const watchedSteps = useWatch({
    control: form.control,
    name: "steps",
  });

  const allAgentIds = useMemo(() => {
    const outboundAgentIds = (watchedSteps || []).map((step) => step?.agentId || null);
    const inboundAgentIds = (watchedSteps || []).map((step) => step?.inboundAgentId || null);
    return { outboundAgentIds, inboundAgentIds };
  }, [watchedSteps]);

  const uniqueAgentIds = useMemo((): string[] => {
    const allIds = [...allAgentIds.outboundAgentIds, ...allAgentIds.inboundAgentIds];
    const validIds: string[] = [];

    for (const id of allIds) {
      if (id && typeof id === "string") {
        validIds.push(id);
      }
    }

    return Array.from(new Set(validIds));
  }, [allAgentIds]);

  const uniqueAgentQueries = trpc.useQueries((t) =>
    uniqueAgentIds.map((agentId) => {
      return t.viewer.aiVoiceAgent.get(
        { id: agentId },
        {
          enabled: true,
          staleTime: 5 * 60 * 1000,
        }
      );
    })
  );

  const agentDataMap = useMemo(() => {
    const map = new Map<string, AgentQuery>();
    uniqueAgentIds.forEach((agentId, index) => {
      const query = uniqueAgentQueries[index];
      if (query) {
        map.set(agentId, {
          data: query.data,
          isPending: query.isPending,
          isLoading: query.isLoading,
          error: query.error,
        });
      }
    });
    return map;
  }, [uniqueAgentIds, uniqueAgentQueries]);

  const outboundAgentQueries = useMemo((): AgentQuery[] => {
    return allAgentIds.outboundAgentIds.map((agentId) => {
      if (!agentId) {
        return emptyQuery;
      }
      return agentDataMap.get(agentId) || emptyQuery;
    });
  }, [allAgentIds.outboundAgentIds, agentDataMap]);

  const inboundAgentQueries = useMemo((): AgentQuery[] => {
    return allAgentIds.inboundAgentIds.map((agentId) => {
      if (!agentId) {
        return emptyQuery;
      }
      return agentDataMap.get(agentId) || emptyQuery;
    });
  }, [allAgentIds.inboundAgentIds, agentDataMap]);

  return {
    outboundAgentQueries,
    inboundAgentQueries,
  };
}
