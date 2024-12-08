#!/bin/bash

checkRoute () {
  if [ "$1" != '1' ]; then rm -rf $2; fi
}

# These conditionals are used to remove directories from the build that are not needed in production
# This is to reduce the size of the build and prevent OOM errors
checkRoute "$APP_ROUTER_EVENT_TYPES_ENABLED" app/future/event-types
checkRoute "$APP_ROUTER_AVAILABILITY_ENABLED" app/future/availability
checkRoute "$APP_ROUTER_APPS_INSTALLED_CATEGORY_ENABLED" app/future/apps/installed
checkRoute "$APP_ROUTER_APPS_SLUG_ENABLED" app/future/apps/\[slug\]
checkRoute "$APP_ROUTER_APPS_SLUG_SETUP_ENABLED" app/future/apps/\[slug\]/setup
checkRoute "$APP_ROUTER_APPS_CATEGORIES_ENABLED" app/future/apps/categories
checkRoute "$APP_ROUTER_APPS_CATEGORIES_CATEGORY_ENABLED" app/future/apps/categories/\[category\]
checkRoute "$APP_ROUTER_AUTH_FORGOT_PASSWORD_ENABLED" app/future/auth/forgot-password
checkRoute "$APP_ROUTER_AUTH_LOGIN_ENABLED" app/future/auth/login
checkRoute "$APP_ROUTER_AUTH_LOGOUT_ENABLED" app/future/auth/logout
checkRoute "$APP_ROUTER_AUTH_NEW_ENABLED" app/future/auth/new
checkRoute "$APP_ROUTER_AUTH_SAML_ENABLED" app/future/auth/saml-idp
checkRoute "$APP_ROUTER_AUTH_ERROR_ENABLED" app/future/auth/error
checkRoute "$APP_ROUTER_AUTH_PLATFORM_ENABLED" app/future/auth/platform
checkRoute "$APP_ROUTER_AUTH_OAUTH2_ENABLED" app/future/auth/oauth2
checkRoute "$APP_ROUTER_WORKFLOWS_ENABLED" app/future/workflows
checkRoute "$APP_ROUTER_GETTING_STARTED_STEP_ENABLED" app/future/getting-started
checkRoute "$APP_ROUTER_BOOKINGS_STATUS_ENABLED" app/future/bookings
checkRoute "$APP_ROUTER_BOOKING_ENABLED" app/future/booking
checkRoute "$APP_ROUTER_VIDEO_ENABLED" app/future/video
checkRoute "$APP_ROUTER_TEAM_ENABLED" app/future/team
checkRoute "$APP_ROUTER_TEAMS_ENABLED" app/future/teams
checkRoute "$APP_ROUTER_MORE_ENABLED" app/future/more
checkRoute "$APP_ROUTER_MAINTENANCE_ENABLED" app/future/maintenance
checkRoute "$APP_ROUTER_UPGRADE_ENABLED" app/future/upgrade
checkRoute "$APP_ROUTER_CONNECT_AND_JOIN_ENABLED" app/future/connect-and-join

# These are routes that don't have and environment variable to enable or disable them
# Will stop removing gradually as we test and confirm that they are working
rm -rf \
   app/future/booking\
   app/future/d\
   app/future/enterprise\
   app/future/insights\
   app/future/org\
   app/future/payment\
   app/future/reschedule\
   app/future/routing-forms\
   app/future/signup\

exit 1
