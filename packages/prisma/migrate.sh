#!/bin/bash

# Run the prisma migrate dev command to generate up migration and capture its output
output=$(npx prisma migrate dev --create-only 2>&1 | tee /dev/tty)

migration_name=$(echo "$output" | sed -n 's/.*following migration without applying it \(.*\)/\1/p')

if [ -z "$migration_name" ]; then
    echo "Failed to extract migration name from the output."
    echo "Prisma output was: $output"
    exit 1
fi

migration_dir="./migrations/$migration_name"

if [ ! -d "$migration_dir" ]; then
    echo "Migration directory not found: $migration_dir"
    exit 1
fi

# Generate the down migration SQL and save it in the migration directory
npx prisma migrate diff --from-schema-datamodel ./schema.prisma --to-schema-datasource ./schema.prisma --script > "$migration_dir/down.sql"

echo "Up and down migrations created successfully in $migration_dir"

echo "Applying migration to DB in dev env"
npx prisma migrate dev

echo "Migration applied successfully."
