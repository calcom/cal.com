import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { RouteActionType } from "@calcom/app-store/routing-forms/zod";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";

import { RerouteDialog } from "../RerouteDialog";

const mockRouter = {
  push: vi.fn((path: string) => {
    return;
  }),
};

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: vi.fn(() => mockRouter),
  };
});

vi.mock("@calcom/app-store/routing-forms/lib/processRoute", () => ({
  findMatchingRoute: vi.fn(({ form, response }) => {
    return form.routes.find((route: any) => route.__testMatching);
  }),
}));

const fakeNewTabWindow = {
  close: vi.fn(),
};

const mockOpen = vi.fn((_url: string) => {
  return fakeNewTabWindow;
});

vi.stubGlobal("open", mockOpen);

vi.mock("@calcom/app-store/routing-forms/components/FormInputFields", () => ({
  default: vi.fn(({ response, form, setResponse, disabledFields }) => {
    return (
      <div data-testid="mock-form-input-fields">
        {form.fields?.map((field: any) => (
          <div key={field.id}>
            <label data-testid={`mock-form-field-${field.id}-label`}>{field.label}</label>
            <div data-testid={`mock-form-field-${field.id}-value`}>{response[field.id]?.value}</div>
          </div>
        ))}
        <div data-testid="mock-form-field-disabled-fields-identifiers">{disabledFields.join(", ")}</div>
        <button
          data-testid="mock-form-update-response-button"
          onClick={() =>
            setResponse({
              "company-size": {
                label: "Company Size",
                value: "small",
              },
              country: {
                label: "Country",
                value: "usa",
              },
            })
          }>
          Test Update Response
        </button>
      </div>
    );
  }),
  FormInputFieldsSkeleton: vi.fn(() => <div data-testid="mock-form-input-fields-skeleton" />),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@calcom/web/lib/hooks/useRouterQuery", () => ({
  default: vi.fn(() => {
    return {
      setQuery: vi.fn(),
    };
  }),
}));

vi.mock("@calcom/ui", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const actual = await importOriginal<any>("@calcom/ui");
  return {
    ...actual,
    Tooltip: vi.fn(({ children }) => <div data-testid="mock-tooltip">{children}</div>),
  };
});

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      appRoutingForms: {
        getResponseWithFormFields: {
          useQuery: vi.fn(() => ({
            data: {
              form: {
                id: "form-id",
                name: "Test Form",
                fields: [
                  {
                    id: "company-size",
                    label: "Company Size",
                    type: "select",
                    options: [
                      { label: "Small", value: "small" },
                      { label: "Medium", value: "medium" },
                      { label: "Large", value: "large" },
                    ],
                  },
                  {
                    id: "country",
                    label: "Country",
                    type: "select",
                    options: [
                      { label: "USA", value: "usa" },
                      { label: "Canada", value: "canada" },
                      { label: "UK", value: "uk" },
                    ],
                  },
                  {
                    id: "email",
                    label: "Email",
                    type: "email",
                    required: true,
                  },
                ],
                routes: [
                  {
                    id: "mock-route-id",
                    action: {
                      eventTypeId: 123,
                      type: RouteActionType.EventTypeRedirectUrl,
                      value: "team/test-team/new-test-event",
                    },
                    __testMatching: true,
                  },
                  {
                    id: "fallback-route",
                    isFallback: true,
                    action: {
                      type: RouteActionType.CustomPageMessage,
                      value: "456",
                    },
                    __testMatching: false,
                  },
                ],
              },
              response: {
                "company-size": {
                  label: "Company Size",
                  value: "small",
                },
                country: {
                  label: "Country",
                  value: "usa",
                },
              },
            },
            isPending: false,
          })),
        },
      },
      eventTypes: {
        get: {
          useQuery: vi.fn(() => ({
            data: {
              eventType: {
                id: "123",
                title: "Mocked Event Type",
                slug: "mocked-event-type",
                length: 30,
                schedulingType: "ROUND_ROBIN",
                team: { slug: "mocked-team" },
              },
            },
            isPending: false,
          })),
        },
      },
      routingForms: {
        findTeamMembersMatchingAttributeLogicOfRoute: {
          useMutation: vi.fn(({ onSuccess }) => {
            return {
              mutate: vi.fn(() => {
                onSuccess({
                  result: {
                    users: [
                      {
                        id: 1,
                        name: "Matching User 1",
                        email: "matching-user-1@example.com",
                      },
                      {
                        id: 2,
                        name: "Matching User 2",
                        email: "matching-user-2@example.com",
                      },
                    ],
                  },
                });
              }),
            };
          }),
        },
      },
    },
  },
}));

