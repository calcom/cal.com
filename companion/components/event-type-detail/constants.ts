// Constants for Event Type Detail screen

export const bufferTimeOptions = [
  "No buffer time",
  "5 Minutes",
  "10 Minutes",
  "15 Minutes",
  "20 Minutes",
  "30 Minutes",
  "45 Minutes",
  "60 Minutes",
  "90 Minutes",
  "120 Minutes",
];

export const timeUnitOptions = ["Minutes", "Hours", "Days"];

export const frequencyUnitOptions = ["Per day", "Per Month", "Per year"];

export const durationUnitOptions = ["Per day", "Per week", "Per month"];

export const slotIntervalOptions = [
  "Default",
  "5 Minutes",
  "10 Minutes",
  "15 Minutes",
  "20 Minutes",
  "30 Minutes",
  "45 Minutes",
  "60 Minutes",
  "75 Minutes",
  "90 Minutes",
  "105 Minutes",
  "120 Minutes",
];

export const availableDurations = [
  "5 mins",
  "10 mins",
  "15 mins",
  "20 mins",
  "25 mins",
  "30 mins",
  "45 mins",
  "50 mins",
  "60 mins",
  "75 mins",
  "80 mins",
  "90 mins",
  "120 mins",
  "150 mins",
  "180 mins",
  "240 mins",
  "300 mins",
  "360 mins",
  "420 mins",
  "480 mins",
];

export const defaultLocations = [
  { label: "Attendee Address", type: "attendeeInPerson" as const },
  { label: "Organizer Address", type: "inPerson" as const },
  { label: "Link Meeting", type: "link" as const },
  { label: "Attendee Phone Number", type: "phone" as const },
  { label: "Organizer Phone Number", type: "userPhone" as const },
];

export const tabs = [
  { id: "basics", label: "Basics" },
  { id: "availability", label: "Availability" },
  { id: "limits", label: "Limits" },
  { id: "advanced", label: "Advanced" },
  { id: "recurring", label: "Recurring" },
  { id: "apps", label: "Apps" },
  { id: "webhooks", label: "Webhooks" },
  { id: "private-links", label: "Private Links" },
  { id: "seats", label: "Seats" },
  { id: "colors", label: "Colors" },
];
