"use client";

import { useCallback, useRef, useState } from "react";

import type { ActionDefinition } from "@calcom/features/admin-dataview/types";
import type { AdminTable } from "@calcom/features/admin-dataview/AdminTable";
import { Button } from "@coss/ui/components/button";
import { ACTION_FORM_COMPONENTS } from "./action-forms/ActionFormRegistry";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@coss/ui/components/menu";
import { showToast } from "@calcom/ui/components/toast";
import { EllipsisVerticalIcon, LoaderIcon } from "@coss/ui/icons";

import { executeAction } from "../hooks/useActionExecutor";

export interface ContextMenuHandle {
  open: (e: React.MouseEvent, row: Record<string, unknown>) => void;
}

/**
 * Right-click context menu for table rows.
 * Parent calls `ref.current.open(e, row)` on contextmenu event.
 * Renders nothing visible — the menu appears at the cursor position.
 */
export function RowContextMenu({
  table,
  onActionComplete,
  onMenuClose,
  contextRef,
}: {
  table: AdminTable;
  onActionComplete?: () => void;
  onMenuClose?: () => void;
  contextRef: React.RefObject<ContextMenuHandle | null>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeRow, setActiveRow] = useState<Record<string, unknown> | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionDefinition | null>(null);
  const [formAction, setFormAction] = useState<ActionDefinition | null>(null);
  const [executing, setExecuting] = useState(false);

  const handleOpen = useCallback((e: React.MouseEvent, row: Record<string, unknown>) => {
    e.preventDefault();
    setAnchor({ x: e.clientX, y: e.clientY });
    setActiveRow(row);
    setMenuOpen(true);
  }, []);

  if (contextRef && "current" in contextRef) {
    (contextRef as React.MutableRefObject<ContextMenuHandle | null>).current = { open: handleOpen };
  }

  const actions = activeRow ? getVisibleActions(table.actions, activeRow) : [];

  const run = async (action: ActionDefinition) => {
    if (!activeRow) return;
    setExecuting(true);
    try {
      await executeAction(action, activeRow);
      showToast(`${action.label} completed`, "success");
      onActionComplete?.();
    } catch (err) {
      showToast(`${action.label} failed: ${(err as Error).message}`, "error");
    } finally {
      setExecuting(false);
      setConfirmAction(null);
    }
  };

  const handleClick = (action: ActionDefinition) => {
    if (action.formId) {
      setFormAction(action);
    } else if (action.confirm) {
      setConfirmAction(action);
    } else {
      run(action);
    }
  };

  const defaultActions = actions.filter((a) => a.variant !== "destructive");
  const destructive = actions.filter((a) => a.variant === "destructive");

  const virtualAnchor = useRef<HTMLSpanElement>(null);

  return (
    <>
      {/* Virtual anchor positioned at cursor */}
      <span
        ref={virtualAnchor}
        style={{
          position: "fixed",
          left: anchor.x,
          top: anchor.y,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
      />

      <Menu open={menuOpen} onOpenChange={(open) => { setMenuOpen(open); if (!open) onMenuClose?.(); }}>
        <MenuPopup anchor={virtualAnchor}>
          {defaultActions.map((action) => (
            <MenuItem key={action.id} closeOnClick onClick={() => handleClick(action)}>
              {action.label}
            </MenuItem>
          ))}
          {defaultActions.length > 0 && destructive.length > 0 && <MenuSeparator />}
          {destructive.map((action) => (
            <MenuItem key={action.id} variant="destructive" closeOnClick onClick={() => handleClick(action)}>
              {action.label}
            </MenuItem>
          ))}
          {actions.length === 0 && (
            <MenuItem disabled>No actions available</MenuItem>
          )}
        </MenuPopup>
      </Menu>

      {confirmAction?.confirm && activeRow && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
          title={interpolate(confirmAction.confirm.title, activeRow)}
          description={interpolate(confirmAction.confirm.description, activeRow)}
          confirmLabel={interpolate(confirmAction.confirm.confirmLabel ?? confirmAction.label, activeRow)}
          variant={confirmAction.variant}
          isExecuting={executing}
          onConfirm={() => run(confirmAction)}
        />
      )}

      {formAction?.formId && activeRow && (
        <ActionFormDialog
          formId={formAction.formId}
          label={formAction.label}
          table={table}
          row={activeRow}
          onComplete={() => { setFormAction(null); onActionComplete?.(); }}
          onCancel={() => setFormAction(null)}
        />
      )}
    </>
  );
}

export function DialogActions({
  table,
  row,
  onActionComplete,
}: {
  table: AdminTable;
  row: Record<string, unknown>;
  onActionComplete?: () => void;
}) {
  const actions = getVisibleActions(table.actions, row);
  const [confirmAction, setConfirmAction] = useState<ActionDefinition | null>(null);
  const [formAction, setFormAction] = useState<ActionDefinition | null>(null);
  const [executing, setExecuting] = useState(false);

  if (actions.length === 0) return null;

  const run = async (action: ActionDefinition) => {
    setExecuting(true);
    try {
      await executeAction(action, row);
      showToast(`${action.label} completed`, "success");
      onActionComplete?.();
    } catch (err) {
      showToast(`${action.label} failed: ${(err as Error).message}`, "error");
    } finally {
      setExecuting(false);
      setConfirmAction(null);
    }
  };

  const handleClick = (action: ActionDefinition) => {
    if (action.formId) {
      setFormAction(action);
    } else if (action.confirm) {
      setConfirmAction(action);
    } else {
      run(action);
    }
  };

  const defaultActions = actions.filter((a) => a.variant !== "destructive");
  const destructive = actions.filter((a) => a.variant === "destructive");

  return (
    <>
      <Menu>
        <MenuTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
          <EllipsisVerticalIcon className="h-4 w-4" />
        </MenuTrigger>
        <MenuPopup>
          {defaultActions.map((action) => (
            <MenuItem key={action.id} closeOnClick onClick={() => handleClick(action)}>
              {action.label}
            </MenuItem>
          ))}
          {defaultActions.length > 0 && destructive.length > 0 && <MenuSeparator />}
          {destructive.map((action) => (
            <MenuItem key={action.id} variant="destructive" closeOnClick onClick={() => handleClick(action)}>
              {action.label}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>

      {confirmAction?.confirm && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
          title={interpolate(confirmAction.confirm.title, row)}
          description={interpolate(confirmAction.confirm.description, row)}
          confirmLabel={interpolate(confirmAction.confirm.confirmLabel ?? confirmAction.label, row)}
          variant={confirmAction.variant}
          isExecuting={executing}
          onConfirm={() => run(confirmAction)}
        />
      )}

      {formAction?.formId && (
        <ActionFormDialog
          formId={formAction.formId}
          label={formAction.label}
          table={table}
          row={row}
          onComplete={() => { setFormAction(null); onActionComplete?.(); }}
          onCancel={() => setFormAction(null)}
        />
      )}
    </>
  );
}

function ActionFormDialog({
  formId,
  label,
  table,
  row,
  onComplete,
  onCancel,
}: {
  formId: string;
  label: string;
  table: AdminTable;
  row: Record<string, unknown>;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const FormComponent = ACTION_FORM_COMPONENTS[formId];
  if (!FormComponent) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogPopup className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <DialogPanel>
          <FormComponent table={table} row={row} onComplete={onComplete} onCancel={onCancel} />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant,
  isExecuting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "destructive";
  isExecuting: boolean;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={isExecuting}
            onClick={onConfirm}>
            {isExecuting && <LoaderIcon className="mr-1 h-3 w-3 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function getVisibleActions(
  actions: ActionDefinition[] | undefined,
  row: Record<string, unknown>
): ActionDefinition[] {
  if (!actions) return [];
  return actions.filter((a) => !a.condition || a.condition(row));
}

/** Replace `{{field}}` placeholders with values from the row */
function interpolate(template: string, row: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = row[key];
    if (val === null || val === undefined) return "null";
    return String(val);
  });
}
