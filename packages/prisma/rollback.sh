#!/bin/bash

set -e

find_latest_migration() {
    ls -1d ./migrations/*/ | sort -r | head -n 1
}

to_lowercase() {
    echo "$1" | tr '[:upper:]' '[:lower:]'
}

remove_directory=false

while getopts ":d" opt; do
  case ${opt} in
    d )
      remove_directory=true
      ;;
    \? )
      echo "Invalid option: $OPTARG" 1>&2
      exit 1
      ;;
  esac
done
shift $((OPTIND -1))

latest_migration=$(find_latest_migration)

if [ -z "$latest_migration" ]; then
    echo "No migrations found in ./migrations directory."
    exit 1
fi

migration_name=$(basename "$latest_migration")

echo "Latest migration found: $migration_name"

if [ ! -f "${latest_migration}down.sql" ]; then
    echo "down.sql not found for the latest migration."
    exit 1
fi

read -p "Are you sure you want to run the down migration for $migration_name? (Y/N): " confirmation

if [ "$(to_lowercase "$confirmation")" != "y" ]; then
    echo "Rollback cancelled."
    exit 0
fi

# Run the down migration
echo "Running down migration for $migration_name..."
npx prisma db execute --file "${latest_migration}down.sql" --schema ./schema.prisma

echo "Attempting to mark migration '$migration_name' as rolled back..."

# Delete the migration
prisma db execute --stdin <<SQL
DELETE FROM "_prisma_migrations"
WHERE migration_name = '$migration_name';
SQL

if [ $? -eq 0 ]; then
    echo "Down migration completed successfully."

    if [ "$remove_directory" = true ]; then
        echo "Removing migration directory..."
        rm -rf "$latest_migration"
        if [ $? -eq 0 ]; then
            echo "Migration directory removed successfully."
        else
            echo "Error occurred while removing the migration directory."
            exit 1
        fi
    fi
else
    echo "Error occurred while running the down migration."
    exit 1
fi

echo "Current migration status:"
# ignore exit code 1 when there is pending migration
npx prisma migrate status || true
