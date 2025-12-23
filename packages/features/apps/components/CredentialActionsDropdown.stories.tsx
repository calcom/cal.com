import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { fn } from "storybook/test";

import CredentialActionsDropdown from "./CredentialActionsDropdown";

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
      ({ op }) => {
        return {
          subscribe: (observer: any) => {
            observer.next({
              result: {
                data: {},
              },
            });
            observer.complete();
            return {
              unsubscribe: () => {},
            };
          },
        } as any;
      },
  ],
});

const meta = {
  component: CredentialActionsDropdown,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <mockTrpc.Provider client={mockTrpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <div style={{ padding: "50px" }}>
            <Story />
          </div>
        </QueryClientProvider>
      </mockTrpc.Provider>
    ),
  ],
  argTypes: {
    credentialId: {
      description: "The ID of the credential to manage",
      control: "number",
    },
    onSuccess: {
      description: "Callback function called when the credential is successfully removed",
      control: false,
    },
    delegationCredentialId: {
      description: "ID of the delegation credential (when present, dropdown is hidden)",
      control: "text",
    },
    disableConnectionModification: {
      description: "Whether to disable the ability to disconnect the credential",
      control: "boolean",
    },
  },
  args: {
    onSuccess: fn(),
  },
} satisfies Meta<typeof CredentialActionsDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    credentialId: 1,
    delegationCredentialId: null,
    disableConnectionModification: false,
  },
};

export const WithOnSuccessCallback: Story = {
  args: {
    credentialId: 2,
    onSuccess: fn(() => console.log("Credential removed successfully")),
    delegationCredentialId: null,
    disableConnectionModification: false,
  },
};

export const WithDelegationCredential: Story = {
  args: {
    credentialId: 3,
    delegationCredentialId: "delegation-123",
    disableConnectionModification: false,
  },
  parameters: {
    docs: {
      description: {
        story: "When a delegation credential is present, the dropdown is hidden and returns null.",
      },
    },
  },
};

export const WithDisabledModification: Story = {
  args: {
    credentialId: 4,
    delegationCredentialId: null,
    disableConnectionModification: true,
  },
  parameters: {
    docs: {
      description: {
        story: "When connection modification is disabled, the dropdown is hidden and returns null.",
      },
    },
  },
};

export const DisabledByBothConditions: Story = {
  args: {
    credentialId: 5,
    delegationCredentialId: "delegation-456",
    disableConnectionModification: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When both delegation credential is present AND connection modification is disabled, the dropdown is hidden.",
      },
    },
  },
};

export const MultipleDropdowns: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <div>
        <p className="text-sm mb-2">Google Calendar</p>
        <CredentialActionsDropdown
          credentialId={10}
          delegationCredentialId={null}
          disableConnectionModification={false}
        />
      </div>
      <div>
        <p className="text-sm mb-2">Outlook Calendar</p>
        <CredentialActionsDropdown
          credentialId={11}
          delegationCredentialId={null}
          disableConnectionModification={false}
        />
      </div>
      <div>
        <p className="text-sm mb-2">Apple Calendar</p>
        <CredentialActionsDropdown
          credentialId={12}
          delegationCredentialId={null}
          disableConnectionModification={false}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Example showing multiple credential action dropdowns in a list.",
      },
    },
  },
};
