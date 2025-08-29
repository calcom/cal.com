"use client";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@calid/features/ui';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@calcom/features/components/controlled-dialog';

// import {  Dialog, DialogContent, DialogHeader, DialogTitle  } from '@calcom/ui/components/dialog';
import { Avatar } from "@calcom/ui/components/avatar";
import { trpc } from "@calcom/trpc/react";

interface TeamSelectionDialogProps {
  open: boolean;
  openChange: (open: boolean) => void;
  onTeamSelect: (teamId: string) => void;
  isAdmin?: boolean;
  includeOrg?: boolean;
}

export const TeamSelectionDialog: React.FC<TeamSelectionDialogProps> = ({
  open,
  openChange,
  onTeamSelect,
  isAdmin = false,
  includeOrg = false
}) => {
  const { t } = useLocale();

  const query = trpc.viewer.loggedInViewerRouter.teamsAndUserProfilesQuery.useQuery({
    includeOrg: includeOrg,
  });

  if (!query.data) return null;

  // Transform the query data to match the Option interface
  const teamsAndUserProfiles = query.data
    .filter((profile) => !profile.readOnly)
    .map((profile) => ({
      teamId: profile.teamId,
      label: profile.name || profile.slug,
      image: profile.image,
      slug: profile.slug,
    }));

  // Add platform option if user is admin
  if (isAdmin) {
    teamsAndUserProfiles.push({
      platform: true,
      label: "Platform",
      image: null,
      slug: null,
      teamId: null,
    });
  }

  const handleTeamSelect = (teamData: typeof teamsAndUserProfiles[0]) => {
    onTeamSelect(teamData.teamId);
    openChange(false);
  };

  const handleClose = () => {
    openChange(false);
  };

  return (open &&
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full sm:max-w-md">
        {/* <DialogHeader>
          Select team or profile
        </DialogHeader> */}

        <h3 className="text-emphasis text-base font-medium leading-6" id="modal-title">
          {t("create_routing_form_on")}
        </h3>
        
        <div className="space-y-2 py-4">
          {teamsAndUserProfiles.map((team, index) => (
            <button
              key={`${team.teamId}-${index}`}
              onClick={() => handleTeamSelect(team)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Avatar 
                alt={team.label || ""} 
                imageSrc={team.image} 
                size="sm" 
              />
              <span className="font-medium text-sm">{team.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};