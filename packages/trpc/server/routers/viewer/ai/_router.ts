import { z } from "zod";

import { createDefaultAIPhoneServiceProvider } from "@calcom/features/ee/cal-ai-phone";
import type { RetellLLMGeneralTools } from "@calcom/features/ee/cal-ai-phone/providers/retell-ai/types";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

const canManageTeamResources = async (userId: number, teamId: number) => {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
    },
  });

  if (!membership) {
    return false;
  }

  return membership.role === MembershipRole.ADMIN || membership.role === MembershipRole.OWNER;
};

export const aiRouter = router({
  test: authedProcedure.query(async ({ ctx }) => {
    return {
      message: "test",
    };
  }),
  list: authedProcedure
    .input(
      z
        .object({
          teamId: z.number().optional(),
          scope: z.enum(["personal", "team", "all"]).optional().default("all"),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        OR: [
          { userId: ctx.user.id },
          {
            team: {
              members: {
                some: {
                  userId: ctx.user.id,
                  accepted: true,
                },
              },
            },
          },
        ],
      };

      if (input?.scope === "personal") {
        whereClause.OR = [{ userId: ctx.user.id }];
      } else if (input?.scope === "team") {
        whereClause.OR = [
          {
            team: {
              members: {
                some: {
                  userId: ctx.user.id,
                  accepted: true,
                },
              },
            },
          },
        ];
      }

      if (input?.teamId) {
        whereClause.teamId = input.teamId;
      }

      const agents = await prisma.agent.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          outboundPhoneNumbers: {
            select: {
              phoneNumber: true,
            },
          },
        },
        orderBy: [{ teamId: "asc" }, { createdAt: "desc" }],
      });

      const formattedAgents = agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        retellAgentId: agent.retellAgentId,
        enabled: agent.enabled,
        userId: agent.userId,
        teamId: agent.teamId,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        outboundPhoneNumbers: agent.outboundPhoneNumbers,
        team: agent.team,
        user: agent.user,
      }));

      console.log("formattedAgents", formattedAgents);

      return {
        totalCount: formattedAgents.length,
        filtered: formattedAgents,
      };
    }),

  get: authedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    console.log("get agent", input.id);
    const agent = await prisma.agent.findFirst({
      where: {
        id: input.id,
        OR: [
          { userId: ctx.user.id },
          {
            team: {
              members: {
                some: {
                  userId: ctx.user.id,
                  accepted: true,
                },
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        outboundPhoneNumbers: {
          select: {
            phoneNumber: true,
          },
        },
      },
    });

    if (!agent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not found or you don't have permission to view it.",
      });
    }

    const aiService = createDefaultAIPhoneServiceProvider();

    const retellAgent = await aiService.getAgent(agent.retellAgentId);

    if (!retellAgent.response_engine?.llm_id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent does not have an LLM configured.",
      });
    }

    const llmDetails = await aiService.getLLMDetails(retellAgent.response_engine.llm_id);

    return {
      id: agent.id,
      name: agent.name,
      retellAgentId: agent.retellAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      outboundPhoneNumbers: agent.outboundPhoneNumbers,
      retellData: {
        agentId: retellAgent.agent_id,
        agentName: retellAgent.agent_name,
        voiceId: retellAgent.voice_id,
        responseEngine: retellAgent.response_engine,
        language: retellAgent.language,
        responsiveness: retellAgent.responsiveness,
        interruptionSensitivity: retellAgent.interruption_sensitivity,
        generalPrompt: llmDetails.general_prompt,
        beginMessage: llmDetails.begin_message,
        generalTools: llmDetails.general_tools,
        llmId: llmDetails.llm_id,
      },
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }),

  create: authedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        teamId: z.number().optional(),
        workflowStepId: z.number().optional(),
        // Retell configuration
        generalPrompt: z.string().optional(),
        beginMessage: z.string().optional(),
        generalTools: z
          .array(
            z.object({
              type: z.string(),
              name: z.string(),
              description: z.string().optional(),
              cal_api_key: z.string().optional(),
              event_type_id: z.number().optional(),
              timezone: z.string().optional(),
            })
          )
          .optional(),
        voiceId: z.string().optional().default("11labs-Adrian"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, name, workflowStepId, ...retellConfig } = input;

      const agentName =
        name || `${ctx.user.name}'s Agent - ${ctx.user.id} ${Math.random().toString(36).substring(2, 15)}`;

      if (teamId) {
        const canManage = await canManageTeamResources(ctx.user.id, teamId);
        if (!canManage) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create agents for this team.",
          });
        }
      }

      const aiService = createDefaultAIPhoneServiceProvider();

      // First create LLM if prompt/message provided
      const llmConfig = await aiService.setupConfiguration({
        calApiKey: undefined,
        timeZone: ctx.user.timeZone,
        eventTypeId: undefined, // Not linked to event type at the start
        generalPrompt: retellConfig.generalPrompt,
        beginMessage: retellConfig.beginMessage,
        generalTools: retellConfig.generalTools as RetellLLMGeneralTools,
      });

      // Create agent in database
      const agent = await prisma.agent.create({
        data: {
          name: agentName,
          retellAgentId: llmConfig.agentId,
          userId: teamId ? undefined : ctx.user.id,
          teamId: teamId || undefined,
        },
      });

      // If workflowStepId is provided, update the workflow step to link it with the agent
      if (workflowStepId) {
        await prisma.workflowStep.update({
          where: { id: workflowStepId },
          data: { agentId: agent.id },
        });
      }

      return {
        id: agent.id,
        retellAgentId: agent.retellAgentId,
        message: "Agent created successfully",
      };
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
        // Retell updates
        generalPrompt: z.string().nullish().default(null),
        beginMessage: z.string().nullish().default(null),
        generalTools: z
          .array(
            z.object({
              type: z.string(),
              name: z.string(),
              description: z.string().nullish().default(null),
              cal_api_key: z.string().nullish().default(null),
              event_type_id: z.number().nullish().default(null),
              timezone: z.string().nullish().default(null),
            })
          )
          .optional(),
        voiceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, enabled, ...retellUpdates } = input;

      // Get agent and verify permissions
      const agent = await prisma.agent.findFirst({
        where: {
          id,
          OR: [
            { userId: ctx.user.id },
            {
              team: {
                members: {
                  some: {
                    userId: ctx.user.id,
                    accepted: true,
                    role: {
                      in: [MembershipRole.ADMIN, MembershipRole.OWNER],
                    },
                  },
                },
              },
            },
          ],
        },
      });

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found or you don't have permission to update it.",
        });
      }

      // Update Retell if any Retell fields are provided
      if (Object.keys(retellUpdates).length > 0) {
        const aiService = createDefaultAIPhoneServiceProvider();

        // Get current agent from Retell to find LLM ID
        const retellAgent = await aiService.getAgent(agent.retellAgentId);

        if (
          retellAgent.response_engine?.llm_id &&
          (retellUpdates.generalPrompt || retellUpdates.beginMessage)
        ) {
          await aiService.updateLLMConfiguration(retellAgent.response_engine.llm_id, {
            general_prompt: retellUpdates.generalPrompt,
            begin_message: retellUpdates.beginMessage,
            general_tools: retellUpdates.generalTools as RetellLLMGeneralTools,
          });
        }

        // Update other agent properties if needed
        if (retellUpdates.voiceId) {
          await aiService.updateAgent(agent.retellAgentId, {
            voice_id: retellUpdates.voiceId,
          });
        }
      }

      return { message: "Agent updated successfully" };
    }),

  delete: authedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // Get agent and verify permissions
    const agent = await prisma.agent.findFirst({
      where: {
        id: input.id,
        OR: [
          { userId: ctx.user.id },
          {
            team: {
              members: {
                some: {
                  userId: ctx.user.id,
                  accepted: true,
                  role: {
                    in: [MembershipRole.ADMIN, MembershipRole.OWNER],
                  },
                },
              },
            },
          },
        ],
      },
    });

    if (!agent) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent not found or you don't have permission to delete it.",
      });
    }

    // Delete from Retell
    const aiService = createDefaultAIPhoneServiceProvider();

    try {
      // Get agent details to find LLM
      const retellAgent = await aiService.getAgent(agent.retellAgentId);

      // Delete agent and LLM from Retell
      await aiService.deleteConfiguration({
        agentId: agent.retellAgentId,
        llmId: retellAgent.response_engine?.llm_id,
      });
    } catch (error) {
      console.error("Failed to delete from Retell:", error);
      // Continue with local deletion even if Retell fails
    }

    // Delete from database
    await prisma.agent.delete({
      where: { id: input.id },
    });

    return { message: "Agent deleted successfully" };
  }),

  testCall: authedProcedure
    .input(
      z.object({
        agentId: z.string(),
        phoneNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get agent and verify permissions
      const agent = await prisma.agent.findFirst({
        where: {
          id: input.agentId,
          OR: [
            { userId: ctx.user.id },
            {
              team: {
                members: {
                  some: {
                    userId: ctx.user.id,
                    accepted: true,
                  },
                },
              },
            },
          ],
        },
        include: {
          outboundPhoneNumbers: {
            select: {
              phoneNumber: true,
            },
          },
        },
      });

      console.log("agent", agent);

      // return { message: "test" };

      const agentPhoneNumber = agent.outboundPhoneNumbers?.[0]?.phoneNumber;

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found or you don't have permission to use it.",
        });
      }

      const toNumber = input.phoneNumber;
      if (!toNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No phone number provided for test call.",
        });
      }

      if (!agentPhoneNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent must have a phone number assigned to make calls.",
        });
      }

      console.log("agentPhoneNumber", {
        from_number: agentPhoneNumber,
        to_number: toNumber,
      });

      const aiService = createDefaultAIPhoneServiceProvider();
      const call = await aiService.createPhoneCall({
        from_number: agentPhoneNumber,
        to_number: toNumber,
      });

      return {
        callId: call.call_id,
        status: call.call_status,
        message: `Call initiated to ${toNumber} with call_id ${call.call_id}`,
      };
    }),
});
