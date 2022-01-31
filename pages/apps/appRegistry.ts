// TODO: maybe we wanna do this dynamically later based on folder structure
export function appRegistry() {
  return [
    {
      name: "Zoom",
      slug: "zoom", // needs to be the same as the folder name
      category: "Video Conferencing",
      description:
        "Zoom is the most popular video conferencing platform, joinable on the web or via desktop/mobile apps.",
      logo: "/apps/zoom.svg",
      publisher: "Cal.com",
      url: "https://zoom.us/",
      verified: true,
      rating: 4.3, // TODO: placeholder for now, pull this from TrustPilot or G2
      reviews: 69, // TODO: placeholder for now, pull this from TrustPilot or G2
    },
    {
      name: "Cal Video",
      slug: "cal-video",
      category: "Video Conferencing",
      description:
        "Cal Video is the in-house web-based video conferencing platform powered by Daily.co, which is minimalistic and lightweight, but has most of the features you need.",
      logo: "/apps/daily.svg",
      publisher: "Cal.com",
      url: "https://cal.com",
      verified: true,
      rating: 4.8,
      trending: true,
      reviews: 69,
    },
    {
      name: "Google Meet",
      slug: "google-meet",
      category: "Video Conferencing",
      description:
        "Google Meet is Google's web-based video conferencing platform, designed to compete with major conferencing platforms.",
      logo: "https://cdn.iconscout.com/icon/free/png-256/google-meet-2923654-2416657.png",
      rating: 4.4,
      trending: true,
      reviews: 69,
    },
    {
      name: "Stripe",
      slug: "stripe",
      category: "Payments",
      description: "Stripe is the world's leading payment provider. Start charging for your bookings today.",
      logo: "/apps/stripe.svg",
      rating: 4.6,
      trending: true,
      reviews: 69,
    },
    {
      name: "Google Calendar",
      slug: "google-calendar",
      category: "Calendar",
      description:
        "Google Calendar is the most popular calendar platform for personal and business calendars.",
      logo: "/apps/google-calendar.svg",
      rating: 4.9,
      reviews: 69,
    },
    {
      name: "Microsoft 365/Outlook Calendar",
      slug: "microsoft-365",
      category: "Calendar",
      description:
        "Microsoft 365 calendars for business users, and Outlook is a popular calendar platform for personal users.",
      logo: "/apps/outlook.svg",
      rating: 4.2,
      reviews: 69,
    },
    {
      name: "CalDAV",
      slug: "caldav",
      category: "Calendar",
      description: "CalDAV is an open calendar standard which connects to virtually every calendar.",
      logo: "/apps/caldav.svg",
      rating: 3.6,
      reviews: 69,
    },
    {
      name: "iCloud Calendar",
      slug: "icloud-calendar",
      category: "Calendar",
      description:
        "iCloud Calendar is Apple's calendar platform for users of iCloud, and is used in the Apple Calendar app on iOS and macOS.",
      logo: "/apps/apple-calendar.svg",
      rating: 3.8,
      reviews: 69,
    },
  ];
}
