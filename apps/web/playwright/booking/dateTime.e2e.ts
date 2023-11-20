import { loginUser } from "../fixtures/regularBookings";
import { test } from "../lib/fixtures";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const today = new Date();

function findDaysForTest(today: Date) {
  const daysForTest: Date[] = [];
  let currentDay = today.getDate() + 1;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  if (currentDay + 3 > endOfMonth) {
    const firstDateOfNextMonth = new Date(today);
    firstDateOfNextMonth.setMonth(firstDateOfNextMonth.getMonth() + 2, 1);
    currentDay = firstDateOfNextMonth.getDate() + 1;

    while (daysForTest.length < 3) {
      currentDay++;

      const dateForTest = new Date(
        firstDateOfNextMonth.getFullYear(),
        firstDateOfNextMonth.getMonth(),
        currentDay
      );
      daysForTest.push(dateForTest);
    }
    return daysForTest;
  } else {
    while (daysForTest.length < 3) {
      currentDay++;

      const dateForTest = new Date(today.getFullYear(), today.getMonth(), currentDay);
      daysForTest.push(dateForTest);
    }
    return daysForTest;
  }
}

test.describe("Test the date behavior in specific cases", () => {
  test.beforeEach(async ({ page, users, bookingPage }) => {
    await loginUser(users);
    await bookingPage.makeEveryDayAvailable();
    await page.goto("/event-types");
  });
  test("test dates for booking", async ({ page, bookingPage }) => {
    const daysForTest = findDaysForTest(today);

    for (const day of daysForTest) {
      await bookingPage.goToEventType("30 min");
      const eventTypePage = await bookingPage.previewEventType();

      const currentDayAbbrev = days[day.getDay()];
      const currentMonthAbbrev = months[day.getMonth()];
      const currentDay = day.getDate();
      const currentPage = await bookingPage.createBookingForEachDate({
        bookingPage: eventTypePage,
        date: currentDay.toString(),
        timezone: "America/New York",
        isNextMonth: false,
      });
      const roleName = `${currentDayAbbrev}, ${currentDay} ${currentMonthAbbrev} 9:00am - 9:30am`;
      await bookingPage.assertBookingDates(currentPage, roleName);
      await page.goto("/event-types");
    }
  });
  test("test dates near end of month for booking", async ({ page, bookingPage }) => {
    const dayNearEnd = new Date(today.getFullYear(), 9, 28);
    const daysForTest = findDaysForTest(dayNearEnd);

    for (const day of daysForTest) {
      await bookingPage.goToEventType("30 min");
      const eventTypePage = await bookingPage.previewEventType();

      const currentDayAbbrev = days[day.getDay()];
      const currentMonthAbbrev = months[day.getMonth()];
      const currentDay = day.getDate();
      const currentPage = await bookingPage.createBookingForEachDate({
        bookingPage: eventTypePage,
        date: currentDay.toString(),
        timezone: "America/New York",
        isNextMonth: true,
      });
      const roleName = `${currentDayAbbrev}, ${currentDay} ${currentMonthAbbrev} 9:00am - 9:30am`;
      await bookingPage.assertBookingDates(currentPage, roleName);
      await page.goto("/event-types");
    }
  });
});
