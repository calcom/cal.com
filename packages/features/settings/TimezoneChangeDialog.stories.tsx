import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { DialogContent, DialogFooter, DialogHeader, DialogClose } from "@calcom/ui/components/dialog";
import { Button } from "@calcom/ui/components/button";

// Mock the useLocale hook
jest.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        update_timezone_question: "Update timezone?",
        update_timezone_description: `Your current timezone is ${options?.formattedCurrentTz || "America/New_York"}. Do you want to update your timezone?`,
        dont_update: "Don't update",
        update_timezone: "Update timezone",
        we_wont_show_again: "We won't show this again",
        updated_timezone_to: `Timezone updated to ${options?.formattedCurrentTz || "America/New_York"}`,
        couldnt_update_timezone: "Couldn't update timezone",
      };
      return translations[key] || key;
    },
    isLocaleReady: true,
    i18n: {
      language: "en",
    },
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock tRPC client
const mockTrpc = createTRPCReact<any>();

const createMockTrpcClient = (overrides?: any) => {
  return mockTrpc.createClient({
    links: [
      () =>
        ({ op }) => {
          return {
            subscribe: (observer: any) => {
              if (op.path === "viewer.me.get") {
                observer.next({
                  result: {
                    data: {
                      timeZone: "America/Los_Angeles",
                      id: 1,
                      name: "Test User",
                      email: "test@example.com",
                      ...overrides?.user,
                    },
                  },
                });
              } else if (op.path === "viewer.me.updateProfile") {
                observer.next({
                  result: {
                    data: {
                      success: true,
                    },
                  },
                });
              } else {
                observer.next({
                  result: {
                    data: {},
                  },
                });
              }
              observer.complete();
              return {
                unsubscribe: () => {},
              };
            },
          } as any;
        },
    ],
  });
};

const mockSession = {
  user: {
    id: 1,
    name: "Test User",
    email: "test@example.com",
  },
  expires: "2099-12-31",
};

// Internal component for rendering the dialog content
const TimezoneChangeDialogContent = () => {
  const t = (key: string, options?: any) => {
    const translations: Record<string, string> = {
      update_timezone_question: "Update timezone?",
      update_timezone_description: `Your current timezone is ${options?.formattedCurrentTz || "America/New_York"}. Do you want to update your timezone?`,
      dont_update: "Don't update",
      update_timezone: "Update timezone",
      we_wont_show_again: "We won't show this again",
    };
    return translations[key] || key;
  };

  const formattedCurrentTz = "America/New_York";

  return (
    <>
      <DialogHeader
        title={t("update_timezone_question")}
        subtitle={t("update_timezone_description", {
          formattedCurrentTz,
          interpolation: { escapeValue: false },
        })}
      />
      <div className="mb-8" />
      <DialogFooter showDivider>
        <DialogClose onClick={() => {}} color="secondary">
          {t("dont_update")}
        </DialogClose>
        <DialogClose onClick={() => {}} color="primary">
          {t("update_timezone")}
        </DialogClose>
      </DialogFooter>
    </>
  );
};

const meta = {
  component: TimezoneChangeDialogContent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const mockTrpcClient = createMockTrpcClient();
      return (
        <SessionProvider session={mockSession}>
          <mockTrpc.Provider client={mockTrpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <Story />
            </QueryClientProvider>
          </mockTrpc.Provider>
        </SessionProvider>
      );
    },
  ],
} satisfies Meta<typeof TimezoneChangeDialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Timezone Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent type="creation">
            <TimezoneChangeDialogContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};

export const Closed: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Timezone Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent type="creation">
            <TimezoneChangeDialogContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};

export const WithDifferentTimezone: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    const CustomDialogContent = () => {
      const t = (key: string, options?: any) => {
        const translations: Record<string, string> = {
          update_timezone_question: "Update timezone?",
          update_timezone_description: `Your current timezone is ${options?.formattedCurrentTz || "Europe/London"}. Do you want to update your timezone?`,
          dont_update: "Don't update",
          update_timezone: "Update timezone",
        };
        return translations[key] || key;
      };

      const formattedCurrentTz = "Europe/London";

      return (
        <>
          <DialogHeader
            title={t("update_timezone_question")}
            subtitle={t("update_timezone_description", {
              formattedCurrentTz,
              interpolation: { escapeValue: false },
            })}
          />
          <div className="mb-8" />
          <DialogFooter showDivider>
            <DialogClose onClick={() => {}} color="secondary">
              {t("dont_update")}
            </DialogClose>
            <DialogClose onClick={() => {}} color="primary">
              {t("update_timezone")}
            </DialogClose>
          </DialogFooter>
        </>
      );
    };

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Timezone Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent type="creation">
            <CustomDialogContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};

export const WithAsianTimezone: Story = {
  render: () => {
    const [open, setOpen] = useState(true);

    const CustomDialogContent = () => {
      const t = (key: string, options?: any) => {
        const translations: Record<string, string> = {
          update_timezone_question: "Update timezone?",
          update_timezone_description: `Your current timezone is ${options?.formattedCurrentTz || "Asia/Tokyo"}. Do you want to update your timezone?`,
          dont_update: "Don't update",
          update_timezone: "Update timezone",
        };
        return translations[key] || key;
      };

      const formattedCurrentTz = "Asia/Tokyo";

      return (
        <>
          <DialogHeader
            title={t("update_timezone_question")}
            subtitle={t("update_timezone_description", {
              formattedCurrentTz,
              interpolation: { escapeValue: false },
            })}
          />
          <div className="mb-8" />
          <DialogFooter showDivider>
            <DialogClose onClick={() => {}} color="secondary">
              {t("dont_update")}
            </DialogClose>
            <DialogClose onClick={() => {}} color="primary">
              {t("update_timezone")}
            </DialogClose>
          </DialogFooter>
        </>
      );
    };

    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Timezone Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent type="creation">
            <CustomDialogContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};

export const InteractionExample: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const [timezoneUpdated, setTimezoneUpdated] = useState(false);

    const InteractiveDialogContent = () => {
      const t = (key: string, options?: any) => {
        const translations: Record<string, string> = {
          update_timezone_question: "Update timezone?",
          update_timezone_description: `Your current timezone is ${options?.formattedCurrentTz || "America/Chicago"}. Do you want to update your timezone?`,
          dont_update: "Don't update",
          update_timezone: "Update timezone",
        };
        return translations[key] || key;
      };

      const formattedCurrentTz = "America/Chicago";

      return (
        <>
          <DialogHeader
            title={t("update_timezone_question")}
            subtitle={t("update_timezone_description", {
              formattedCurrentTz,
              interpolation: { escapeValue: false },
            })}
          />
          <div className="mb-8" />
          <DialogFooter showDivider>
            <DialogClose
              onClick={() => {
                setOpen(false);
              }}
              color="secondary">
              {t("dont_update")}
            </DialogClose>
            <DialogClose
              onClick={() => {
                setTimezoneUpdated(true);
                setOpen(false);
              }}
              color="primary">
              {t("update_timezone")}
            </DialogClose>
          </DialogFooter>
        </>
      );
    };

    return (
      <div className="space-y-4">
        <div className="text-sm">
          {timezoneUpdated ? (
            <p className="text-green-600">Timezone updated successfully!</p>
          ) : (
            <p className="text-gray-600">Timezone not updated yet</p>
          )}
        </div>
        <Button onClick={() => setOpen(true)}>Open Timezone Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent type="creation">
            <InteractiveDialogContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  },
};
