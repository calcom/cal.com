#!/bin/bash

echo "VERCEL_ENV: $VERCEL_ENV"
echo "APP_ROUTER_EVENT_TYPES_ENABLED: $APP_ROUTER_EVENT_TYPES_ENABLED"

if [ "$VERCEL_ENV" != "production" ]; then exit 0; fi

# These conditionals are used to remove directories from the build that are not needed in production
# This is to reduce the size of the build and prevent OOM errors
if [ "$APP_ROUTER_EVENT_TYPES_ENABLED" != '1' ]; then              rm -rf app/future/event-types; fi
if [ "$APP_ROUTER_SETTINGS_ADMIN_ENABLED" != '1' ]; then           rm -rf app/future/settings/admin; fi
if [ "$APP_ROUTER_APPS_INSTALLED_CATEGORY_ENABLED" != '1' ]; then  rm -rf app/future/apps/installed; fi
if [ "$APP_ROUTER_APPS_SLUG_ENABLED" != '1' ]; then                rm -rf app/future/apps/\[slug\]; fi
if [ "$APP_ROUTER_APPS_SLUG_SETUP_ENABLED" != '1' ]; then          rm -rf app/future/apps/\[slug\]/setup; fi
if [ "$APP_ROUTER_APPS_CATEGORIES_ENABLED" != '1' ]; then          rm -rf app/future/apps/categories; fi
if [ "$APP_ROUTER_APPS_CATEGORIES_CATEGORY_ENABLED" != '1' ]; then rm -rf app/future/apps/categories/\[category\]; fi
if [ "$APP_ROUTER_WORKFLOWS_ENABLED" != '1' ]; then                rm -rf app/future/workflows; fi
if [ "$APP_ROUTER_SETTINGS_TEAMS_ENABLED" != '1' ]; then           rm -rf app/future/settings/teams; fi
if [ "$APP_ROUTER_GETTING_STARTED_STEP_ENABLED" != '1' ]; then     rm -rf app/future/getting-started; fi
if [ "$APP_ROUTER_APPS_ENABLED" != '1' ]; then                     rm -rf app/future/apps; fi
if [ "$APP_ROUTER_BOOKINGS_STATUS_ENABLED" != '1' ]; then          rm -rf app/future/bookings; fi
if [ "$APP_ROUTER_VIDEO_ENABLED" != '1' ]; then                    rm -rf app/future/video; fi
if [ "$APP_ROUTER_TEAMS_ENABLED" != '1' ]; then                    rm -rf app/future/teams; fi

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
   app/future/settings\
   app/future/signup\
   app/future/team

exit 1
