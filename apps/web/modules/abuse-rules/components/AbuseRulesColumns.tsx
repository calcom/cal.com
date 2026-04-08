"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Checkbox, Switch } from "@calcom/ui/components/form";
import { Tooltip } from "@calcom/ui/components/tooltip";

export type AbuseRuleCondition = {
  field: string;
  operator: string;
  value: string;
};

export type AbuseRuleRow = {
  id: string;
  matchAll: boolean;
  weight: number;
  autoLock: boolean;
  enabled: boolean;
  description: string | null;
  createdAt: Date;
  conditions: AbuseRuleCondition[];
};

const FIELD_SHORT_LABELS: Record<string, string> = {
  EVENT_TYPE_TITLE: "Title",
  EVENT_TYPE_DESCRIPTION: "Description",
  REDIRECT_URL: "Redirect URL",
  CANCELLATION_REASON: "Cancel reason",
  BOOKING_LOCATION: "Location",
  BOOKING_RESPONSES: "Responses",
  WORKFLOW_CONTENT: "Workflow",
  USERNAME: "Username",
  SIGNUP_EMAIL_DOMAIN: "Email domain",
  SIGNUP_NAME: "Name",
  BOOKING_VELOCITY: "Velocity",
  SELF_BOOKING_COUNT: "Self-bookings",
};

const OPERATOR_SYMBOLS: Record<string, string> = {
  CONTAINS: "contains",
  EXACT: "=",
  GREATER_THAN: ">",
  MATCHES_DOMAIN: "domain~",
};

function formatExpression(conditions: AbuseRuleCondition[], matchAll: boolean): string {
  return conditions
    .map((c) => {
      const field = FIELD_SHORT_LABELS[c.field] ?? c.field;
      const op = OPERATOR_SYMBOLS[c.operator] ?? c.operator;
      return `${field} ${op} "${c.value}"`;
    })
    .join(matchAll ? " AND " : " OR ");
}

interface UseAbuseRulesColumnsProps {
  t: (key: string) => string;
  onEdit: (rule: AbuseRuleRow) => void;
  onDelete: (rule: AbuseRuleRow) => void;
  onToggleEnabled: (rule: AbuseRuleRow) => void;
}

export function useAbuseRulesColumns({
  t,
  onEdit,
  onDelete,
  onToggleEnabled,
}: UseAbuseRulesColumnsProps) {
  return useMemo<ColumnDef<AbuseRuleRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t("select_all")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("select_row")}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 30,
        minSize: 30,
        maxSize: 30,
      },
      {
        id: "description",
        header: t("description"),
        accessorKey: "description",
        enableHiding: false,
        size: 160,
        cell: ({ row }) => (
          <span className="text-emphasis font-medium">
            {row.original.description || `Rule #${row.original.id}`}
          </span>
        ),
      },
      {
        id: "expression",
        header: t("expression"),
        enableHiding: false,
        size: 260,
        cell: ({ row }) => {
          const expr = formatExpression(row.original.conditions, row.original.matchAll);
          return (
            <Tooltip content={expr}>
              <span className="text-subtle text-xs leading-snug">
                {expr}
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: "action",
        header: t("action"),
        size: 100,
        cell: ({ row }) =>
          row.original.autoLock ? (
            <Badge variant="red">{t("auto_lock")}</Badge>
          ) : (
            <Badge variant="gray">Score +{row.original.weight}</Badge>
          ),
      },
      {
        id: "enabled",
        header: t("enabled"),
        size: 120,
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={() => onToggleEnabled(row.original)}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        size: 80,
        minSize: 80,
        maxSize: 80,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Dropdown modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <DropdownItem type="button" StartIcon="pencil" onClick={() => onEdit(row.original)}>
                    {t("edit")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    color="destructive"
                    StartIcon="trash"
                    onClick={() => onDelete(row.original)}>
                    {t("delete")}
                  </DropdownItem>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </Dropdown>
          </div>
        ),
      },
    ],
    [t, onEdit, onDelete, onToggleEnabled]
  );
}
