/**
 * FieldLibrary.tsx
 *
 * Left panel or sheet: displays available field types grouped by category.
 * Clicking or dragging a field type calls onAddField(type).
 */
import {
  Type,
  Mail,
  Phone,
  AlignLeft,
  Hash,
  MapPin,
  Link,
  MailPlus,
  ChevronDown,
  ListChecks,
  Circle,
  CheckSquare,
  ToggleLeft,
  Minus,
  Heading,
  CalendarDays,
  FileText,
  GripVertical,
  Calendar,
  Clock,
} from "lucide-react";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { FIELD_LIBRARY_CONFIG, type UIFieldType } from "./builderTypes";

const ICON_MAP: Record<string, React.ElementType> = {
  Type,
  Mail,
  Phone,
  AlignLeft,
  Hash,
  MapPin,
  Link,
  MailPlus,
  ChevronDown,
  ListChecks,
  Circle,
  CheckSquare,
  ToggleLeft,
  Minus,
  CalendarDays,
  Heading,
  FileText,
  Calendar,
  Clock,
};

export type FieldLibraryVariant = "sidebar" | "sheet";

interface FieldLibraryProps {
  onAddField: (type: UIFieldType) => void;
  /** `sidebar` = narrow left rail (desktop). `sheet` = full mobile/tablet picker with denser grid. */
  variant?: FieldLibraryVariant;
}

export function FieldLibrary({ onAddField, variant = "sidebar" }: FieldLibraryProps) {
  const { t } = useLocale();
  const isSheet = variant === "sheet";

  const categories: { key: "input" | "selection" | "layout"; label: string }[] = [
    { key: "input", label: t("form_builder_input_fields") },
    { key: "selection", label: t("form_builder_selection") },
    { key: "layout", label: t("layout") },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        className={
          isSheet
            ? "min-h-0 flex-1 touch-manipulation space-y-5 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1"
            : "min-h-0 flex-1 touch-manipulation space-y-3 overflow-y-auto overscroll-contain p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:p-3"
        }>
        {categories.map((cat) => (
          <div key={cat.key} className={isSheet ? "border-subtle border-b pb-5 last:border-0 last:pb-0" : ""}>
            <p
              className={
                isSheet
                  ? "text-default mb-3 text-xs font-semibold uppercase tracking-wide"
                  : "text-muted-foreground mb-1.5 px-0.5 text-xs font-semibold uppercase tracking-wider sm:mb-2 sm:px-1"
              }>
              {cat.label}
            </p>
            <div
              className={
                isSheet
                  ? "grid grid-cols-2 gap-2 sm:grid-cols-3"
                  : "grid grid-cols-2 gap-1.5 sm:gap-1 lg:grid-cols-1 lg:gap-0.5"
              }>
              {FIELD_LIBRARY_CONFIG.filter((f) => f.category === cat.key).map((field) => {
                const Icon = ICON_MAP[field.icon] ?? Type;
                return (
                  <button
                    key={field.type}
                    type="button"
                    onClick={() => onAddField(field.type)}
                    draggable={!isSheet}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("builder/fieldType", field.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className={
                      isSheet
                        ? "border-subtle bg-muted/30 text-foreground hover:bg-muted flex min-h-[44px] w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99]"
                        : "text-foreground hover:bg-muted group flex w-full min-w-0 cursor-grab flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors active:cursor-grabbing sm:py-2.5 lg:flex-row lg:items-center lg:gap-2 lg:px-0 lg:py-2 lg:text-left"
                    }>
                    {!isSheet && (
                      <GripVertical className="text-muted-foreground/40 hidden h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 lg:block" />
                    )}
                    <div
                      className={
                        isSheet
                          ? "bg-muted flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                          : "bg-muted flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md lg:h-6 lg:w-6"
                      }>
                      <Icon
                        className={
                          isSheet
                            ? "text-muted-foreground h-4 w-4"
                            : "text-muted-foreground h-4 w-4 lg:h-3.5 lg:w-3.5"
                        }
                      />
                    </div>
                    <span
                      className={
                        isSheet
                          ? "line-clamp-2 text-sm font-medium leading-snug"
                          : "line-clamp-2 w-full text-[10px] font-medium leading-tight lg:truncate lg:text-xs"
                      }>
                      {field.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
