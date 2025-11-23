- We use next-themes
    - It provides useNextTheme hook which does the job of applying a theme for the app reliably. It persists the preference in localStorage and then ensures that the theme is reliably and instantly applied on next page load through its JS snippet.
    - It also provides the support for system theme that allows theme to change automatically when user changes their system theme preference.
- Different Cal.com circumstances
    - Standalone/Direct Booking Pages
        - Here user have the option to force a certain theme(light/dark) or choose system theme.
        - StorageKey: booking-theme${appearanceIdSuffix}
            - appearanceIdSuffix -> :${themeBasis} // themeBasis is usually the username of the organizer.
    - Embeds
        - There could be many embeds on the same origin(https://acme.cal.com) using different themes. e.g. for demo page someone wants to force light theme(as that page doesn't have dark mode) and for landing page someone wants to adapt to system theme as that page supports both modes.
        - Remember that embed theme if provided will take precedence over bookingConfiguredTheme(i.e. theme configured in appearance for booking pages)
        - StorageKey: `embed-theme-${embedNamespace}${appearanceIdSuffix}${embedExplicitlySetThemeSuffix}`
          - (Same Namespace, Same Organizer but different themes would still work seamless and not cause theme flicker)
          - `embedExplicitlySetThemeSuffix` -> `:${embedTheme}` // `embedTheme` is the theme explicitly configured for the embed)
    - Non Booking Pages(which would be all dashboard pages)
        - Here also, user has the option to force a certain theme(light/dark) or choose system theme.
        - StorageKey: app-theme


Also, see inline comments in getThemeProviderProps.ts for more details.