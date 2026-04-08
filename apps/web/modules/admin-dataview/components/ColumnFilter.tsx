"use client";

import type { FieldDefinition, FieldType } from "@calcom/features/admin-dataview/types";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";
import { Calendar } from "@coss/ui/components/calendar";
import { CheckIcon, FilterIcon, XIcon } from "@coss/ui/icons";
import { endOfDay, format, startOfDay } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
export type ColumnFilterValue =
  | { type: "text"; operator: TextOperator; value: string }
  | { type: "number"; operator: NumberOperator; value: number | null }
  | { type: "boolean"; value: boolean }
  | { type: "enum"; values: string[] }
  | { type: "datetime"; operator: DatetimeOperator; value: string; valueTo?: string }
  | { type: "null"; isNull: boolean };

type TextOperator = "contains" | "equals" | "startsWith" | "endsWith" | "isEmpty" | "isNotEmpty";
type NumberOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
type DatetimeOperator = "before" | "after" | "on" | "between" | "isEmpty" | "isNotEmpty";

const DATETIME_OPERATORS: { value: DatetimeOperator; label: string }[] = [
  { value: "before", label: "before" },
  { value: "after", label: "after" },
  { value: "on", label: "on" },
  { value: "between", label: "between" },
  { value: "isEmpty", label: "is empty" },
  { value: "isNotEmpty", label: "is not empty" },
];

const TEXT_OPERATORS: { value: TextOperator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: "startsWith", label: "starts with" },
  { value: "endsWith", label: "ends with" },
  { value: "isEmpty", label: "is empty" },
  { value: "isNotEmpty", label: "is not empty" },
];

