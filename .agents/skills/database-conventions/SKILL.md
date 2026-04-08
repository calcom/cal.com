---
name: database-conventions
description: Conventions and guidelines for database schema changes. Use when creating new Prisma models/tables or modifying the database schema.
version: 1.0.0
---

# Database Conventions

Guidelines to follow when making changes to the database schema (`packages/prisma/schema.prisma`).

## Auditing Fields

All new database tables **must** include the following columns for auditing purposes:

- `createdById` - References the user who created the record
- `updatedById` - References the user who last updated the record

These fields help track who created and modified records, which is essential for auditing and debugging.

### Example

When adding a new model to `schema.prisma`, include these fields:

```prisma
model ExampleModel {
  id           Int      @id @default(autoincrement())
  // ... other fields ...

  createdById  Int?
  createdBy    User?    @relation("ExampleModelCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  updatedById  Int?
  updatedBy    User?    @relation("ExampleModelUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Checklist

1. Add `createdById` and `updatedById` columns to every new table
2. Set up proper foreign key relations to the `User` model
3. Ensure application code populates these fields when creating/updating records
