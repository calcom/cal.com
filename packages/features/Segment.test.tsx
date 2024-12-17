import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

import { Segment } from "@calcom/features/Segment";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { AttributeType } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc";

type Attributes = RouterOutputs["viewer"]["appRoutingForms"]["getAttributesForTeam"];
type MatchingTeamMembersData = RouterOutputs["viewer"]["attributes"]["findTeamMembersMatchingAttributeLogic"];
const mockGetAttributesForTeam = (
  arg: { data: Attributes; isPending: false } | { data: undefined; isPending: true }
) => {
  (
    trpc.viewer.appRoutingForms.getAttributesForTeam.useQuery as Mock<
      typeof trpc.viewer.appRoutingForms.getAttributesForTeam.useQuery
    >
  )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue(arg as any);
};

const mockGetMatchingTeamMembers = (
  arg:
    | {
        data: MatchingTeamMembersData;
        isPending: false;
      }
    | {
        data: undefined;
        isPending: true;
      }
) => {
  (
    trpc.viewer.attributes.findTeamMembersMatchingAttributeLogic.useQuery as Mock<
      typeof trpc.viewer.attributes.findTeamMembersMatchingAttributeLogic.useQuery
    >
  )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue(arg as any);
};

const mockAttributesWithSingleSelect = () => {
  return mockGetAttributesForTeam({
    data: [
      {
        id: "a",
        slug: "department",
        name: "Department",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "1", value: "Sales", slug: "sales" },
          { id: "2", value: "Engineering", slug: "engineering" },
        ],
      },
    ],
    isPending: false,
  });
};

// Mock the TRPC hooks
vi.mock("@calcom/trpc", () => ({
  trpc: {
    viewer: {
      appRoutingForms: {
        getAttributesForTeam: {
          useQuery: vi.fn(),
        },
      },
      attributes: {
        findTeamMembersMatchingAttributeLogic: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

// Mock useLocale hook
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

describe("Segment", () => {
  const defaultProps = {
    teamId: 1,
    queryValue: null as AttributesQueryValue | null,
    onQueryValueChange: vi.fn(),
    className: "test-class",
  };
  beforeEach(() => {
    mockAttributesWithSingleSelect();
  });

  it("renders query builder when attributes are loaded", async () => {
    mockGetMatchingTeamMembers({
      data: {
        mainWarnings: null,
        fallbackWarnings: null,
        troubleshooter: undefined,
        result: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
          },
        ],
      },
      isPending: false,
    });
    render(<Segment {...defaultProps} />);

    await waitFor(() => {
      // Query builder container should be present
      expect(screen.getByTestId("query-builder-container")).toBeInTheDocument();
      expect(screen.queryByText("loading")).not.toBeInTheDocument();
    });
  });

  it("renders in loading state when matching team members are not loaded", async () => {
    mockGetMatchingTeamMembers({
      data: undefined,
      isPending: true,
    });
    render(<Segment {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("loading")).toBeInTheDocument();
    });
  });

  it("shows matching team members when query value is provided", async () => {
    mockGetMatchingTeamMembers({
      isPending: false,
      data: {
        mainWarnings: null,
        fallbackWarnings: null,
        troubleshooter: undefined,
        result: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
          },
        ],
      },
    });

    const queryValue = {
      id: "root",
      type: "group",
    } as AttributesQueryValue;

    render(<Segment {...defaultProps} queryValue={queryValue} />);
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("(john@example.com)")).toBeInTheDocument();
    });
  });

  it("shows no filter message when no query is set", async () => {
    mockGetMatchingTeamMembers({
      data: {
        mainWarnings: null,
        fallbackWarnings: null,
        troubleshooter: undefined,
        result: [] as MatchingTeamMembersData["result"],
      },
      isPending: false,
    });
    render(<Segment {...defaultProps} queryValue={null} />);
    await waitFor(() => {
      expect(screen.getByText("no_filter_set")).toBeInTheDocument();
    });
  });
});
