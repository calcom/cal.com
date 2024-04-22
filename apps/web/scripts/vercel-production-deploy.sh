#!/bin/bash

# Only deploy to production
if [ "$VERCEL_ENV" != "production" ]; then exit 0; fi

checkRoute () {
  if [ "$1" != '1' ]; then rm -rf $2; fi
}

# These conditionals are used to remove directories from the build that are not needed in production
# This is to reduce the size of the build and prevent OOM errors
checkRoute "$APP_ROUTER_EVENT_TYPES_ENABLED" app/future/event-types
checkRoute "$APP_ROUTER_SETTINGS_ADMIN_ENABLED" app/future/settings/admin
checkRoute "$APP_ROUTER_APPS_INSTALLED_CATEGORY_ENABLED" app/future/apps/installed
checkRoute "$APP_ROUTER_APPS_SLUG_ENABLED" app/future/apps/\[slug\]
checkRoute "$APP_ROUTER_APPS_SLUG_SETUP_ENABLED" app/future/apps/\[slug\]/setup
checkRoute "$APP_ROUTER_APPS_CATEGORIES_ENABLED" app/future/apps/categories
checkRoute "$APP_ROUTER_APPS_CATEGORIES_CATEGORY_ENABLED" app/future/apps/categories/\[category\]
checkRoute "$APP_ROUTER_WORKFLOWS_ENABLED" app/future/workflows
checkRoute "$APP_ROUTER_SETTINGS_TEAMS_ENABLED" app/future/settings/teams
checkRoute "$APP_ROUTER_GETTING_STARTED_STEP_ENABLED" app/future/getting-started
checkRoute "$APP_ROUTER_APPS_ENABLED" app/future/apps
checkRoute "$APP_ROUTER_BOOKINGS_STATUS_ENABLED" app/future/bookings
checkRoute "$APP_ROUTER_VIDEO_ENABLED" app/future/video
checkRoute "$APP_ROUTER_TEAMS_ENABLED" app/future/teams

# These are routes that don't have and environment variable to enable or disable them
# Will stop removing gradually as we test and confirm that they are working
rm -rf \
   app/future/[user]\
   app/future/auth\
   app/future/booking\
   app/future/connect-and-join\
   app/future/d\
   app/future/enterprise\
   app/future/insights\
   app/future/maintenance\
   app/future/more\
   app/future/org\
   app/future/payment\
   app/future/reschedule\
   app/future/routing-forms\
   app/future/signup\
   app/future/team

exit 1
