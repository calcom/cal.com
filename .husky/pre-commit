#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

yarn lint-staged

yarn app-store:build && git add packages/app-store/*.generated.*
