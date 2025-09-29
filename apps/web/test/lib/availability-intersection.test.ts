import { describe, expect, test, vi } from "vitest";
import { createBookingScenario, getOrganizer, getScenarioData, TestData } from "../utils/bookingScenario/bookingScenario";
import { getAvailableSlotsService } from "@calcom/lib/di/containers/AvailableSlots";
import { setupAndTeardown } from "./getSchedule/setupAndTeardown";
import dayjs from "@calcom/dayjs";

describe("User Availability Intersection Tests", () => {
  const availableSlotsService = getAvailableSlotsService();
  // console.log({availableSlotsService})
  setupAndTeardown();

  test("should show intersection of session user and organizer availability", async () => {
    vi.setSystemTime("2024-05-20T00:00:00Z");

    const organizer = getOrganizer({
      name: "aayush",
      email: "aayush@example.com",
      id: 101,
      username: "aayush",
      defaultScheduleId: 1,
      credentials: [],
      selectedCalendars: [],
      schedules: [
        {
          id: 1,
          name: "Working Time",
          availability: [
            {
              days: [1, 2, 3, 4, 5, 6, 7], // Monday to Sunday
              startTime: new Date("1970-01-01T10:00:00.000Z"), // 10 AM
              endTime: new Date("1970-01-01T14:00:00.000Z"),   // 2 PM
              date: null,
            },
          ],
          timeZone: "Asia/Kolkata",
        },
      ],
    });

    const sessionUser = {
      ...TestData.users.example,
      id: 102,
      email: "sujal@example.com",
      username: "sujal",
      name: "sujal",
      defaultScheduleId: 2,
      timeZone: "Asia/Kolkata",
      schedules: [
        {
          id: 2,
          name: "My Available Time",
          availability: [
            {
              days: [1, 2, 3, 4, 5, 6, 7], // Monday to Sunday
              startTime: new Date("1970-01-01T08:00:00.000Z"), // 8 AM
              endTime: new Date("1970-01-01T11:00:00.000Z"),   // 11 AM
              date: null,
            },
          ],
          timeZone: "Asia/Kolkata",
        },
      ],
    };

    const scenarioData = getScenarioData({
      eventTypes: [
        {
          id: 1,
          slotInterval: undefined,
          length: 30,
          users: [{ id: 101 }],
          title: "Meeting with Aayush",
          slug: "meeting-with-aayush",
        },
      ],
      users: [organizer, sessionUser],
      bookings: [
        {
          id: 1,
          uid: "test-reschedule-uid",
          eventTypeId: 1,
          title: "Existing Meeting",
          startTime: new Date("2024-05-21T05:00:00.000Z").toString(), // 10:30 AM IST
          endTime: new Date("2024-05-21T05:30:00.000Z").toString(),   // 11:00 AM IST
          attendees: [
            {
              email: "sujal@example.com",
              bookingSeat: {
                referenceUid: "test-reschedule-uid",
                data: "some-data",
              }
            },
            {
              email: "aayush@example.com",
              bookingSeat: {
                referenceUid: "test-reschedule-uid",
                data: "some-data",
              }
            },
          ],
          status: "ACCEPTED",
        },
      ],
    });

    await createBookingScenario(scenarioData);

    // Get slots for organizer's event with reschedule context
    const slots = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: "2024-05-21T00:00:00.000Z",
        endTime: "2024-05-22T23:59:59.999Z",
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        usernameList: ["aayush"],
        orgSlug: undefined,
        rescheduleUid: "test-reschedule-uid",
        email: "sujal@example.com", // Current user trying to reschedule
      },
    });

    // The intersection should be 10 AM to 11 AM (1 hour)
    // Since organizer is available 10 AM - 2 PM and session user is available 8 AM - 11 AM
    // The intersection should only show slots between 10 AM - 11 AM

    const slotsForDate = slots.slots["2024-05-21"] || [];
    
    // Convert UTC times to IST for proper comparison
    // Slots are in UTC, need to convert to IST (UTC + 5:30)
    const intersectionSlots = slotsForDate.filter(slot => {
      const slotTime = dayjs(slot.time).utc().add(5.5, 'hours'); // Convert UTC to IST
      const slotHour = slotTime.hour();
      // In IST, 10 AM - 11 AM should be available (intersection window)
      return slotHour >= 10 && slotHour < 11;
    });
    
    // Check that no slots exist outside the intersection  
    const outsideIntersectionSlots = slotsForDate.filter(slot => {
      const slotTime = dayjs(slot.time).utc().add(5.5, 'hours'); // Convert UTC to IST
      const slotHour = slotTime.hour();
      // No slots should be available before 10 AM or after 11 AM in IST
      return slotHour < 10 || slotHour >= 11;
    });
    // console.log({ 
    //   slotsForDate: slotsForDate.map(s => ({ 
    //     utc: s.time, 
    //     ist: dayjs(s.time).utc().add(5.5, 'hours').format('YYYY-MM-DD HH:mm:ss')
    //   })), 
    //   outsideIntersectionSlots: outsideIntersectionSlots.length, 
    //   intersectionSlots: intersectionSlots.length 
    // });

    expect(intersectionSlots.length).toBeGreaterThan(0);
    expect(outsideIntersectionSlots.length).toBe(0);

    console.log("Intersection slots found:", intersectionSlots.map(s => s.time));
    console.log("Total slots (should only be in intersection):", slotsForDate.length);
  });

  test("should show organizer's full availability when no session user", async () => {
    vi.setSystemTime("2024-05-20T00:00:00Z");

    const organizer = getOrganizer({
      name: "aayush",
      email: "aayush@example.com",
      id: 101,
      username: "aayush",
      defaultScheduleId: 1,
      credentials: [],
      selectedCalendars: [],
      schedules: [
        {
          id: 1,
          name: "Working Time",
          availability: [
            {
              days: [1, 2, 3, 4, 5, 6, 7], // Monday to Sunday
              startTime: new Date("1970-01-01T10:00:00.000Z"), // 10 AM
              endTime: new Date("1970-01-01T14:00:00.000Z"),   // 2 PM
              date: null,
            },
          ],
          timeZone: "Asia/Kolkata",
        },
      ],
    });

    const scenarioData = getScenarioData({
      eventTypes: [
        {
          id: 1,
          slotInterval: undefined,
          length: 30,
          users: [{ id: 101 }],
          title: "Meeting with Aayush",
          slug: "meeting-with-aayush",
        },
      ],
      users: [organizer],
    });

    await createBookingScenario(scenarioData);

    const slots = await availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: 1,
        eventTypeSlug: "",
        startTime: "2024-05-21T00:00:00.000Z",
        endTime: "2024-05-22T23:59:59.999Z",
        timeZone: "Asia/Kolkata",
        isTeamEvent: false,
        usernameList: ["aayush"],
        orgSlug: undefined,
      },
    });

    const slotsForDate = slots.slots["2024-05-21"] || [];
    
    // Should show full organizer availability (10 AM - 2 PM IST)
    // Convert UTC to IST for comparison
    const availableSlots = slotsForDate.filter(slot => {
      const slotTime = dayjs(slot.time).utc().add(5.5, 'hours'); // Convert UTC to IST
      const slotHour = slotTime.hour();
      return slotHour >= 10 && slotHour < 14; // 10 AM - 2 PM IST
    });

    expect(availableSlots.length).toBeGreaterThan(0);
    
    // Should have slots throughout the full availability window
    const morningSlots = slotsForDate.filter(slot => {
      const slotTime = dayjs(slot.time).utc().add(5.5, 'hours'); // Convert UTC to IST
      const slotHour = slotTime.hour();
      return slotHour >= 10 && slotHour < 12; // 10 AM - 12 PM IST
    });

    const afternoonSlots = slotsForDate.filter(slot => {
      const slotTime = dayjs(slot.time).utc().add(5.5, 'hours'); // Convert UTC to IST
      const slotHour = slotTime.hour();
      return slotHour >= 12 && slotHour < 14; // 12 PM - 2 PM IST
    });

    expect(morningSlots.length).toBeGreaterThan(0);
    expect(afternoonSlots.length).toBeGreaterThan(0);

    console.log("Full organizer availability slots:", slotsForDate.length);
  });
});