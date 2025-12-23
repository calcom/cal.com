import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { useState } from "react";

import MakeSetup from "./Setup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock tRPC client
const mockTrpc = createTRPCReact<any>();

const mockTrpcClient = mockTrpc.createClient({
  links: [
    () =>
      ({ op, next }) => {
        // Mock responses based on the operation path
        if (op.path === "viewer.apps.integrations") {
          return {
            subscribe: (observer: any) => {
              observer.next({
                result: {
                  data: {
                    items: [
                      {
                        type: "make_automation",
                        userCredentialIds: [1],
                      },
                    ],
                  },
                },
              });
              observer.complete();
              return {
                unsubscribe: () => {},
              };
            },
          } as any;
        }
        if (op.path === "viewer.apiKeys.findKeyOfType") {
          return {
            subscribe: (observer: any) => {
              observer.next({
                result: {
                  data: [],
                },
              });
              observer.complete();
              return {
                unsubscribe: () => {},
              };
            },
          } as any;
        }
        if (op.path === "viewer.teams.listOwnedTeams") {
          return {
            subscribe: (observer: any) => {
              observer.next({
                result: {
                  data: op.context?.withTeams
                    ? [
                        { id: 1, name: "Engineering Team" },
                        { id: 2, name: "Marketing Team" },
                      ]
                    : [],
                },
              });
              observer.complete();
              return {
                unsubscribe: () => {},
              };
            },
          } as any;
        }
        return next(op);
      },
  ] as any,
});

const meta: Meta<typeof MakeSetup> = {
  title: "Components/Apps/Make/Setup",
  component: MakeSetup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story, context) => {
      const [trpcClient] = useState(() =>
        mockTrpc.createClient({
          links: [
            () =>
              ({ op, next }) => {
                // Mock responses based on the operation path and story context
                if (op.path === "viewer.apps.integrations") {
                  return {
                    subscribe: (observer: any) => {
                      if (context.args.isNotInstalled) {
                        observer.next({
                          result: {
                            data: {
                              items: [],
                            },
                          },
                        });
                      } else {
                        observer.next({
                          result: {
                            data: {
                              items: [
                                {
                                  type: "make_automation",
                                  userCredentialIds: [1],
                                },
                              ],
                            },
                          },
                        });
                      }
                      observer.complete();
                      return {
                        unsubscribe: () => {},
                      };
                    },
                  } as any;
                }
                if (op.path === "viewer.apiKeys.findKeyOfType") {
                  return {
                    subscribe: (observer: any) => {
                      observer.next({
                        result: {
                          data: [],
                        },
                      });
                      observer.complete();
                      return {
                        unsubscribe: () => {},
                      };
                    },
                  } as any;
                }
                if (op.path === "viewer.teams.listOwnedTeams") {
                  return {
                    subscribe: (observer: any) => {
                      observer.next({
                        result: {
                          data: context.args.withTeams
                            ? [
                                { id: 1, name: "Engineering Team" },
                                { id: 2, name: "Marketing Team" },
                              ]
                            : [],
                        },
                      });
                      observer.complete();
                      return {
                        unsubscribe: () => {},
                      };
                    },
                  } as any;
                }
                if (op.path === "viewer.apiKeys.create") {
                  return {
                    subscribe: (observer: any) => {
                      observer.next({
                        result: {
                          data: "cal_test_" + Math.random().toString(36).substring(2, 15),
                        },
                      });
                      observer.complete();
                      return {
                        unsubscribe: () => {},
                      };
                    },
                  } as any;
                }
                if (op.path === "viewer.apiKeys.delete") {
                  return {
                    subscribe: (observer: any) => {
                      observer.next({
                        result: {
                          data: { success: true },
                        },
                      });
                      observer.complete();
                      return {
                        unsubscribe: () => {},
                      };
                    },
                  } as any;
                }
                return next(op);
              },
          ] as any,
        })
      );

      return (
        <mockTrpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <Story />
          </QueryClientProvider>
        </mockTrpc.Provider>
      );
    },
  ],
  argTypes: {
    inviteLink: {
      control: "text",
      description: "The Make invite link URL",
    },
    withTeams: {
      control: "boolean",
      description: "Show setup with team API keys",
    },
    isNotInstalled: {
      control: "boolean",
      description: "Show app not installed state",
    },
  },
};

export default meta;
type Story = StoryObj<typeof MakeSetup>;

export const Default: Story = {
  args: {
    inviteLink: "https://www.make.com/en/integrations/cal-com",
    withTeams: false,
    isNotInstalled: false,
  },
};

export const WithTeams: Story = {
  args: {
    inviteLink: "https://www.make.com/en/integrations/cal-com",
    withTeams: true,
    isNotInstalled: false,
  },
};

export const NotInstalled: Story = {
  args: {
    inviteLink: "https://www.make.com/en/integrations/cal-com",
    withTeams: false,
    isNotInstalled: true,
  },
};

export const CustomInviteLink: Story = {
  args: {
    inviteLink: "https://custom-make-invite-link.example.com",
    withTeams: false,
    isNotInstalled: false,
  },
};
