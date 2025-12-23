import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";

import PayPalSetup from "./Setup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock tRPC client
const mockTrpc = createTRPCReact<any>();

const meta: Meta<typeof PayPalSetup> = {
  title: "Components/Apps/PayPal/Setup",
  component: PayPalSetup,
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
                      if (context.args.isLoading) {
                        // Don't complete the observer to simulate loading state
                        return {
                          unsubscribe: () => {},
                        };
                      }

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
                                  type: "paypal_payment",
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

                if (op.path === "viewer.apps.updateAppCredentials") {
                  return {
                    subscribe: (observer: any) => {
                      if (context.args.saveError) {
                        observer.error(new Error("Failed to save credentials"));
                      } else {
                        observer.next({
                          result: {
                            data: { success: true },
                          },
                        });
                        observer.complete();
                      }
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
            <div className="min-h-screen">
              <Story />
            </div>
          </QueryClientProvider>
        </mockTrpc.Provider>
      );
    },
  ],
  argTypes: {
    isNotInstalled: {
      control: "boolean",
      description: "Show app not installed state",
    },
    isLoading: {
      control: "boolean",
      description: "Show loading state",
    },
    saveError: {
      control: "boolean",
      description: "Simulate save error",
    },
  },
};

export default meta;
type Story = StoryObj<typeof PayPalSetup>;

export const Default: Story = {
  args: {
    isNotInstalled: false,
    isLoading: false,
    saveError: false,
  },
};

export const Loading: Story = {
  args: {
    isNotInstalled: false,
    isLoading: true,
    saveError: false,
  },
};

export const NotInstalled: Story = {
  args: {
    isNotInstalled: true,
    isLoading: false,
    saveError: false,
  },
};

export const WithSaveError: Story = {
  args: {
    isNotInstalled: false,
    isLoading: false,
    saveError: true,
  },
};
