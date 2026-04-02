import prismock from "@calcom/testing/lib/__mocks__/prisma";
import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import bookingFormHandlers from "@calcom/app-store/routing-forms/appBookingFormHandler";
import {
  ROUTING_FORM_QUEUED_RESPONSE_ID_QUERY_STRING,
  ROUTING_FORM_RESPONSE_ID_QUERY_STRING,
} from "@calcom/app-store/routing-forms/lib/constants";
import { RouteActionType } from "@calcom/app-store/routing-forms/zod";
import { getTeamMemberEmailForResponseOrContactUsingUrlQuery } from "@calcom/features/ee/teams/lib/getTeamMemberEmailFromCrm";
import { SchedulingType } from "@calcom/prisma/enums";
import { v4 } from "uuid";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/app-store/routing-forms/appBookingFormHandler", () => ({
  default: {
    salesforce: vi.fn(),
  },
}));

vi.mock("@calcom/app-store/_utils/CRMRoundRobinSkip", () => ({
  getCRMContactOwnerForRRLeadSkip: vi.fn(),
}));

function mockGetCRMContactOwnerForRRLeadSkip({
  bookerEmail,
  teamMemberEmail,
}: {
  bookerEmail: string;
  teamMemberEmail: string;
}) {
  vi.mocked(getCRMContactOwnerForRRLeadSkip).mockImplementation((_bookerEmail, _eventMetadata) => {
    if (_bookerEmail === bookerEmail) {
      return Promise.resolve({ email: teamMemberEmail, recordType: null, crmAppSlug: null, recordId: null });
    }
    return Promise.resolve({ email: null, recordType: null, crmAppSlug: null, recordId: null });
  });
}

function mockBookingFormHandler({
  bookerEmail,
  teamMemberEmail,
}: {
  bookerEmail: string;
  teamMemberEmail: string;
}) {
  vi.mocked(bookingFormHandlers.salesforce).mockImplementation(
    (_bookerEmail, _attributeRoutingConfig, _eventTypeId) => {
      if (_bookerEmail === bookerEmail) {
        return Promise.resolve({ email: teamMemberEmail, recordType: null, recordId: null });
      }
      return Promise.resolve({ email: null, recordType: null, recordId: null });
    }
  );
}

type RoutingFormData = {
  routes: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryValue?: any;
    action: {
      eventTypeId: number;
      type: RouteActionType;
      value: string;
    };
    attributeRoutingConfig: {
      skipContactOwner: boolean;
    };
  }[];
};

async function _createRoutingFormBase({ formData }: { formData: RoutingFormData }) {
  const user = await prismock.user.create({
    data: {
      name: "Routing Form User",
      username: "routing-form-user",
      email: "routing-form-user@example.com",
    },
  });

  const routeId = v4();

  const form = await prismock.app_RoutingForms_Form.create({
    data: {
      ...formData,
      name: "Test Form",
      routes: formData.routes.map((route) => ({
        queryValue: {
          id: v4(),
          type: "group",
        },
        id: routeId,
        ...route,
      })),
      user: {
        connect: {
          id: user.id,
        },
      },
    },
  });

  return { form, routeId };
}

async function createRoutingFormWithResponse({ formData }: { formData: RoutingFormData }) {
  const { form, routeId } = await _createRoutingFormBase({ formData });

  const responseRecord = await prismock.app_RoutingForms_FormResponse.create({
    data: {
      chosenRouteId: routeId,
      response: {},
      form: {
        connect: {
          id: form.id,
        },
      },
    },
  });

  return { form, responseRecord };
}

async function createRoutingFormWithQueuedResponse({ formData }: { formData: RoutingFormData }) {
  const { form, routeId } = await _createRoutingFormBase({ formData });

  const queuedResponseId = v4();
  const queuedResponseRecord = await prismock.app_RoutingForms_QueuedFormResponse.create({
    data: {
      id: queuedResponseId,
      chosenRouteId: routeId,
      response: {},
      form: {
        connect: {
          id: form.id,
        },
      },
    },
  });

  return { form, queuedResponseRecord };
}

async function createHostForEvent({
  eventTypeData,
  userData,
}: {
  eventTypeData: { id: number } & Partial<{
    title: string;
    slug: string;
    length: number;
  }>;
  userData: {
    email: string;
  } & Partial<{
    name: string;
    username: string;
  }>;
}) {
  const user = await prismock.user.create({
    data: {
      name: "Test User",
      username: "testuser",
      ...userData,
    },
  });
  await prismock.eventType.create({
    data: {
      title: "Title",
      slug: "slug",
      length: 30,
      ...eventTypeData,
      hosts: {
        create: {
          userId: user.id,
          isFixed: true,
        },
      },
    },
  });
}

