// google-calendar-test.js
const { google } = require("googleapis");
const dayjs = require("dayjs");

/**
 * Fetch events from Google Calendar using an access token
 * @param {string} accessToken - The OAuth2 access token for Google Calendar
 * @param {string} calendarId - The calendar ID to fetch events from (use 'primary' for the user's primary calendar)
 * @param {number} maxResults - Maximum number of events to return
 * @returns {Promise<Array>} - Array of calendar events
 */
async function fetchCalendarEvents(accessToken, calendarId = "primary", maxResults = 10) {
  try {
    // Create OAuth2 client with the access token
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    // Create the calendar client
    const calendar = google.calendar({ version: "v3", auth });

    // Set timeMin to one hour ago
    const timeMin = dayjs().subtract(1, "hour").toISOString();

    // Fetch the events
    const response = await calendar.events.list({
      calendarId,
      maxResults: 12,
      orderBy: "updated",
      showDeleted: true, // Include deleted events just in case
      singleEvents: false, // Set to false if dealing with recurring events potentially
      updatedMin: timeMin,
    });

    console.log(
      `Successfully fetched ${response.data.items?.length || 0} events from calendar ${calendarId}`
    );
    const items = (response.data.items || []).map((item) => ({
      id: item.id,
      summary: item.summary,
      status: item.status,
      updated: item.updated,
    }));
    console.log(items);
    return items;
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error.message);
    if (error.response) {
      console.error("Error details:", error.response.data);
    }
    throw error;
  }
}

/**
 * Main function to run the test
 */
async function main() {
  // Replace with your access token
  const accessToken = process.env.GOOGLE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Please provide an access token in the GOOGLE_ACCESS_TOKEN environment variable");
    process.exit(1);
  }

  try {
    // Fetch events from the primary calendar
    await fetchCalendarEvents(accessToken);

    // Display the events
  } catch (error) {
    console.error("Failed to run test:", error);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

// Export functions for use in other files
module.exports = {
  fetchCalendarEvents,
};
