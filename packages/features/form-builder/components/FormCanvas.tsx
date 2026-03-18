/**
 * FormCanvas.tsx
 *
 * Center panel — the visual form canvas.
 *
 * All structural mutations go through callback props → useFieldArray in parent.
 */
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react";
import React, { CSSProperties, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { FieldRenderer } from "./FieldRenderer";
import type { BuilderField, FormLevelConfig } from "./builderTypes";
import { LAYOUT_ONLY_TYPES, resolveFormFontStyle } from "./builderTypes";

interface FormCanvasProps {
  fields: BuilderField[];
  selectedFieldIndex: number | null;
  formConfig: FormLevelConfig;
  onSelectField: (index: number | null) => void;
  onReorder: (from: number, to: number) => void;
  onDropNewField: (type: string, atIndex?: number) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
}

// ─── Inter-field drop zone ────────────────────────────────────────────────────

function InsertZone({
  onDrop,
  onHover,
  onHandledDrop,
  className,
}: {
  onDrop: (type: string, fromIndex?: number) => void;
  onHover?: () => void;
  onHandledDrop?: () => void;
  className?: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`${className ?? ""} transition-all duration-150 ${
        over ? "bg-brand/10 border-brand h-10 rounded-lg border-2 border-dashed" : "h-2"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const hasIndex = !!e.dataTransfer.getData("builder/fieldIndex");
        e.dataTransfer.dropEffect = hasIndex ? "move" : "copy";
        setOver(true);
        onHover?.();
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onHandledDrop?.();
        const type = e.dataTransfer.getData("builder/fieldType");
        const idx = e.dataTransfer.getData("builder/fieldIndex");
        if (type) onDrop(type);
        else if (idx) onDrop("__reorder__", parseInt(idx, 10));
      }}
    />
  );
}

// ─── Single field card ────────────────────────────────────────────────────────

interface FieldCardProps {
  field: BuilderField;
  index: number;
  total: number;
  isSelected: boolean;
  fieldStyle: "default" | "underline";
  accentColor?: string;
  secondaryColor?: string;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

function FieldCard({
  field,
  index,
  total,
  isSelected,
  fieldStyle,
  accentColor,
  secondaryColor,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
}: FieldCardProps) {
  const { t } = useLocale();
  const isLayout = LAYOUT_ONLY_TYPES.has(field.type);
  const labelText = field.label.trim();
  const isLabelEmpty = labelText.length === 0;
  const validation = field.uiConfig?.validation;
  // For underline style, skip the block label — FieldRenderer shows it inline
  const showBlockLabel = !isLayout && fieldStyle !== "underline" && !isLabelEmpty;
  const showInlineLabel = fieldStyle === "underline" && !isLayout && !isLabelEmpty;

  const requiredMessage = t("error_required_field");
  const invalidEmailMessage = t("enter_valid_email");
  const invalidPhoneMessage = t("invalid_phone_number");

  
  // const showRequired = true;

  // const errorMessage = showRequired
  //   ? requiredMessage
  //   : field.type === "email"
  //   ? invalidEmailMessage
  //   : field.type === "phone"
  //   ? invalidPhoneMessage
  //   : null;

  return (
    <div
      className={`group relative cursor-pointer select-none rounded-lg border-2 p-3 transition-all duration-150 ${
        isSelected ? "border-brand bg-brand/5 shadow-sm" : "hover:border-default border-transparent"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}>
      {/* Floating toolbar */}
      <div
        className={`border-default bg-default absolute -top-3.5 right-2 z-10 flex items-center gap-0.5 rounded-md border px-1 py-0.5 shadow-sm transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          title={t("form_builder_drag_to_reorder")}
          draggable
          onDragStart={onDragStart}
          className="hover:bg-subtle cursor-grab rounded p-1 active:cursor-grabbing">
          <GripVertical className="text-muted h-3 w-3" />
        </button>
        <button
          type="button"
          title={t("duplicate")}
          onClick={onDuplicate}
          className="hover:bg-subtle rounded p-1">
          <Copy className="text-muted h-3 w-3" />
        </button>
        {index > 0 && (
          <button
            type="button"
            title={t("form_builder_move_up")}
            onClick={onMoveUp}
            className="hover:bg-subtle rounded p-1">
            <ChevronUp className="text-muted h-3 w-3" />
          </button>
        )}
        {index < total - 1 && (
          <button
            type="button"
            title={t("form_builder_move_down")}
            onClick={onMoveDown}
            className="hover:bg-subtle rounded p-1">
            <ChevronDown className="text-muted h-3 w-3" />
          </button>
        )}
        <button
          type="button"
          title={t("delete")}
          onClick={onDelete}
          className="hover:bg-error/10 rounded p-1">
          <Trash2 className="text-error h-3 w-3" />
        </button>
      </div>

      {/* Label (default style, non-layout fields) */}
      {showBlockLabel && (
        <label className="text-default pointer-events-none mb-1.5 block text-sm font-medium">
          {labelText || <span className="text-muted italic">{t("untitled")}</span>}
          {field.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      {/* For underline style, show label above input */}
      {showInlineLabel && (
        <label className="text-default pointer-events-none mb-0.5 block text-xs font-medium">
          {labelText || <span className="text-muted italic">{t("untitled")}</span>}
          {field.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      <FieldRenderer
        field={field}
        fieldStyle={fieldStyle}
        accentColor={accentColor}
        secondaryColor={secondaryColor}
      />

      {field.uiConfig?.helpText && (
        <p className="text-muted pointer-events-none mt-1.5 text-xs">{field.uiConfig.helpText}</p>
      )}

      {/* {errorMessage && <p className="text-error pointer-events-none mt-1.5 text-xs">{errorMessage}</p>} */}
    </div>
  );
}

// ─── Main canvas ──────────────────────────────────────────────────────────────

export function FormCanvas({
  fields,
  selectedFieldIndex,
  formConfig,
  onSelectField,
  onReorder,
  onDropNewField,
  onDelete,
  onDuplicate,
}: FormCanvasProps) {
  const { t } = useLocale();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [canvasOver, setCanvasOver] = useState(false);
  const lastHoverIndexRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dropHandledRef = useRef(false);

  const fieldStyle = formConfig.style.fieldStyle;
  const { header, style, submitButton } = formConfig;
  const background = style.background;
  const backgroundStyle =
    background.type === "color"
      ? { backgroundColor: background.color || "transparent" }
      : background.type === "image"
      ? {
          backgroundImage: background.imageUrl ? `url(${background.imageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "left top",
        }
      : {};
  const layoutPadding = 24;

  // Resolve card inline styles from formConfig
  const cardStyle: React.CSSProperties = {
    borderRadius: `${style.borderRadius}px`,
    padding: `${style.padding}px`,
    ...(style.bgColor ? { backgroundColor: style.bgColor } : {}),
  };
  const resolvedFont = resolveFormFontStyle(style.fontLabel);
  const contentStyle: React.CSSProperties = {
    maxWidth: `${style.formWidth}px`,
    fontFamily: resolvedFont.fontFamily,
    fontStyle: resolvedFont.fontStyle,
    fontWeight: resolvedFont.fontWeight,
  };

  // Submit button inline styles
  const btnStyle: React.CSSProperties = {
    borderRadius: `${submitButton.borderRadius}px`,
    ...(submitButton.color ? { backgroundColor: submitButton.color } : {}),
    ...(submitButton.textColor ? { color: submitButton.textColor } : {}),
  };
  const btnAlignClass =
    submitButton.alignment === "right"
      ? "justify-end"
      : submitButton.alignment === "center"
      ? "justify-center"
      : "justify-start";

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCanvasOver(false);
    if (dropHandledRef.current) {
      dropHandledRef.current = false;
      return;
    }
    setHoverIndex(null);
    const type = e.dataTransfer.getData("builder/fieldType");
    const fromIdx = e.dataTransfer.getData("builder/fieldIndex");
    const pointIndex = getDropIndexFromPoint(e);
    const hoverAt = lastHoverIndexRef.current ?? hoverIndex ?? pointIndex;
    if (type) {
      onDropNewField(type, hoverAt ?? undefined);
    } else if (fromIdx) {
      const from = parseInt(fromIdx, 10);
      if (hoverAt !== null && hoverAt !== undefined) {
        onReorder(from, resolveReorderTarget(from, hoverAt));
      } else {
        onReorder(from, fields.length - 1);
      }
    }
    setDraggingIndex(null);
    lastHoverIndexRef.current = null;
  };

  const resolveReorderTarget = (fromIndex: number, beforeIndex: number) => {
    if (fromIndex < beforeIndex) return Math.max(0, beforeIndex - 1);
    return Math.max(0, beforeIndex);
  };

  // Handler for InsertZone drops — resolves reorder vs new field
  const handleInsertZoneDrop = (type: string, fromIndex?: number, beforeIndex?: number) => {
    if (type && type !== "__reorder__") {
      onDropNewField(type, beforeIndex);
    } else if (fromIndex !== undefined && beforeIndex !== undefined) {
      onReorder(fromIndex, resolveReorderTarget(fromIndex, beforeIndex));
    } else if (fromIndex !== undefined) {
      onReorder(fromIndex, fields.length - 1);
    }
    setHoverIndex(null);
    lastHoverIndexRef.current = null;
  };

  const setHover = (index: number | null) => {
    setHoverIndex(index);
    lastHoverIndexRef.current = index;
  };

  const updateHoverFromPointer = (e: React.DragEvent) => {
    const grid = gridRef.current;
    if (!grid) return;
    const nodes = Array.from(grid.querySelectorAll<HTMLElement>("[data-field-index]"));
    if (nodes.length === 0) return;
    const y = e.clientY;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (y < midY) {
        const idx = Number(node.dataset.fieldIndex);
        if (!Number.isNaN(idx)) setHover(idx);
        return;
      }
    }
    setHover(nodes.length);
  };

  const getDropIndexFromPoint = (e: React.DragEvent) => {
    if (typeof document === "undefined") return null;
    const grid = gridRef.current;
    if (!grid) return null;
    const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!hit) return null;
    const fieldEl = hit.closest("[data-field-index]") as HTMLElement | null;
    if (!fieldEl || !grid.contains(fieldEl)) return null;
    const idx = Number(fieldEl.dataset.fieldIndex);
    if (Number.isNaN(idx)) return null;
    const rect = fieldEl.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
  };

  return (
    <div
      className="bg-subtle relative h-full overflow-y-auto"
      onClick={() => onSelectField(null)}
      onDragOver={(e) => {
        e.preventDefault();
        setCanvasOver(true);
      }}
      onDragLeave={() => setCanvasOver(false)}
      onDrop={handleCanvasDrop}>
      <link rel="stylesheet" href="https://use.typekit.net/axv4sxn.css" />
      <div className="relative" style={{ ...backgroundStyle, padding: `${layoutPadding}px` }}>
        {background.type === "image" && background.imageUrl && background.overlayOpacity > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${background.overlayOpacity})` }}
          />
        )}
        {background.type === "image" && background.imageUrl && background.blur > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backdropFilter: `blur(${background.blur}px)` }}
          />
        )}
        <div className="relative  flex w-full items-start justify-center">
          <div className="w-full" style={contentStyle}>
            {/* ── Header (above card) ── */}
            {(header.title || header.subtitle) && (
              <div
                className=""
                style={{
                  textAlign: header.alignment,
                  paddingTop: `${header.spacingBottom}px`,
                  marginBottom: `${header.spacingBottom}px`,
                }}>
                {header.title && (
                  <h2
                    className="text-default mb-1 text-xl font-bold"
                    style={{
                      fontSize: `${header.titleSize}px`,
                      color: header.titleColor || undefined,
                    }}>
                    {header.title}
                  </h2>
                )}
                {header.subtitle && (
                  <p
                    className="text-muted text-sm"
                    style={{
                      fontSize: `${header.subtitleSize}px`,
                      color: header.subtitleColor || undefined,
                    }}>
                    {header.subtitle}
                  </p>
                )}
              </div>
            )}

            {/* ── Form card ── */}
            <div
              className="bg-default  dark:bg-muted  border-default border shadow-md"
              style={cardStyle}
              onClick={(e) => e.stopPropagation()}>
              {fields.length === 0 ? (
                <div
                  className={`flex min-h-[240px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                    canvasOver ? "border-brand bg-brand/5" : "border-default"
                  }`}>
                  <p className="text-muted text-sm font-medium">
                    {canvasOver
                      ? t("form_builder_drop_to_add_field")
                      : t("form_builder_drag_fields_here_or_click")}
                  </p>
                  <p className="text-muted/60 mt-1 text-xs">{t("form_builder_form_will_appear_here")}</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Top insert zone */}
                  <InsertZone
                    className="col-span-1 sm:col-span-2"
                    onDrop={(type, fromIdx) => handleInsertZoneDrop(type, fromIdx, 0)}
                    onHover={() => setHover(0)}
                    onHandledDrop={() => {
                      dropHandledRef.current = true;
                      setTimeout(() => {
                        dropHandledRef.current = false;
                      }, 0);
                    }}
                  />

                  {/*
                  CSS grid with 2 columns.
                  Full-width fields span both columns (col-span-2).
                  Half-width fields occupy 1 column — CSS grid auto-places them.
                  This is the correct implementation of half/full width.
                */}
                  <div
                    ref={gridRef}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateHoverFromPointer(e);
                    }}>
                    {(() => {
                      const items: React.ReactNode[] = [];
                      const placeholder =
                        draggingIndex !== null ? (
                          <div className="border-brand bg-brand/10 col-span-1 h-10 rounded-lg border-2 border-dashed sm:col-span-2" />
                        ) : null;

                      fields.forEach((field, index) => {
                        const isLayout = LAYOUT_ONLY_TYPES.has(field.type);
                        const isFull = isLayout || (field.uiConfig?.layout ?? "full") === "full";

                        if (placeholder && hoverIndex === index) {
                          items.push(
                            <React.Fragment key={`placeholder-${index}`}>{placeholder}</React.Fragment>
                          );
                        }

                        items.push(
                          <div
                            key={field.id}
                            data-field-index={index}
                            className={`${isFull ? "col-span-1 sm:col-span-2" : "col-span-1"} flex flex-col`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateHoverFromPointer(e);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCanvasDrop(e);
                            }}>
                            <FieldCard
                              field={field}
                              index={index}
                              total={fields.length}
                              isSelected={selectedFieldIndex === index}
                              fieldStyle={fieldStyle}
                              accentColor={formConfig.style.accentColor}
                              secondaryColor={formConfig.style.secondaryColor}
                              onSelect={() => onSelectField(index)}
                              onDelete={() => onDelete(index)}
                              onDuplicate={() => onDuplicate(index)}
                              onMoveUp={() => onReorder(index, index - 1)}
                              onMoveDown={() => onReorder(index, index + 1)}
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("builder/fieldIndex", String(index));
                                e.stopPropagation();
                                setDraggingIndex(index);
                                lastHoverIndexRef.current = null;
                              }}
                              onDragEnd={() => {
                                setDraggingIndex(null);
                                setHoverIndex(null);
                                lastHoverIndexRef.current = null;
                              }}
                            />

                            {/* Insert zone after each field (does not consume a grid cell) */}
                            <InsertZone
                              className="mt-2"
                              onDrop={(type, fromIdx) => handleInsertZoneDrop(type, fromIdx, index + 1)}
                              onHover={() => setHover(index + 1)}
                              onHandledDrop={() => {
                                dropHandledRef.current = true;
                                setTimeout(() => {
                                  dropHandledRef.current = false;
                                }, 0);
                              }}
                            />
                          </div>
                        );
                      });

                      if (placeholder && hoverIndex === fields.length) {
                        items.push(<React.Fragment key="placeholder-end">{placeholder}</React.Fragment>);
                      }

                      return items;
                    })()}
                  </div>

                  {/* Submit button */}
                  <div className={`flex pt-4 ${btnAlignClass}`}>
                    <button
                      type="button"
                      style={btnStyle}
                      className={`${
                        submitButton.width === "full" ? "w-full" : "px-8"
                      } bg-emphasis text-inverted pointer-events-none h-10 rounded-md text-sm font-medium opacity-80 transition-opacity`}>
                      {submitButton.text || t("submit")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
