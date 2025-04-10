# Implement Skeleton loader for embed

- Both React and Core embed should support skeleton loader
- Skeleton loader should be shown until the embed is loaded instead of the default loader of rectangle rotating loader
- We could introduce new property data-cal-page-type="user-event"|"user-profile"|"team-event"|"team-profile"|"user-booking-success|"team-booking-success"
  - We would use the skeleton loader only for "team-event" and "user-event" at the moment and rest would use the default loader
  - "team-event" and "user-event" both would use the same skeleton loader right now.
- We need to implement the skeleton loader for all types of embeds. There are only two major types of embeds
  - inline -> Used by inline embed
  - modal -> Used by element click as well as floating button
- Make a skeleton from packages/embeds/embed-core/src/skeleton.tsx