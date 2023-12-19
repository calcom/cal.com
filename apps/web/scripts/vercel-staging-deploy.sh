#!/bin/bash

if [ "$SKIP_APP_DIR" == "1" ]; then
  echo "Skipping app directory build"
  rm -rf \
    app/\
    components/PageWrapperAppDir.tsx\
    lib/app-providers-app-dir.tsx\
    .next/types/app/
fi
if [ "$VERCEL_ENV" == "preview" ]; then exit 1; else exit 0; fi
