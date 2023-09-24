import { localStorage } from "@calcom/lib/webstorage";

// Define the type for event data
interface EventData {
  title: string;
  desc: string;
  slug: string;
  duration: number;
  price: number;
}
// Function to clear event data from local storage
export const clearEventDataFromLocalStorage = () => {
  try {
    // Check if existing event data exists in local storage
    const existingEventJson = localStorage.getItem("eventData");
    if (existingEventJson) {
      // Remove the event data from local storage
      localStorage.removeItem("eventData");
    }
  } catch (e) {
    // Handle errors, e.g., if local storage is restricted
    console.error("Error clearing event data from local storage:", e);
  }
};
// Function to save event data to local storage
export const saveEventDataToLocalStorage = (eventData: EventData) => {
  try {
    // Check if existing event data exists in local storage
    const existingEventJson = localStorage.getItem("eventData");
    if (existingEventJson) {
      // Clear existing event data from local storage
      clearEventDataFromLocalStorage();
    }

    // Convert the new event data object to JSON and store it in local storage
    const eventJson = JSON.stringify(eventData);
    localStorage.setItem("eventData", eventJson);
  } catch (e) {
    // Handle errors, e.g., if local storage is full or restricted
    console.error("Error saving event data to local storage:", e);
  }
};
export const loadEventDataFromLocalStorage = (): EventData | null => {
  try {
    const eventDataJson = localStorage.getItem("eventData");
    if (eventDataJson) {
      return JSON.parse(eventDataJson);
    }
    return null;
  } catch (e) {
    // Handle errors if needed
    console.error("Error loading event data from local storage:", e);
    return null;
  }
};
