export function getApps() {
  return [
    {
      name: "Zoom",
      category: "Video Conferencing",
      description:
        "Zoom is the most popular video conferencing platform, joinable on the web or via desktop/mobile apps.",
      logo: "/integrations/zoom.svg",
      rating: 4.3,
    },
    {
      name: "Daily.co",
      category: "Video Conferencing",
      description:
        "Daily is a web-based video conferencing platform, which is minimalistic and lightweight, but has most of the features you need.",
      logo: "/integrations/daily.svg",
      rating: 4.8,
      trending: true,
    },
    {
      name: "Google Meet",
      category: "Video Conferencing",
      description:
        "Google Meet is Google's web-based video conferencing platform, designed to compete with major conferencing platforms.",
      logo: "https://cdn.iconscout.com/icon/free/png-256/google-meet-2923654-2416657.png",
      rating: 4.4,
      trending: true,
    },
    {
      name: "Stripe",
      category: "Payments",
      description: "Stripe is the world's leading payment provider. Start charging for your bookings today.",
      logo: "/integrations/stripe.svg",
      rating: 4.6,
      trending: true,
    },
    {
      name: "Google Calendar",
      category: "Calendar",
      description:
        "Google Calendar is the most popular calendar platform for personal and business calendars.",
      logo: "/integrations/google-calendar.svg",
      rating: 4.9,
    },
    {
      name: "Microsoft 365/Outlook Calendar",
      category: "Calendar",
      description:
        "Microsoft 365 calendars for business users, and Outlook is a popular calendar platform for personal users.",
      logo: "/integrations/outlook.svg",
      rating: 4.2,
    },
    {
      name: "CalDAV",
      category: "Calendar",
      description: "CalDAV is an open calendar standard which connects to virtually every calendar.",
      logo: "/integrations/caldav.svg",
      rating: 3.6,
    },
    {
      name: "iCloud Calendar",
      category: "Calendar",
      description:
        "iCloud Calendar is Apple's calendar platform for users of iCloud, and is used in the Apple Calendar app on iOS and macOS.",
      logo: "/integrations/apple-calendar.svg",
      rating: 3.8,
    },
  ];
}
