#!/bin/bash

if [ "$SKIP_APP_DIR" == "1" ]; then
  echo "Skipping app directory build"
  rm -rf \
    apps/web/app/\
    apps/web/components/PageWrapperAppDir.tsx\
    apps/web/lib/app-providers-app-dir.tsx\
    apps/web/.next/types/app/
fi
if [ "$VERCEL_ENV" == "preview" ]; then exit 1; else exit 0; fi
