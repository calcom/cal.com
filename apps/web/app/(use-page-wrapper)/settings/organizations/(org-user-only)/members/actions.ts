"use server";

import { revalidateTag } from "next/cache";

export async function revalidateAttributesList() {
  revalidateTag("viewer.attributes.list");
}

export async function revalidateOrganizationTeams() {
  revalidateTag("viewer.organizations.getTeams");
}

export async function revalidateCurrentOrg() {
  revalidateTag("OrganizationRepository.findCurrentOrg");
}
