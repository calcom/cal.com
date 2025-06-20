"use server";

import { revalidateTag } from "next/cache";

export async function revalidateAttributesList() {
  revalidateTag("AttributeRepository.findAllByOrgIdWithOptions");
}

export async function revalidateOrganizationTeams() {
  revalidateTag("OrganizationRepository.getTeams");
}

export async function revalidateCurrentOrg() {
  revalidateTag("OrganizationRepository.findCurrentOrg");
}