describe("getTeamMemberEmailForResponseOrContactUsingUrlQuery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockEventData = {
    id: 1,
    isInstantEvent: false,
    schedulingType: SchedulingType.ROUND_ROBIN,
    metadata: null,
    length: 30,
    hosts: [
      {
        user: {
          email: "owner@example.com",
        },
      },
    ],
  };

  it("should return null when email is not provided in query", async () => {
    const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query: {},
      eventData: mockEventData,
    });

    const ownerEmail = result.email;

    expect(ownerEmail).toBeNull();
  });

  it("should return null when scheduling type is not ROUND_ROBIN", async () => {
    const bookerEmail = "booker@example.com";
    const teamMemberEmail = "teamMember@example.com";
    mockGetCRMContactOwnerForRRLeadSkip({ bookerEmail, teamMemberEmail });
    await createHostForEvent({
      eventTypeData: {
        id: mockEventData.id,
      },
      userData: {
        email: teamMemberEmail,
      },
    });

    const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query: { email: bookerEmail },
      eventData: { ...mockEventData, schedulingType: SchedulingType.COLLECTIVE },
    });

    expect(result.email).toBeNull();
  });

  it("should return CRM owner email when valid", async () => {
    const ownerEmail = "owner@example.com";
    const bookerEmail = "booker@example.com";
    mockGetCRMContactOwnerForRRLeadSkip({ bookerEmail, teamMemberEmail: ownerEmail });
    await createHostForEvent({
      eventTypeData: {
        id: mockEventData.id,
      },
      userData: {
        email: ownerEmail,
      },
    });

    const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query: { email: "booker@example.com" },
      eventData: mockEventData,
    });

    expect(result.email).toBe(ownerEmail);
  });

  it("should return null when CRM owner is not found", async () => {
    const bookerEmail = "booker@example.com";
    const teamMemberEmail = "teamMember@example.com";
    mockGetCRMContactOwnerForRRLeadSkip({ bookerEmail, teamMemberEmail });

    const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query: { email: bookerEmail },
      eventData: mockEventData,
    });

    expect(result.email).toBeNull();
  });

  it("should return null when CRM owner is not part of event type", async () => {
    const ownerEmail = "ownerNotInEventType@example.com";
    const bookerEmail = "booker@example.com";
    mockGetCRMContactOwnerForRRLeadSkip({ bookerEmail, teamMemberEmail: ownerEmail });

    const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query: { email: bookerEmail },
      eventData: mockEventData,
    });

    expect(result.email).toBeNull();
  });

  describe("Booking form handler", () => {
    describe("when responseId is provided", () => {
      it("should return teamMember email through booking form handler when cal.routingFormResponseId and cal.salesforce.xxxx=true is provided", async () => {
        const bookerEmail = "booker@example.com";
        const teamMemberEmail = "owner@example.com";
        mockBookingFormHandler({ bookerEmail, teamMemberEmail });
        await createHostForEvent({
          eventTypeData: {
            id: mockEventData.id,
          },
          userData: {
            email: teamMemberEmail,
          },
        });

        const { responseRecord } = await createRoutingFormWithResponse({
          formData: {
            routes: [
              {
                action: {
                  eventTypeId: 1,
                  type: RouteActionType.EventTypeRedirectUrl,
                  value: "/team/sales",
                },
                attributeRoutingConfig: { skipContactOwner: false },
              },
            ],
          },
        });

        const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
          query: {
            email: bookerEmail,
            [ROUTING_FORM_RESPONSE_ID_QUERY_STRING]: responseRecord.id.toString(),
            "cal.salesforce.xxx": "true",
          },
          eventData: mockEventData,
        });

        expect(result.email).toBe(teamMemberEmail);
      });

      it("should return null when skipContactOwner is true even when cal.routingFormResponseId and cal.salesforce.xxxx=true is provided", async () => {
        const bookerEmail = "booker@example.com";
        const teamMemberEmail = "owner@example.com";
        mockBookingFormHandler({ bookerEmail, teamMemberEmail });
        await createHostForEvent({
          eventTypeData: {
            id: mockEventData.id,
          },
          userData: {
            email: teamMemberEmail,
          },
        });

        const { responseRecord } = await createRoutingFormWithResponse({
          formData: {
            routes: [
              {
                action: {
                  eventTypeId: 1,
                  type: RouteActionType.EventTypeRedirectUrl,
                  value: "/team/sales",
                },
                attributeRoutingConfig: { skipContactOwner: true },
              },
            ],
          },
        });

        const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
          query: {
            email: bookerEmail,
            [ROUTING_FORM_RESPONSE_ID_QUERY_STRING]: responseRecord.id.toString(),
            "cal.salesforce.xxx": "true",
          },
          eventData: mockEventData,
        });

        // Because skipContactOwner is true, the booking form handler should return null
        expect(result.email).toBe(null);
      });

      it("should return null when when cal.routingFormResponseId and cal.salesforce.xxxx=true is provided but the returned email isn't an event member", async () => {
        const bookerEmail = "booker@example.com";
        const teamMemberEmail = "ownerNotInEventType@example.com";
        mockBookingFormHandler({ bookerEmail, teamMemberEmail });
        const SOME_OTHER_EVENT_ID = 200;
        await createHostForEvent({
          eventTypeData: {
            id: SOME_OTHER_EVENT_ID,
          },
          userData: {
            email: teamMemberEmail,
          },
        });

        const { responseRecord } = await createRoutingFormWithResponse({
          formData: {
            routes: [
              {
                action: {
                  eventTypeId: 1,
                  type: RouteActionType.EventTypeRedirectUrl,
                  value: "/team/sales",
                },
                attributeRoutingConfig: { skipContactOwner: false },
              },
            ],
          },
        });

        const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
          query: {
            email: bookerEmail,
            [ROUTING_FORM_RESPONSE_ID_QUERY_STRING]: responseRecord.id.toString(),
            "cal.salesforce.xxx": "true",
          },
          eventData: mockEventData,
        });

        expect(result.email).toBe(null);
      });

      it("should return null when cal.routingFormResponseId is provided but cal.salesforce.xxxx is not", async () => {
        const bookerEmail = "booker@example.com";
        const teamMemberEmail = "owner@example.com";
        mockBookingFormHandler({ bookerEmail, teamMemberEmail });
        await createHostForEvent({
          eventTypeData: {
            id: mockEventData.id,
          },
          userData: {
            email: teamMemberEmail,
          },
        });

        const { responseRecord } = await createRoutingFormWithResponse({
          formData: {
            routes: [
              {
                action: {
                  eventTypeId: 1,
                  type: RouteActionType.EventTypeRedirectUrl,
                  value: "/team/sales",
                },
                attributeRoutingConfig: { skipContactOwner: false },
              },
            ],
          },
        });

        const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
          query: {
            email: bookerEmail,
            [ROUTING_FORM_RESPONSE_ID_QUERY_STRING]: responseRecord.id.toString(),
            "cal.somethingelse.xxx": "true",
          },
          eventData: mockEventData,
        });

        expect(result.email).toBe(null);
      });
    });
    describe("when queuedFormResponseId is provided", () => {
      it("should return teamMember email through booking form handler when cal.queuedFormResponseId and cal.salesforce.xxxx=true is provided", async () => {
        const bookerEmail = "booker@example.com";
        const teamMemberEmail = "owner@example.com";
        mockBookingFormHandler({ bookerEmail, teamMemberEmail });
        await createHostForEvent({
          eventTypeData: {
            id: mockEventData.id,
          },
          userData: {
            email: teamMemberEmail,
          },
        });

        const { queuedResponseRecord } = await createRoutingFormWithQueuedResponse({
          formData: {
            routes: [
              {
                action: {
                  eventTypeId: 1,
                  type: RouteActionType.EventTypeRedirectUrl,
                  value: "/team/sales",
                },
                attributeRoutingConfig: { skipContactOwner: false },
              },
            ],
          },
        });

        const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
          query: {
            email: bookerEmail,
            [ROUTING_FORM_QUEUED_RESPONSE_ID_QUERY_STRING]: queuedResponseRecord.id,
            "cal.salesforce.xxx": "true",
          },
          eventData: mockEventData,
        });

        expect(result.email).toBe(teamMemberEmail);
      });

      it("should return null when skipContactOwner is true even when cal.queuedFormResponseId and cal.salesforce.xxxx=true is provided", async () => {
        const bookerEmail = "booker@example.com";
        const teamMemberEmail = "owner@example.com";
        mockBookingFormHandler({ bookerEmail, teamMemberEmail });
        await createHostForEvent({
          eventTypeData: {
            id: mockEventData.id,
          },
          userData: {
            email: teamMemberEmail,
          },
        });

        const { queuedResponseRecord } = await createRoutingFormWithQueuedResponse({
          formData: {
            routes: [
              {
                action: {
                  eventTypeId: 1,
                  type: RouteActionType.EventTypeRedirectUrl,
                  value: "/team/sales",
                },
                attributeRoutingConfig: { skipContactOwner: true },
              },
            ],
          },
        });

        const result = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
          query: {
            email: bookerEmail,
            [ROUTING_FORM_QUEUED_RESPONSE_ID_QUERY_STRING]: queuedResponseRecord.id,
            "cal.salesforce.xxx": "true",
          },
          eventData: mockEventData,
        });

        // Because skipContactOwner is true, the booking form handler should return null
        expect(result.email).toBe(null);
      });
    });
  });
});
