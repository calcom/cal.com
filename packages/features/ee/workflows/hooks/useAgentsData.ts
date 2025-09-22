import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { trpc } from "@calcom/trpc/react";

import type { FormValues } from "../pages/workflow";

interface AgentQuery {
  data: any;
  isPending: boolean;
  isLoading: boolean;
  error: any;
}

export function useAgentsData(form: UseFormReturn<FormValues>) {
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

  const outboundAgentQueries = useMemo(() => {
    return allAgentIds.outboundAgentIds.map((agentId) => {
      if (!agentId) {
        return { data: null, isPending: false, isLoading: false, error: null };
      }
      return agentDataMap.get(agentId) || { data: null, isPending: false, isLoading: false, error: null };
    });
  }, [allAgentIds.outboundAgentIds, agentDataMap]);

  const inboundAgentQueries = useMemo(() => {
    return allAgentIds.inboundAgentIds.map((agentId) => {
      if (!agentId) {
        return { data: null, isPending: false, isLoading: false, error: null };
      }
      return agentDataMap.get(agentId) || { data: null, isPending: false, isLoading: false, error: null };
    });
  }, [allAgentIds.inboundAgentIds, agentDataMap]);

  return {
    outboundAgentQueries,
    inboundAgentQueries,
  };
}