const mockReactQueryMutateFn = vi.fn(({ __testOnSuccess }) => {
  __testOnSuccess({
    uid: "RESCHEDULED_BOOKING_UID_SAME_TIMESLOT",
  });
});

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(({ onSuccess }) => {
    return {
      mutate: vi.fn((payload) => {
        mockReactQueryMutateFn({
          ...payload,
          __testOnSuccess: onSuccess,
        });
      }),
      isLoading: false,
      isError: false,
      error: null,
      onSuccess: onSuccess,
    };
  }),
}));

async function mockMessageFromOpenedTab({ type, data }: { type: string; data: any }) {
  const messageReceivedPromise = new Promise<boolean>((resolve) => {
    window.addEventListener("message", () => {
      resolve(true);
    });
  });
  window.postMessage(
    {
      type,
      data,
    },
    "*"
  );

  return messageReceivedPromise;
}

async function expectEventTypeInfoInCurrentRouting({
  eventTypeText,
  eventTypeHref,
}: {
  eventTypeText: string;
  eventTypeHref: string;
}) {
  const eventTypeEl = screen.getByTestId("current-routing-status-event-type");
  expect(eventTypeEl).toHaveTextContent(eventTypeText);
  await expect(eventTypeEl.querySelector("a")).toHaveAttribute("href", eventTypeHref);
}

async function expectEventTypeInfoInReroutePreview({
  eventTypeText,
  eventTypeHref,
}: {
  eventTypeText: string;
  eventTypeHref: string;
}) {
  const eventTypeEl = screen.getByTestId("reroute-preview-event-type");
  expect(eventTypeEl).toHaveTextContent(eventTypeText);
  await expect(eventTypeEl.querySelector("a")).toHaveAttribute("href", eventTypeHref);
}

function expectOrganizerInfoInCurrentRouting({ organizerText }: { organizerText: string }) {
  const organizerEl = screen.getByTestId("current-routing-status-organizer");
  expect(organizerEl).toHaveTextContent(organizerText);
}

function expectAttendeesInfoInCurrentRouting({ attendeesText }: { attendeesText: string }) {
  const attendeesEl = screen.getByTestId("current-routing-status-attendees");
  expect(attendeesEl).toHaveTextContent(attendeesText);
}
const userWhoBooked = { id: 1, name: "Test User", email: "user@example.com" };
const mockBooking = {
  id: 1,
  uid: "original-booking-uid",
  title: "Test Booking",
  startTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
  metadata: {},
  responses: {},
  attendees: [{ email: "attendee@example.com", name: "Attendee", timeZone: "UTC", locale: "en" }],
  eventType: {
    id: 1,
    slug: "test-event",
    team: { slug: "test-team" },
    length: 60,
    schedulingType: SchedulingType.ROUND_ROBIN,
    title: "Test Event",
  },
  user: userWhoBooked,
  routedFromRoutingFormReponse: { id: 1 },
  status: BookingStatus.ACCEPTED, // Add this line
};

const buildBooking = () => {
  return {
    ...mockBooking,
  };
};

