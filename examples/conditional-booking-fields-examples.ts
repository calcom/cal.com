/**
 * Example: Conditional Booking Fields Configuration
 * 
 * This example demonstrates how to use conditional fields to create
 * a dynamic booking form that asks follow-up questions based on user responses.
 */

export const exampleConditionalBookingFields = [
  // Parent question: How did you hear about us?
  {
    type: "radio",
    slug: "how-did-you-hear",
    label: "How did you hear about us?",
    required: true,
    options: ["Web", "Print", "Social Media", "Personal Reference", "Other"],
  },

  // Conditional field 1: Show when "Web" is selected
  {
    type: "text",
    slug: "source-website",
    label: "Which website?",
    placeholder: "e.g., google.com, cal.com",
    required: false,
    conditionalOn: {
      parentFieldName: "how-did-you-hear",
      showWhenParentValues: "Web",
    },
  },

  // Conditional field 2: Show when "Social Media" is selected
  {
    type: "select",
    slug: "social-media-platform",
    label: "Which social media platform?",
    required: false,
    options: ["Twitter/X", "Facebook", "LinkedIn", "Instagram", "Mastodon", "TikTok", "Other"],
    conditionalOn: {
      parentFieldName: "how-did-you-hear",
      showWhenParentValues: "Social Media",
    },
  },

  // Conditional field 3: Show when "Personal Reference" is selected
  {
    type: "text",
    slug: "referrer-name",
    label: "Who referred you?",
    placeholder: "Name of the person who referred you",
    required: false,
    conditionalOn: {
      parentFieldName: "how-did-you-hear",
      showWhenParentValues: "Personal Reference",
    },
  },

  // Conditional field 4: Show when "Other" is selected
  {
    type: "textarea",
    slug: "other-source-details",
    label: "Please specify",
    placeholder: "Tell us how you heard about us",
    required: false,
    conditionalOn: {
      parentFieldName: "how-did-you-hear",
      showWhenParentValues: "Other",
    },
  },
];

/**
 * Example: Multi-step Service Selection
 * 
 * This example shows how to create a multi-step form for service selection
 * with different questions based on the service type.
 */
export const serviceSelectionBookingFields = [
  // Step 1: Service type selection
  {
    type: "radio",
    slug: "service-type",
    label: "What type of service do you need?",
    required: true,
    options: ["Consultation", "Training", "Support", "Custom Development"],
  },

  // For Consultation
  {
    type: "select",
    slug: "consultation-topic",
    label: "What would you like to discuss?",
    required: true,
    options: [
      "Product Demo",
      "Implementation Planning",
      "Best Practices",
      "Technical Architecture",
      "Other",
    ],
    conditionalOn: {
      parentFieldName: "service-type",
      showWhenParentValues: "Consultation",
    },
  },

  // For Training
  {
    type: "select",
    slug: "training-level",
    label: "What is your team's experience level?",
    required: true,
    options: ["Beginner", "Intermediate", "Advanced"],
    conditionalOn: {
      parentFieldName: "service-type",
      showWhenParentValues: "Training",
    },
  },
  {
    type: "number",
    slug: "training-attendees",
    label: "How many people will attend?",
    placeholder: "Number of attendees",
    required: true,
    conditionalOn: {
      parentFieldName: "service-type",
      showWhenParentValues: "Training",
    },
  },

  // For Support
  {
    type: "select",
    slug: "support-urgency",
    label: "How urgent is this issue?",
    required: true,
    options: ["Critical - System Down", "High - Major Feature Broken", "Medium", "Low"],
    conditionalOn: {
      parentFieldName: "service-type",
      showWhenParentValues: "Support",
    },
  },

  // For Custom Development
  {
    type: "textarea",
    slug: "development-requirements",
    label: "Please describe your requirements",
    placeholder: "Provide as much detail as possible about what you need",
    required: true,
    conditionalOn: {
      parentFieldName: "service-type",
      showWhenParentValues: "Custom Development",
    },
  },
  {
    type: "select",
    slug: "development-timeline",
    label: "What is your desired timeline?",
    required: true,
    options: ["ASAP", "1-3 months", "3-6 months", "6+ months", "Flexible"],
    conditionalOn: {
      parentFieldName: "service-type",
      showWhenParentValues: "Custom Development",
    },
  },
];

/**
 * Example: Contact Preference with Multiple Triggers
 * 
 * This example shows a field that becomes visible based on multiple parent values.
 */
export const contactPreferenceBookingFields = [
  {
    type: "checkbox",
    slug: "contact-methods",
    label: "How can we contact you?",
    required: true,
    options: ["Email", "Phone Call", "SMS", "WhatsApp", "Video Call"],
  },

  // This field shows up if user selects any phone-based contact method
  {
    type: "phone",
    slug: "contact-phone",
    label: "Your phone number",
    required: true,
    conditionalOn: {
      parentFieldName: "contact-methods",
      showWhenParentValues: ["Phone Call", "SMS", "WhatsApp"],
    },
  },
];

/**
 * Example: Event-specific Questions
 * 
 * This example shows how to ask different questions based on event type.
 */
export const eventTypeBookingFields = [
  {
    type: "radio",
    slug: "meeting-type",
    label: "What type of meeting is this?",
    required: true,
    options: ["Initial Consultation", "Follow-up", "Workshop", "Emergency"],
  },

  // For initial consultation
  {
    type: "textarea",
    slug: "consultation-goals",
    label: "What are your main goals for this consultation?",
    required: true,
    conditionalOn: {
      parentFieldName: "meeting-type",
      showWhenParentValues: "Initial Consultation",
    },
  },

  // For follow-up
  {
    type: "text",
    slug: "previous-meeting-date",
    label: "When was your previous meeting?",
    placeholder: "e.g., Last week, November 15th",
    required: false,
    conditionalOn: {
      parentFieldName: "meeting-type",
      showWhenParentValues: "Follow-up",
    },
  },
  {
    type: "textarea",
    slug: "followup-topics",
    label: "What would you like to discuss in this follow-up?",
    required: true,
    conditionalOn: {
      parentFieldName: "meeting-type",
      showWhenParentValues: "Follow-up",
    },
  },

  // For workshop
  {
    type: "number",
    slug: "workshop-participants",
    label: "How many participants will attend?",
    required: true,
    conditionalOn: {
      parentFieldName: "meeting-type",
      showWhenParentValues: "Workshop",
    },
  },

  // For emergency
  {
    type: "textarea",
    slug: "emergency-description",
    label: "Please describe the emergency situation",
    required: true,
    conditionalOn: {
      parentFieldName: "meeting-type",
      showWhenParentValues: "Emergency",
    },
  },
];

/**
 * Platform API Example
 * 
 * How to create an event type with conditional fields using the Platform API
 */
export async function createEventTypeWithConditionalFields(apiClient: any) {
  return await apiClient.eventTypes.create({
    title: "Product Demo",
    slug: "product-demo",
    length: 30,
    bookingFields: exampleConditionalBookingFields,
  });
}
