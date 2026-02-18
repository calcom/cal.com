import "@calcom/lib/__mocks__/constants";

import { render, screen } from "@calcom/features/bookings/Booker/__tests__/test-utils";
import React from "react";
import { afterEach, vi } from "vitest";
import { CrmContactOwnerMessage } from "./CrmContactOwnerMessage";

describe("CrmContactOwnerMessage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders banner when teamMemberEmail is set and showCrmOwnerBanner is true", () => {
    render(<CrmContactOwnerMessage />, {
      mockStore: {
        teamMemberEmail: "owner@example.com",
        showCrmOwnerBanner: true,
      },
    });

    expect(screen.getByTestId("crm-contact-owner-msg")).toBeInTheDocument();
    expect(screen.getByText("booking_with_contact_owner_name")).toBeInTheDocument();
  });

  it("does not render when teamMemberEmail is null", () => {
    render(<CrmContactOwnerMessage />, {
      mockStore: {
        teamMemberEmail: null,
        showCrmOwnerBanner: true,
      },
    });

    expect(screen.queryByTestId("crm-contact-owner-msg")).not.toBeInTheDocument();
  });

  it("does not render when showCrmOwnerBanner is false", () => {
    render(<CrmContactOwnerMessage />, {
      mockStore: {
        teamMemberEmail: "owner@example.com",
        showCrmOwnerBanner: false,
      },
    });

    expect(screen.queryByTestId("crm-contact-owner-msg")).not.toBeInTheDocument();
  });

  it("does not render when showCrmOwnerBanner is undefined", () => {
    render(<CrmContactOwnerMessage />, {
      mockStore: {
        teamMemberEmail: "owner@example.com",
      },
    });

    expect(screen.queryByTestId("crm-contact-owner-msg")).not.toBeInTheDocument();
  });
});