describe("RerouteDialog", () => {
  const mockSetIsOpenDialog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders the dialog when open", () => {
    render(<RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />);

    expect(screen.getByText("reroute_booking")).toBeInTheDocument();
    expect(screen.getByText("reroute_booking_description")).toBeInTheDocument();
  });

  test("doesn't render the dialog when closed", () => {
    render(
      <RerouteDialog isOpenDialog={false} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />
    );

    expect(screen.queryByText("reroute_booking")).not.toBeInTheDocument();
  });

  test("displays current routing status", async () => {
    render(<RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />);
    expect(screen.getByText("current_routing_status")).toBeInTheDocument();

    expectEventTypeInfoInCurrentRouting({
      eventTypeText: "team/test-team/test-event",
      eventTypeHref: "https://cal.com/team/test-team/test-event",
    });
    expectOrganizerInfoInCurrentRouting({
      organizerText: "user@example.com",
    });
    expectAttendeesInfoInCurrentRouting({
      attendeesText: "attendee@example.com",
    });
    // screen.logTestingPlaygroundURL()
  });

  test("verify_new_route button is enabled even when form fields are not filled", async () => {
    render(<RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />);
    await expect(screen.getByText("verify_new_route")).toBeEnabled();
  });

  test("disabledFields are passed to FormInputFields with value ['email'] - email field is disabled", async () => {
    render(<RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />);
    expect(screen.getByTestId("mock-form-field-disabled-fields-identifiers")).toHaveTextContent(/^email$/);
  });

  test("Expect form fields and name to be rendered", async () => {
    render(<RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />);
    expect(screen.getByText("Test Form")).toBeInTheDocument();
    expect(screen.getByTestId("mock-form-field-company-size-label")).toHaveTextContent("Company Size");
    expect(screen.getByTestId("mock-form-field-company-size-value")).toHaveTextContent("small");
    expect(screen.getByTestId("mock-form-field-country-label")).toHaveTextContent("Country");
    expect(screen.getByTestId("mock-form-field-country-value")).toHaveTextContent("usa");
  });

  test("cancel button closes the dialog", async () => {
    render(<RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />);

    expect(screen.getByText("cancel")).toBeInTheDocument();

    fireEvent.click(screen.getByText("cancel"));
    expect(mockSetIsOpenDialog).toHaveBeenCalledWith(false);
  });

  describe("New Routing tests", () => {
    test("when verify_new_route is clicked, the form is submitted", async () => {
      render(
        <RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />
      );
      fireEvent.click(screen.getByText("verify_new_route"));

      expectEventTypeInfoInReroutePreview({
        eventTypeText: "team/test-team/new-test-event",
        eventTypeHref: "https://cal.com/team/test-team/new-test-event",
      });
      await expect(screen.getByText("verify_new_route")).toBeEnabled();
      expect(screen.getByTestId("reroute-preview-hosts")).toHaveTextContent("reroute_preview_possible_host");
      expect(screen.getByTestId("reroute-preview-hosts")).toHaveTextContent("matching-user-1@example.com");

      expect(screen.getByText("reschedule_to_the_new_event_with_different_timeslot")).toBeInTheDocument();
      expect(screen.getByText("reschedule_with_same_timeslot_of_new_event")).toBeInTheDocument();
    });

    describe("New tab rescheduling", () => {
      test("new tab is closed when new booking is rerouted", async () => {
        render(
          <RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />
        );
        clickVerifyNewRouteButton();
        clickRescheduleToTheNewEventWithDifferentTimeslotButton();
        await mockMessageFromOpenedTab({
          type: "CAL:rescheduleBookingSuccessfulV2",
          data: {
            uid: "RESCHEDULED_BOOKING_UID_NEW_TAB",
          },
        });

        const rescheduleTabUrl = mockOpen.mock.calls[0][0] as unknown as string;
        const rescheduleTabUrlObject = new URL(rescheduleTabUrl, "http://mockcal.com");
        expect(Object.fromEntries(rescheduleTabUrlObject.searchParams.entries())).toEqual(
          expect.objectContaining({
            rescheduleUid: mockBooking.uid,
            "cal.rerouting": "true",
            // Shouldn't include the user who booked the booking
            "cal.routedTeamMemberIds": "2",
            "cal.reroutingFormResponses": JSON.stringify({
              "company-size": {
                value: "small",
              },
              country: {
                value: "usa",
              },
            }),
          })
        );
        expect(fakeNewTabWindow.close).toHaveBeenCalled();
        expectToBeNavigatedToBookingPage({
          booking: {
            uid: "RESCHEDULED_BOOKING_UID_NEW_TAB",
          },
        });
      });

      test("Rescheduling with same timeslot works", async () => {
        render(
          <RerouteDialog isOpenDialog={true} setIsOpenDialog={mockSetIsOpenDialog} booking={mockBooking} />
        );
        clickVerifyNewRouteButton();
        clickRescheduleWithSameTimeslotOfChosenEventButton();
        expect(mockReactQueryMutateFn).toHaveBeenCalledWith(
          expect.objectContaining({
            rescheduleUid: mockBooking.uid,
            // Shouldn't include the user who booked the booking
            routedTeamMemberIds: [2],
            reroutingFormResponses: {
              "company-size": {
                value: "small",
              },
              country: {
                value: "usa",
              },
            },
          })
        );

        expectToBeNavigatedToBookingPage({
          booking: {
            uid: "RESCHEDULED_BOOKING_UID_SAME_TIMESLOT",
          },
        });
      });
    });
  });
});

function clickVerifyNewRouteButton() {
  act(() => {
    fireEvent.click(screen.getByText("verify_new_route"));
  });
}

function clickRescheduleToTheNewEventWithDifferentTimeslotButton() {
  act(() => {
    fireEvent.click(screen.getByText("reschedule_to_the_new_event_with_different_timeslot"));
  });
}

function clickRescheduleWithSameTimeslotOfChosenEventButton() {
  act(() => {
    fireEvent.click(screen.getByText("reschedule_with_same_timeslot_of_new_event"));
  });
}

function expectToBeNavigatedToBookingPage({
  booking,
}: {
  booking: {
    uid: string;
  };
}) {
  expect(mockRouter.push).toHaveBeenCalledWith(`/booking/${booking.uid}?cal.rerouting=true`);
}
