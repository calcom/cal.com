/**
 * FieldLibrary.tsx
 *
 * Left panel: displays available field types grouped by category.
 * Clicking or dragging a field type calls onAddField(type).
 * Uses existing internal UI primitives only.
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

// Icon map keyed by the string stored in FIELD_LIBRARY_CONFIG
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

interface FieldLibraryProps {
  onAddField: (type: UIFieldType) => void;
}

export function FieldLibrary({ onAddField }: FieldLibraryProps) {
  const { t } = useLocale();

  const categories: { key: "input" | "selection" | "layout"; label: string }[] = [
    { key: "input", label: t("form_builder_input_fields") },
    { key: "selection", label: t("form_builder_selection") },
    { key: "layout", label: t("layout") },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {categories.map((cat) => (
          <div key={cat.key}>
            <p className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider">
              {cat.label}
            </p>
            <div className="space-y-0.5">
              {FIELD_LIBRARY_CONFIG.filter((f) => f.category === cat.key).map((field) => {
                const Icon = ICON_MAP[field.icon] ?? Type;
                return (
                  <button
                    key={field.type}
                    type="button"
                    onClick={() => onAddField(field.type)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("builder/fieldType", field.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="text-foreground hover:bg-muted group flex w-full cursor-grab items-center gap-2 rounded-lg px-0 py-2 text-sm transition-colors active:cursor-grabbing">
                    <GripVertical className="text-muted-foreground/40 h-3 w-3 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="bg-muted flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md">
                      <Icon className="text-muted-foreground h-3.5 w-3.5" />
                    </div>
                    <span className="truncate text-xs font-medium">{field.label}</span>
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
