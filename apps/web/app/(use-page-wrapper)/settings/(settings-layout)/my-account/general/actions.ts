"use server";

import { revalidateTag } from "next/cache";

const revalidateGetMe = () => {
  revalidateTag("viewer.me.get");
};

const revalidateTravelSchedules = () => {
  revalidateTag("viewer.travelSchedules.get");
};

export const revalidatePage = async () => {
  revalidateTravelSchedules();
  revalidateGetMe();
};
