import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { after, before, it } from "mocha";
import assert from "node:assert";

import { sendScheduledEmails } from "@calcom/emails/email-workflow";

describe("Email workflows with mocks", () => {
  let testEnv: TestWorkflowEnvironment;

  before(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  after(async () => {
    await testEnv?.teardown();
  });

  it("successfully completes a Workflow Execution with a mocked Activity", async () => {
    const { client, nativeConnection } = testEnv;
    const taskQueue = "calcom";

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue,
      workflowsPath: require.resolve("@calcom/emails/email-workflow"),
      activities: {
        sendScheduledEmails: async () => "Skipped sending email",
      },
    });

    const result = await worker.runUntil(
      client.workflow.execute(sendScheduledEmails, {
        args: [workflowInput],
        workflowId: "test",
        taskQueue,
      })
    );

    assert.equal(result, "Skipped sending email");
  });

  it("successfully completes the Workflow Execution after a couple of retry", async () => {
    const { client, nativeConnection } = testEnv;
    const taskQueue = "calcom";
    let retryAttempts = 1;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue,
      workflowsPath: require.resolve("@calcom/emails/email-workflow"),
      activities: {
        sendScheduledEmails: () => {
          console.log("retryAttempts: ", retryAttempts);

          if (retryAttempts < 2) {
            retryAttempts++;
            throw new Error("Mock failure");
          }
          return "Skipped sending email";
        },
      },
    });

    const result = await worker.runUntil(
      client.workflow.execute(sendScheduledEmails, {
        args: [workflowInput],
        workflowId: "test",
        taskQueue,
        retry: {
          maximumAttempts: 3,
        },
      })
    );

    assert.equal(result, "Skipped sending email");
  });
});

const workflowInput = {
  data: {
    calEvent: {
      bookerUrl: "http://localhost:3000",
      type: "15min",
      title: "15 Min Meeting between Peter M and Peter M",
      description: null,
      additionalNotes: "",
      customInputs: {},
      startTime: "2023-12-04T09:00:00Z",
      endTime: "2023-12-04T09:15:00Z",
      organizer: {
        id: 1,
        name: "Peter M",
        email: "p.mbanugo@yahoo.com",
        username: "pmbanugo",
        timeZone: "Europe/Berlin",
        language: { locale: "en" },
        timeFormat: "h:mma",
      },
      responses: {
        name: { label: "your_name", value: "Peter M" },
        email: { label: "email_address", value: "p.mbanugo@yahoo.com" },
        location: { label: "location" },
        title: { label: "what_is_this_meeting_about" },
        notes: { label: "additional_notes" },
        guests: { label: "additional_guests", value: [] },
        rescheduleReason: { label: "reason_for_reschedule" },
      },
      userFieldsResponses: {},
      attendees: [
        {
          email: "p.mbanugo@yahoo.com",
          name: "Peter M",
          firstName: "",
          lastName: "",
          timeZone: "Europe/Berlin",
          language: { locale: "en" },
        },
      ],
      location: "",
      destinationCalendar: null,
      hideCalendarNotes: false,
      requiresConfirmation: false,
      eventTypeId: 1,
      seatsShowAttendees: true,
      seatsPerTimeSlot: null,
      seatsShowAvailabilityCount: true,
      schedulingType: null,
      uid: "gF3YZj1PWY2o5mBNdY32Vx",
      additionalInformation: {},
    },
    eventNameObject: {
      attendeeName: "Peter M",
      eventType: "15 Min Meeting",
      eventName: null,
      teamName: null,
      host: "Peter M",
      location: "",
      bookingFields: { email: "p.mbanugo@yahoo.com", name: "Peter M", guests: [] },
    },
    hostEmailDisabled: false,
    attendeeEmailDisabled: false,
  },
};
