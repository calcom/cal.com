import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

import { Segment } from "@calcom/features/Segment";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { AttributeType } from "@calcom/prisma/enums";
import { trpc, type RouterOutputs } from "@calcom/trpc/react";

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
        isWeightsEnabled: false,
        options: [
          { id: "1", value: "Sales", slug: "sales", contains: [], isGroup: false },
          { id: "2", value: "Engineering", slug: "engineering", contains: [], isGroup: false },
        ],
      },
    ],
    isPending: false,
  });
};

// Mock the TRPC hooks
vi.mock("@calcom/trpc/react", () => ({
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
  const defaultQueryValue = {
    id: "root",
    type: "group",
    children1: {
      "rule-1": {
        type: "rule",
        properties: {
          field: "department",
          operator: "select_equals",
          value: ["Sales"],
        },
      },
    },
  } as AttributesQueryValue;

  const defaultProps = {
    teamId: 1,
    queryValue: defaultQueryValue,
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
      expect(screen.queryByTestId("segment_loading_state")).not.toBeInTheDocument();
    });
  });

  it("renders in loading state when matching team members are not loaded", async () => {
    mockGetMatchingTeamMembers({
      data: undefined,
      isPending: true,
    });
    render(<Segment {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("segment_loading_state")).toBeInTheDocument();
    });
  });

  it("shows no filter selected message when empty query value is provided", async () => {
    mockGetMatchingTeamMembers({
      isPending: true,
      data: undefined,
    });

    const emptyQueryValue = {
      id: "root",
      type: "group",
      children1: {},
    } as AttributesQueryValue;

    render(<Segment {...defaultProps} queryValue={emptyQueryValue} />);
    await waitFor(() => {
      expect(screen.getByText("no_filter_set")).toBeInTheDocument();
    });
  });

  it("shows matching team members when valid query value is provided", async () => {
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

    render(<Segment {...defaultProps} queryValue={defaultQueryValue} />);
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
