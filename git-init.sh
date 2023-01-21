#!/bin/sh
# If there's a `.gitmodule` file skip this script
[ -f .gitmodules ] && {
  echo ".gitmodules already initializied"
  exit 0
}

./git-setup.sh api website console
