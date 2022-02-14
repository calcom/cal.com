import { PlusIcon } from "@heroicons/react/solid";
import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import SAMLConfiguration from "@ee/components/saml/Configuration";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell from "@components/Shell";
import MemberInvitationModal from "@components/team/MemberInvitationModal";
import MemberList from "@components/team/MemberList";
import TeamSettings from "@components/team/TeamSettings";
import TeamSettingsRightSidebar from "@components/team/TeamSettingsRightSidebar";
import { UpgradeToFlexibleProModal } from "@components/team/UpgradeToFlexibleProModal";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";

export function TeamSettingsPage() {
  return null;
}

export default TeamSettingsPage;
