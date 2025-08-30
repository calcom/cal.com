#!/bin/bash

echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

if [[ "$VERCEL_GIT_COMMIT_REF" == "staging" ]] ; then
  # Proceed with the build
    echo "✅ - Build can proceed"
    ./vercel.sh
  exit 1;

else
  # Don't build
  echo "🛑 - Build cancelled"
  exit 0;
fi