const NUMBER_OPERATORS: { value: NumberOperator; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
];
interface ColumnFilterProps {
  field: FieldDefinition;
  value: ColumnFilterValue | null;
  onChange: (value: ColumnFilterValue | null) => void;
}
export function ColumnFilter({ field, value, onChange }: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = value !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation(); // don't trigger column sort
          }}
          className={classNames(
            "rounded p-0.5 transition-colors",
            isActive
              ? "text-blue-500 hover:text-blue-600"
              : "text-muted opacity-0 hover:text-blue-500 group-hover/header:opacity-100"
          )}
          title={`Filter ${field.label}`}>
          <FilterIcon className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={classNames("p-0", field.type === "datetime" ? "w-auto" : "w-64")}
        onClick={(e) => e.stopPropagation()} // don't trigger sort
      >
        <div className="border-subtle border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-emphasis text-xs font-medium">Filter: {field.label}</span>
            {isActive && (
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-subtle hover:text-error text-xs">
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="p-3">
          <FilterBody
            field={field}
            value={value}
            onChange={(v) => {
              onChange(v);
              // Keep popover open for enum multi-select, close for others
              if (field.type !== "enum") setOpen(false);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
function FilterBody({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: ColumnFilterValue | null;
  onChange: (value: ColumnFilterValue | null) => void;
}) {
  switch (field.type) {
    case "string":
    case "email":
    case "url":
      return (
        <TextFilter
          field={field}
          value={value as Extract<ColumnFilterValue, { type: "text" }> | null}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberFilter
          value={value as Extract<ColumnFilterValue, { type: "number" }> | null}
          onChange={onChange}
        />
      );
    case "boolean":
      return (
        <BooleanFilter
          value={value as Extract<ColumnFilterValue, { type: "boolean" }> | null}
          onChange={onChange}
        />
      );
    case "enum":
      return (
        <EnumFilter
          field={field}
          value={value as Extract<ColumnFilterValue, { type: "enum" }> | null}
          onChange={onChange}
        />
      );
    case "datetime":
      return (
        <DatetimeFilter
          value={value as Extract<ColumnFilterValue, { type: "datetime" }> | null}
          onChange={onChange}
        />
      );
    default:
      return <span className="text-muted text-xs">Filtering not supported for {field.type}</span>;
  }
}
/** Default regex for email fields: strip leading http(s):// and trailing path/query */
const EMAIL_SANITIZE_REGEX = "^https?://|[/\\?#].*$";

function sanitizeInput(value: string, fieldType: FieldType, sanitizeRegex: string | undefined): string {
  let pattern = sanitizeRegex;
  if (!pattern && fieldType === "email") {
    pattern = EMAIL_SANITIZE_REGEX;
  }
  if (!pattern) return value;
  try {
    return value.replace(new RegExp(pattern, "gi"), "");
  } catch {
    return value;
  }
}
function TextFilter({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: Extract<ColumnFilterValue, { type: "text" }> | null;
  onChange: (value: ColumnFilterValue | null) => void;
}) {
  const [operator, setOperator] = useState<TextOperator>(value?.operator ?? "contains");
  const [text, setText] = useState(value?.value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const needsOperand = operator !== "isEmpty" && operator !== "isNotEmpty";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleTextChange = (raw: string) => {
    setText(sanitizeInput(raw, field.type, field.sanitizeRegex));
  };

  const handleApply = () => {
    if (!needsOperand || text.trim()) {
      onChange({ type: "text", operator, value: text.trim() });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <select
        className="border-subtle bg-default text-default h-8 w-full rounded border px-2 text-xs"
        value={operator}
        onChange={(e) => {
          const op = e.target.value as TextOperator;
          setOperator(op);
          if (op === "isEmpty" || op === "isNotEmpty") {
            onChange({ type: "text", operator: op, value: "" });
          }
        }}>
        {TEXT_OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      {needsOperand && (
        <input
          ref={inputRef}
          type="text"
          placeholder="Value…"
          className="border-subtle bg-default text-default placeholder:text-muted h-8 w-full rounded border px-2 text-xs outline-none focus:border-blue-500"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
        />
      )}
      {needsOperand && (
        <button
          onClick={handleApply}
          disabled={!text.trim()}
          className="bg-emphasis text-inverted hover:bg-emphasis/90 disabled:bg-muted h-7 rounded text-xs font-medium disabled:cursor-not-allowed">
          Apply
        </button>
      )}
    </div>
  );
}
function NumberFilter({
  value,
  onChange,
}: {
  value: Extract<ColumnFilterValue, { type: "number" }> | null;
  onChange: (value: ColumnFilterValue | null) => void;
}) {
  const [operator, setOperator] = useState<NumberOperator>(value?.operator ?? "eq");
  const [num, setNum] = useState(value?.value?.toString() ?? "");

  const handleApply = () => {
    const parsed = parseFloat(num);
    if (!isNaN(parsed)) {
      onChange({ type: "number", operator, value: parsed });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <select
        className="border-subtle bg-default text-default h-8 w-full rounded border px-2 text-xs"
        value={operator}
        onChange={(e) => setOperator(e.target.value as NumberOperator)}>
        {NUMBER_OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Value…"
        className="border-subtle bg-default text-default placeholder:text-muted h-8 w-full rounded border px-2 text-xs outline-none focus:border-blue-500"
        value={num}
        onChange={(e) => setNum(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleApply()}
        autoFocus
      />
      <button
        onClick={handleApply}
        disabled={!num || isNaN(parseFloat(num))}
        className="bg-emphasis text-inverted hover:bg-emphasis/90 disabled:bg-muted h-7 rounded text-xs font-medium disabled:cursor-not-allowed">
        Apply
      </button>
    </div>
  );
}
function BooleanFilter({
  value,
  onChange,
}: {
  value: Extract<ColumnFilterValue, { type: "boolean" }> | null;
  onChange: (value: ColumnFilterValue | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {[true, false].map((bool) => {
        const isSelected = value?.value === bool;
        return (
          <button
            key={String(bool)}
            onClick={() => onChange({ type: "boolean", value: bool })}
            className={classNames(
              "flex h-8 items-center justify-between rounded px-2 text-xs transition-colors",
              isSelected ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30" : "hover:bg-subtle text-default"
            )}>
            <span>{String(bool)}</span>
            {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}
function EnumFilter({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: Extract<ColumnFilterValue, { type: "enum" }> | null;
  onChange: (value: ColumnFilterValue | null) => void;
}) {
  const selected = value?.values ?? [];

  const toggle = (enumValue: string) => {
    const next = selected.includes(enumValue)
      ? selected.filter((v) => v !== enumValue)
      : [...selected, enumValue];

    if (next.length === 0) {
      onChange(null);
    } else {
      onChange({ type: "enum", values: next });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {(field.enumValues ?? []).map((enumValue) => {
        const isSelected = selected.includes(enumValue);
        return (
          <button
            key={enumValue}
            onClick={() => toggle(enumValue)}
            className={classNames(
              "flex h-8 items-center justify-between rounded px-2 text-xs transition-colors",
              isSelected ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30" : "hover:bg-subtle text-default"
            )}>
            <span>{enumValue}</span>
            {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}
function DatetimeFilter({
  value,
  onChange,
}: {
  value: Extract<ColumnFilterValue, { type: "datetime" }> | null;
  onChange: (value: ColumnFilterValue | null) => void;
}) {
  const [operator, setOperator] = useState<DatetimeOperator>(value?.operator ?? "before");
  const [date, setDate] = useState<Date | undefined>(value?.value ? new Date(value.value) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(
    value?.valueTo ? new Date(value.valueTo) : undefined
  );

  const needsDate = operator !== "isEmpty" && operator !== "isNotEmpty";
  const isBetween = operator === "between";

  const handleApply = useCallback(() => {
    if (!needsDate) {
      onChange({ type: "datetime", operator, value: "" });
      return;
    }
    if (!date) return;
    if (isBetween && !dateTo) return;
    onChange({
      type: "datetime",
      operator,
      value: date.toISOString(),
      valueTo: isBetween && dateTo ? dateTo.toISOString() : undefined,
    });
  }, [date, dateTo, operator, needsDate, isBetween, onChange]);

  return (
    <div className="flex flex-col gap-2">
      <select
        className="border-subtle bg-default text-default h-8 w-full rounded border px-2 text-xs"
        value={operator}
        onChange={(e) => {
          const op = e.target.value as DatetimeOperator;
          setOperator(op);
          if (op === "isEmpty" || op === "isNotEmpty") {
            onChange({ type: "datetime", operator: op, value: "" });
          }
        }}>
        {DATETIME_OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      {needsDate && (
        <>
          <div className="flex flex-col gap-1">
            {isBetween && <span className="text-muted text-[10px] uppercase tracking-wider">From</span>}
            <div className="text-default text-xs">{date ? format(date, "MMM d, yyyy") : "Pick a date"}</div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => setDate(d ?? undefined)}
              defaultMonth={date}
            />
          </div>
          {isBetween && (
            <div className="flex flex-col gap-1">
              <span className="text-muted text-[10px] uppercase tracking-wider">To</span>
              <div className="text-default text-xs">
                {dateTo ? format(dateTo, "MMM d, yyyy") : "Pick a date"}
              </div>
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(d) => setDateTo(d ?? undefined)}
                defaultMonth={dateTo ?? date}
              />
            </div>
          )}
          <button
            onClick={handleApply}
            disabled={!date || (isBetween && !dateTo)}
            className="bg-emphasis text-inverted hover:bg-emphasis/90 disabled:bg-muted h-7 rounded text-xs font-medium disabled:cursor-not-allowed">
            Apply
          </button>
        </>
      )}
    </div>
  );
}
function NullFilter({
  value,
  onChange,
}: {
  value: Extract<ColumnFilterValue, { type: "null" }> | null;
  onChange: (value: ColumnFilterValue | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {[
        { label: "is set", isNull: false },
        { label: "is empty", isNull: true },
      ].map(({ label, isNull }) => {
        const isSelected = value?.isNull === isNull;
        return (
          <button
            key={label}
            onClick={() => onChange({ type: "null", isNull })}
            className={classNames(
              "flex h-8 items-center justify-between rounded px-2 text-xs transition-colors",
              isSelected ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30" : "hover:bg-subtle text-default"
            )}>
            <span>{label}</span>
            {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
          </button>
        );
      })}
    </div>
  );
}
/** Convert ColumnFilterValue to a Prisma-compatible where fragment */
export function filterToPrismaWhere(column: string, filter: ColumnFilterValue): Record<string, unknown> {
  switch (filter.type) {
    case "text": {
      switch (filter.operator) {
        case "contains":
          return { [column]: { contains: filter.value, mode: "insensitive" } };
        case "equals":
          return { [column]: { equals: filter.value, mode: "insensitive" } };
        case "startsWith":
          return { [column]: { startsWith: filter.value, mode: "insensitive" } };
        case "endsWith":
          return { [column]: { endsWith: filter.value, mode: "insensitive" } };
        case "isEmpty":
          return { OR: [{ [column]: null }, { [column]: "" }] };
        case "isNotEmpty":
          return { NOT: { OR: [{ [column]: null }, { [column]: "" }] } };
      }
      break;
    }
    case "number": {
      const opMap: Record<string, string> = {
        eq: "equals",
        neq: "not",
        gt: "gt",
        gte: "gte",
        lt: "lt",
        lte: "lte",
      };
      return { [column]: { [opMap[filter.operator]]: filter.value } };
    }
    case "boolean":
      return { [column]: filter.value };
    case "enum":
      return { [column]: { in: filter.values } };
    case "datetime": {
      switch (filter.operator) {
        case "before":
          return { [column]: { lt: startOfDay(new Date(filter.value)) } };
        case "after":
          return { [column]: { gt: endOfDay(new Date(filter.value)) } };
        case "on":
          return {
            [column]: {
              gte: startOfDay(new Date(filter.value)),
              lte: endOfDay(new Date(filter.value)),
            },
          };
        case "between":
          return {
            [column]: {
              gte: startOfDay(new Date(filter.value)),
              lte: filter.valueTo ? endOfDay(new Date(filter.valueTo)) : endOfDay(new Date(filter.value)),
            },
          };
        case "isEmpty":
          return { [column]: { equals: null } };
        case "isNotEmpty":
          return { NOT: { [column]: null } };
      }
      break;
    }
    case "null":
      return filter.isNull ? { [column]: null } : { NOT: { [column]: null } };
  }
  return {};
}
