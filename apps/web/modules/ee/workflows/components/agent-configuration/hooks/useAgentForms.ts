import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { cleanPromptForDisplay } from "@calcom/features/calAIPhone/providers/retellAI/utils/promptUtils";
import type { RouterOutputs } from "@calcom/trpc/react";

import type { AgentFormValues } from "../types/schemas";
import { agentSchema } from "../types/schemas";

interface UseAgentFormsProps {
  agentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
  inboundAgentData?: RouterOutputs["viewer"]["aiVoiceAgent"]["get"];
}

export function useAgentForms({ agentData, inboundAgentData }: UseAgentFormsProps) {
  const outboundAgentForm = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      generalPrompt: "",
      beginMessage: "",
      numberToCall: "",
      language: "en-US",
      voiceId: "",
      generalTools: [],
    },
  });

  const inboundAgentForm = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      generalPrompt: "",
      beginMessage: "",
      numberToCall: "",
      language: "en-US",
      voiceId: "",
      generalTools: [],
    },
  });

  useEffect(() => {
    if (agentData?.retellData) {
      const retellData = agentData.retellData;
      outboundAgentForm.reset({
        generalPrompt: cleanPromptForDisplay(retellData.generalPrompt || ""),
        beginMessage: retellData.beginMessage || "",
        numberToCall: "",
        language: retellData.language || "en-US",
        voiceId: retellData.voiceId || "",
        generalTools: retellData.generalTools || [],
        outboundEventTypeId: agentData.outboundEventTypeId || undefined,
      });
    }
  }, [agentData, outboundAgentForm]);

  useEffect(() => {
    if (inboundAgentData?.retellData) {
      const retellData = inboundAgentData.retellData;

      inboundAgentForm.reset({
        generalPrompt: cleanPromptForDisplay(retellData.generalPrompt || ""),
        beginMessage: retellData.beginMessage || "",
        numberToCall: "",
        language: retellData.language || "en-US",
        voiceId: retellData.voiceId || "",
        generalTools: retellData.generalTools || [],
      });
    }
  }, [inboundAgentData, inboundAgentForm]);

  return {
    outboundAgentForm,
    inboundAgentForm,
  };
}
