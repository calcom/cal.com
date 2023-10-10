import type { TTables } from "../zod";
import { ZBases, ZTables } from "../zod";

export const fetchBases = async (key: string) => {
  const req = await fetch("https://api.airtable.com/v0/meta/bases", {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  const res = await req.json();

  return ZBases.parse(res);
};

export const fetchTables = async (key: string, baseId: string) => {
  const req = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  const res = await req.json();

  return ZTables.parse(res);
};

export const addField = async (
  key: string,
  baseId: string,
  tableId: string,
  data: Record<string, string>
) => {
  const req = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}/fields`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await req.json();
};

export const addRecord = async (
  key: string,
  baseId: string,
  tableId: string,
  data: Record<string, string>
) => {
  const req = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-type": "application/json",
    },
    body: JSON.stringify({
      fields: data,
      typecast: true,
    }),
  });

  return await req.json();
};

interface DeleteRecordOptions {
  key: string;
  baseId: string;
  tableId: string;
  recordId: string;
}

export const deleteRecord = async ({ baseId, key, recordId, tableId }: DeleteRecordOptions) => {
  const req = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-type": "application/json",
    },
  });
  const res = await req.json();
  return { res, req };
};

interface CreateMissingFieldsOptions {
  table: TTables["tables"][number];
  fields: string[];
  token: { personalAccessToken: string };
  baseId: string;
  tableId: string;
}

export const createMissingFields = async ({
  baseId,
  fields,
  table,
  tableId,
  token,
}: CreateMissingFieldsOptions) => {
  const currentFields = new Set(table.fields.map((field) => field.name));
  const fieldsToCreate = new Set<string>();
  for (const field of fields) {
    const hasField = currentFields.has(field);
    if (!hasField) {
      fieldsToCreate.add(field);
    }
  }
  if (fieldsToCreate.size > 0) {
    const createFieldPromise: Promise<any>[] = [];
    fieldsToCreate.forEach((fieldName) => {
      createFieldPromise.push(
        addField(token.personalAccessToken, baseId, tableId, {
          name: fieldName,
          type: "singleLineText",
        })
      );
    });

    await Promise.all(createFieldPromise);
  }
};
