import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { routingForms } from "@calcom/web/lib/templates/routing-forms";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession({ req, res });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  try {
    const { templateId, slug } = req.body;
    console.log(session.user.id);

    if (!templateId || !slug) {
      return res.status(400).json({ message: "Missing required field: templateId or slug" });
    }

    // Find the template either by ID or slug
    const templateForm = routingForms.find((form: any) =>
      templateId ? form.id === templateId : slugify(form.name) === slug
    );

    if (!templateForm) {
      return res.status(404).json({ message: "Template not found" });
    }

    console.log("Template found:", templateForm); // Debug log
    console.log("Creating form with data:", {
      // Debug log
      name: `${templateForm.name}`,
      userId: session.user.id,
      fields: Array.isArray(templateForm.template.fields) ? templateForm.template.fields : [],
      routes: Array.isArray(templateForm.template.routes) ? templateForm.template.routes : [],
    });

    const newForm = await prisma.app_RoutingForms_Form.create({
      data: {
        name: `${templateForm.name}`,
        description: templateForm.description || "",
        disabled: false,
        userId: session.user.id,
        fields: Array.isArray(templateForm.template.fields) ? templateForm.template.fields : [],
        routes: Array.isArray(templateForm.template.routes) ? templateForm.template.routes : [],
        position: 0,
        settings: { emailOwnerOnSubmission: true },
        createdAt: new Date(),
        updatedAt: new Date(),
        teamId: null,
      },
    });

    return res.status(200).json(newForm);
  } catch (error) {
    console.error("Detailed error creating form:", error); // Enhanced error logging
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace"); // Stack trace
    return res.status(500).json({
      message: "Error creating form",
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined,
    });
  }
}
