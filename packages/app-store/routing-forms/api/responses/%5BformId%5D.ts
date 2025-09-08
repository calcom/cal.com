import type { NextApiRequest, NextApiResponse } from "next";

import { getSerializableForm } from "../../lib/getSerializableForm";
import { getHumanReadableFieldResponseValue } from "../../lib/responseData/getHumanReadableFieldResponseValue";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { formId } = req.query;

  if (!formId || typeof formId !== "string") {
    res.status(400).json({ message: "Invalid formId" });
    return;
  }

  const prisma = (await import("@calcom/prisma")).default;
  const form = await prisma.app_RoutingForms_Form.findFirst({ where: { id: formId } });
  if (!form) {
    res.status(404).json({ message: "Form not found" });
    return;
  }

  const serializable = await getSerializableForm({ form });
  res.status(200).json({
    form: serializable,
    getHumanReadableFieldResponseValue: !!getHumanReadableFieldResponseValue,
  });
}
