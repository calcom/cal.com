import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      oAuth: {
        listUserClients: {
          useQuery: vi.fn().mockReturnValue({ data: undefined, isLoading: true }),
        },
        submitClientForReview: {
          useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
        },
        deleteClient: {
          useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
        },
        updateClient: {
          useMutation: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
    useUtils: () => ({
      viewer: { oAuth: { listUserClients: { invalidate: vi.fn() } } },
    }),
  },
}));

vi.mock("@calcom/ui/components/toast", () => ({ showToast: vi.fn() }));

vi.mock("@calcom/ui/components/empty-screen", () => ({
  EmptyScreen: ({ headline }: { headline: string }) => <div data-testid="empty-screen">{headline}</div>,
}));

vi.mock("@calcom/features/settings/appDir/SettingsHeader", () => ({
  default: ({
    children,
    title,
    CTA,
  }: {
    children: React.ReactNode;
    title: string;
    CTA?: React.ReactNode;
  }) => (
    <div data-testid="settings-header" data-title={title}>
      {CTA}
      {children}
    </div>
  ),
}));

vi.mock("../oauth/create/OAuthClientCreateModal", () => ({
  OAuthClientCreateDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-dialog" /> : null,
}));

vi.mock("../oauth/create/OAuthClientPreviewDialog", () => ({
  OAuthClientPreviewDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="preview-dialog" /> : null,
}));

vi.mock("../oauth/view/OAuthClientDetailsDialog", () => ({
  OAuthClientDetailsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="details-dialog" /> : null,
}));

vi.mock("../oauth/OAuthClientsList", () => ({
  OAuthClientsList: ({ clients }: { clients: Array<{ clientId: string; name: string }> }) => (
    <div data-testid="clients-list">
      {clients.map((c) => (
        <div key={c.clientId}>{c.name}</div>
      ))}
    </div>
  ),
}));

vi.mock("../oauth/create/NewOAuthClientButton", () => ({
  NewOAuthClientButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="new-client-btn" onClick={onClick}>
      New
    </button>
  ),
}));

vi.mock("./oauth-clients-skeleton", () => ({
  OAuthClientsSkeleton: () => <div data-testid="skeleton" />,
}));

describe("OAuthClientsView", async () => {
  const OAuthClientsView = (await import("./oauth-clients-view")).default;
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render skeleton while loading", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.oAuth.listUserClients.useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof trpcModule.trpc.viewer.oAuth.listUserClients.useQuery>);

    render(<OAuthClientsView />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("should render empty screen when no clients exist", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.oAuth.listUserClients.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof trpcModule.trpc.viewer.oAuth.listUserClients.useQuery>);

    render(<OAuthClientsView />);
    expect(screen.getByTestId("empty-screen")).toBeInTheDocument();
    expect(screen.getByText("no_oauth_clients")).toBeInTheDocument();
  });

  it("should render client list when clients exist", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.oAuth.listUserClients.useQuery).mockReturnValue({
      data: [
        {
          clientId: "c1",
          name: "Client 1",
          purpose: "Testing",
          redirectUri: "https://example.com",
          websiteUrl: "https://example.com",
          logo: null,
          status: "APPROVED",
          rejectionReason: null,
          clientType: "STANDARD",
        },
      ],
      isLoading: false,
    } as ReturnType<typeof trpcModule.trpc.viewer.oAuth.listUserClients.useQuery>);

    render(<OAuthClientsView />);
    expect(screen.getByTestId("clients-list")).toBeInTheDocument();
    expect(screen.getByText("Client 1")).toBeInTheDocument();
  });

  it("should render new client button", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.oAuth.listUserClients.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof trpcModule.trpc.viewer.oAuth.listUserClients.useQuery>);

    render(<OAuthClientsView />);
    expect(screen.getByTestId("new-client-btn")).toBeInTheDocument();
  });

  it("should render settings header with oauth_clients title", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.oAuth.listUserClients.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof trpcModule.trpc.viewer.oAuth.listUserClients.useQuery>);

    render(<OAuthClientsView />);
    expect(screen.getByTestId("settings-header")).toHaveAttribute("data-title", "oauth_clients");
  });
});
