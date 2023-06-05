import { revalidatePath } from "next/cache";

export async function subteamsRevalidation(org: string) {
  return revalidatePath(`/api/organizations/${org}/subteams`);
}
