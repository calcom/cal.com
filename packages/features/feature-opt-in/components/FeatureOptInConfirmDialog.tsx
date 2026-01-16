"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@coss/ui/components/button";
import { Checkbox } from "@coss/ui/components/checkbox";
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
import { Label } from "@coss/ui/components/label";
import { Menu, MenuCheckboxItem, MenuPopup, MenuSeparator, MenuTrigger } from "@coss/ui/components/menu";
import { toastManager } from "@coss/ui/components/toast";
import { BuildingIcon, CheckIcon, ChevronDownIcon, UserIcon, UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useState } from "react";

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
};

interface FeatureOptInConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissBanner: () => void;
  onOptInSuccess?: () => void;
  featureConfig: OptInFeatureConfig;
  userRoleContext: UserRoleContext;
}

export function FeatureOptInConfirmDialog({
  isOpen,
  onClose,
  onDismissBanner,
  onOptInSuccess,
  featureConfig,
  userRoleContext,
}: FeatureOptInConfirmDialogProps): ReactElement {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { isOrgAdmin, orgId, adminTeamIds, adminTeamNames } = userRoleContext;
  const hasAdminTeams = adminTeamIds.length > 0;
  const canEnableForOrg = isOrgAdmin && orgId !== null;
  const canEnableForTeams = hasAdminTeams;
  const showSelector = canEnableForOrg || canEnableForTeams;

  const [enableForUser, setEnableForUser] = useState(true);
  const [enableForOrg, setEnableForOrg] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [autoOptIn, setAutoOptIn] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shouldInvalidate, setShouldInvalidate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setUserStateMutation = trpc.viewer.featureOptIn.setUserState.useMutation();
  const setTeamStateMutation = trpc.viewer.featureOptIn.setTeamState.useMutation();
  const setOrganizationStateMutation = trpc.viewer.featureOptIn.setOrganizationState.useMutation();
  const setUserAutoOptInMutation = trpc.viewer.featureOptIn.setUserAutoOptIn.useMutation();
  const setTeamAutoOptInMutation = trpc.viewer.featureOptIn.setTeamAutoOptIn.useMutation();
  const setOrganizationAutoOptInMutation = trpc.viewer.featureOptIn.setOrganizationAutoOptIn.useMutation();

  const hasTeamsSelected = selectedTeamIds.length > 0;
  const hasAnySelection = enableForUser || enableForOrg || hasTeamsSelected;

  const getSelectedText = (): string => {
    const parts: string[] = [];
    if (enableForUser) parts.push(t("just_for_me"));
    if (enableForOrg) parts.push(t("entire_organization"));
    if (hasTeamsSelected) {
      const teamNames = adminTeamNames
        .filter((team) => selectedTeamIds.includes(team.id))
        .map((team) => team.name);
      parts.push(...teamNames);
    }
    return parts.length > 0 ? parts.join(", ") : t("select");
  };

  const handleUserChange = (checked: boolean): void => {
    setEnableForUser(checked);
    if (checked) {
      setEnableForOrg(false);
      setSelectedTeamIds([]);
    }
  };

  const handleOrgChange = (checked: boolean): void => {
    setEnableForOrg(checked);
    if (checked) {
      setEnableForUser(false);
      setSelectedTeamIds([]);
    }
  };

  const handleTeamChange = (teamId: number, checked: boolean): void => {
    if (checked) {
      setSelectedTeamIds((prev) => [...prev, teamId]);
      setEnableForUser(false);
      setEnableForOrg(false);
    } else {
      setSelectedTeamIds((prev) => prev.filter((id) => id !== teamId));
    }
  };

  const getAutoOptInText = (): string => {
    if (enableForOrg) {
      return t("auto_opt_in_future_features_org");
    }
    if (hasTeamsSelected) {
      return t("auto_opt_in_future_features_teams");
    }
    return t("auto_opt_in_future_features_user");
  };

  const handleConfirm = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const promises: Promise<unknown>[] = [];

      if (enableForOrg && orgId) {
        promises.push(
          setOrganizationStateMutation.mutateAsync({ slug: featureConfig.slug, state: "enabled" })
        );
        if (autoOptIn) {
          promises.push(setOrganizationAutoOptInMutation.mutateAsync({ autoOptIn: true }));
        }
      }

      if (hasTeamsSelected) {
        selectedTeamIds.forEach((teamId) => {
          promises.push(
            setTeamStateMutation.mutateAsync({ teamId, slug: featureConfig.slug, state: "enabled" })
          );
          if (autoOptIn) {
            promises.push(setTeamAutoOptInMutation.mutateAsync({ teamId, autoOptIn: true }));
          }
        });
      }

      if (enableForUser) {
        promises.push(setUserStateMutation.mutateAsync({ slug: featureConfig.slug, state: "enabled" }));
        if (autoOptIn) {
          promises.push(setUserAutoOptInMutation.mutateAsync({ autoOptIn: true }));
        }
      }

      await Promise.all(promises);

      setIsSuccess(true);
      setShouldInvalidate(true);
      onOptInSuccess?.();
    } catch (_error) {
      toastManager.add({ title: t("error_enabling_feature"), type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSettingsRedirectPath = (): string => {
    if (enableForOrg) {
      return "/settings/organizations/features";
    }
    if (hasTeamsSelected && selectedTeamIds.length > 0) {
      return `/settings/teams/${selectedTeamIds[0]}/features`;
    }
    return "/settings/my-account/features";
  };

  const handleViewSettings = (): void => {
    onDismissBanner();
    resetAndClose();
    router.push(getSettingsRedirectPath());
  };

  const handleDismiss = (): void => {
    onDismissBanner();
    resetAndClose();
  };

  const resetAndClose = (): void => {
    if (shouldInvalidate) {
      utils.viewer.featureOptIn.checkFeatureOptInEligibility.invalidate();
      utils.viewer.featureOptIn.listForUser.invalidate();
      setShouldInvalidate(false);
    }
    setIsSuccess(false);
    setEnableForUser(true);
    setEnableForOrg(false);
    setSelectedTeamIds([]);
    setAutoOptIn(false);
    onClose();
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={resetAndClose}>
        <DialogPopup className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("feature_enabled_successfully")}</DialogTitle>
            <DialogDescription>{t("feature_enabled_description")}</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col items-center py-6 text-center">
              <div className="bg-success/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <CheckIcon className="text-success h-6 w-6" />
              </div>
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} onClick={handleDismiss}>
              {t("dismiss")}
            </DialogClose>
            <Button onClick={handleViewSettings}>{t("view_settings")}</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(featureConfig.nameI18nKey)}</DialogTitle>
          <DialogDescription>{t(featureConfig.descriptionI18nKey)}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-4">
            {showSelector && (
              <div className="space-y-2">
                <Label>{t("enable_for")}</Label>
                <Menu>
                  <MenuTrigger
                    render={
                      <button
                        type="button"
                        className="border-default bg-default text-default hover:bg-muted flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
                      />
                    }>
                    <span className="truncate leading-normal">{getSelectedText()}</span>
                    <ChevronDownIcon aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
                  </MenuTrigger>
                  <MenuPopup className="w-56" align="start">
                    <MenuCheckboxItem
                      checked={enableForUser}
                      onCheckedChange={(checked) => handleUserChange(checked)}>
                      <UserIcon className="h-4 w-4" />
                      {t("just_for_me")}
                    </MenuCheckboxItem>

                    {canEnableForOrg && (
                      <>
                        <MenuSeparator />
                        <MenuCheckboxItem
                          checked={enableForOrg}
                          onCheckedChange={(checked) => handleOrgChange(checked)}>
                          <BuildingIcon className="h-4 w-4" />
                          {t("entire_organization")}
                        </MenuCheckboxItem>
                      </>
                    )}

                    {canEnableForTeams && adminTeamNames.length > 0 && (
                      <>
                        <MenuSeparator />
                        {adminTeamNames.map((team) => (
                          <MenuCheckboxItem
                            key={team.id}
                            checked={selectedTeamIds.includes(team.id)}
                            onCheckedChange={(checked) => handleTeamChange(team.id, checked)}>
                            <UsersIcon className="h-4 w-4" />
                            {team.name}
                          </MenuCheckboxItem>
                        ))}
                      </>
                    )}
                  </MenuPopup>
                </Menu>
              </div>
            )}

            <Label className="hover:bg-subtle flex cursor-pointer items-center gap-2 rounded-md p-1">
              <Checkbox checked={autoOptIn} onCheckedChange={(checked) => setAutoOptIn(checked === true)} />
              <span className="text-default text-sm">{getAutoOptInText()}</span>
            </Label>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />} onClick={resetAndClose} disabled={isSubmitting}>
            {t("cancel")}
          </DialogClose>
          <Button onClick={handleConfirm} disabled={isSubmitting || !hasAnySelection}>
            {t("enable")}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export default FeatureOptInConfirmDialog;
