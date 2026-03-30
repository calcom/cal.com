"use client";

import Link from "next/link";

import type { FieldDefinition, FieldType } from "@calcom/features/admin-dataview/types";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { ExternalLinkIcon } from "@coss/ui/icons";

interface DataCellProps {
  field: FieldDefinition;
  value: unknown;
  /** Pre-built href for relation links (includes nav stack in query params) */
  relationHref?: string;
}

function formatValue(value: unknown, type: FieldType): string {
  if (value === null || value === undefined) return "—";
  if (type === "datetime") {
    const d = new Date(value as string);
    return isNaN(d.getTime())
      ? String(value)
      : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  }
  if (type === "boolean") return value ? "true" : "false";
  if (type === "json") return JSON.stringify(value).slice(0, 100);
  return String(value);
}

export function DataCell({ field, value, relationHref }: DataCellProps) {
  // Relation fields
  if (field.relation && value != null && typeof value === "object") {
    const rel = value as {
      _relation?: boolean;
      _many?: boolean;
      _display?: string;
    };

    if (rel._relation) {
      const display = rel._display ?? "—";

      if (rel._many) {
        return (
          <div className="flex h-full items-center gap-1.5 px-2 py-1.5 text-xs">
            <Badge variant="gray" size="sm">
              {display}
            </Badge>
          </div>
        );
      }

      if (relationHref) {
        return (
          <div className="flex h-full items-center gap-1 px-2 py-1.5 text-xs">
            <Link
              href={relationHref}
              className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400">
              {display}
            </Link>
            <ExternalLinkIcon className="text-muted h-2.5 w-2.5 shrink-0" />
          </div>
        );
      }

      return (
        <div className="flex h-full items-center px-2 py-1.5 text-xs">
          <span className="text-default truncate">{display}</span>
        </div>
      );
    }
  }

  // Null relation
  if (field.relation && (value === null || value === undefined)) {
    return (
      <div className="flex h-full items-center px-2 py-1.5 text-xs">
        <span className="text-muted italic">—</span>
      </div>
    );
  }

  // Null values
  if (value === null || value === undefined) {
    return (
      <div className="flex h-full items-center px-2 py-1.5 text-xs">
        <span className="text-muted italic">null</span>
      </div>
    );
  }

  // Scalar display
  const displayValue = formatValue(value, field.type);

  return (
    <div className="flex h-full items-center px-2 py-1.5 text-xs">
      {field.type === "boolean" ? (
        <Badge variant={value ? "green" : "gray"} size="sm">
          {displayValue}
        </Badge>
      ) : field.type === "enum" ? (
        <Badge variant="blue" size="sm">
          {displayValue}
        </Badge>
      ) : (
        <span
          className={classNames(
            "truncate",
            field.isPrimary && "font-mono font-semibold"
          )}>
          {displayValue}
        </span>
      )}
    </div>
  );
}
