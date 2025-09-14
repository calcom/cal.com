#!/bin/sh

set -e

# yarn install


if [ "$IS_ROLLBACK" = true ]; then
  echo "Skipping db-deploy due to rollback."
else
  echo "Running yarn db-deploy..."
  yarn db-deploy
fi



yarn start
