"use client";

import { useState } from "react";

import { PolicyType } from "@calcom/prisma/enums";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import dayjs from "@calcom/dayjs";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calcom/ui/components/table/TableNew";
import { HorizontalTabs } from "@calcom/ui/components/navigation";

const POLICY_TYPE_OPTIONS = [
  { label: "privacy_policy", value: PolicyType.PRIVACY_POLICY },
];

export function PoliciesTable() {
  const { t } = useLocale();
  const [policyType, setPolicyType] = useState<PolicyType>(PolicyType.PRIVACY_POLICY);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.viewer.admin.policy.list.useInfiniteQuery(
      {
        type: policyType,
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  if (isLoading) {
    return (
      <SkeletonContainer>
        <div className="space-y-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </SkeletonContainer>
    );
  }

  const allPolicies = data?.pages.flatMap((page) => page.policies) ?? [];

  if (allPolicies.length === 0) {
    return (
      <div className="border-subtle text-center rounded-md border p-8">
        <p className="text-subtle text-sm">{t("no_policy_versions_found")}</p>
        <p className="text-muted mt-1 text-xs">{t("create_first_policy_version")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md">
        <HorizontalTabs
          tabs={POLICY_TYPE_OPTIONS.map((option) => ({
            name: t(option.label),
            value: option.value,
            href: "#",
            onClick: () => setPolicyType(option.value),
            isActive: policyType === option.value,
          }))}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("version")}</TableHead>
              <TableHead>{t("published_date")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("description_us")}</TableHead>
              <TableHead>{t("description_non_us")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allPolicies.map((policy, index) => (
              <TableRow key={`${policy.version}-${policy.type}`}>
                <TableCell className="font-mono text-xs">{new Date(policy.version).toISOString()}</TableCell>
                <TableCell className="font-medium">{dayjs(policy.publishedAt).format("MMM D, YYYY HH:mm:ss")}</TableCell>
                <TableCell>
                  <Badge variant="gray">{policy.type.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="max-h-20 overflow-y-auto">
                    <p className="text-default text-sm whitespace-pre-wrap">{policy.description}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="max-h-20 overflow-y-auto">
                    <p className="text-default text-sm whitespace-pre-wrap">{policy.descriptionNonUS}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {index === 0 ? (
                    <Badge variant="green">{t("latest")}</Badge>
                  ) : (
                    <Badge variant="gray">{t("archived")}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            color="secondary"
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}>
            {t("load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}
