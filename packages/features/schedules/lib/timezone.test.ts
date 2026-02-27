import dayjs from "@calcom/dayjs";
import getSlots from "./slots";

describe("Timezone Slot Alignment", () => {
  beforeAll(() => {
    vi.setSystemTime(dayjs.utc("2023-12-31T00:00:00Z").toDate());
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("aligns slots to the hour in Asia/Kolkata (UTC+5:30) when availability starts at half hour in that timezone", async () => {
    // Availability: 9:00 UTC - 11:00 UTC
    // In IST (UTC+5:30): 14:30 - 16:30
    // Start is aligned to UTC hour (9:00), but NOT aligned to IST hour (14:30)
    const startUTC = dayjs.utc("2024-01-01T09:00:00Z");
    const endUTC = dayjs.utc("2024-01-01T11:00:00Z");
    
    // Viewer timezone: Asia/Kolkata
    const timeZone = "Asia/Kolkata";
    
    const slots = getSlots({
      inviteeDate: dayjs.tz("2024-01-01T00:00:00", timeZone),
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      dateRanges: [{ start: startUTC, end: endUTC }],
      timeZone: timeZone,
      offsetStart: 0,
    });

    // If the fix is working, the logic converts slotStartTime to IST (14:30), 
    // detects it's not aligned to interval (60), and rounds it up to 15:00 IST.
    
    // 15:00 IST is 09:30 UTC.
    // 15:00 IST to 16:00 IST (1 hour) fits in 14:30-16:30.
    
    // If the fix is NOT working (calculation in UTC):
    // 09:00 UTC. Aligned to interval (60) in UTC. No rounding.
    // Returns 09:00 UTC = 14:30 IST.
    
    console.log("Slots found:", slots.map(s => s.time.tz(timeZone).format()));

    // We expect the fix to enforce alignment to the viewer's timezone
    expect(slots.length).toBeGreaterThan(0);
    const firstSlot = slots[0].time.tz(timeZone);
    
    expect(firstSlot.minute()).toBe(0);
    expect(firstSlot.hour()).toBe(15);
  });
});
