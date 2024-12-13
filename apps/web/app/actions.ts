"use server";

import { revalidatePath } from "next/cache";

export const revalidateSchedulePage = async (id: number) => {
  revalidatePath(`/availability/${id.toString()}`);
};
