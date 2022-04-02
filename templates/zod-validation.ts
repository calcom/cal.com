// import { withValidation } from "next-validations";
// import { z } from "zod";

// import { _ModelModel as Model } from "@calcom/prisma/zod";

// export const schemaModelBaseBodyParams = Model.omit({ id: true, userId: true, createdAt: true }).partial();

// const schemaModelRequiredParams = z.object({
//   email: z.string().email(),
// });

// export const schemaModelBodyParams = schemaModelBaseBodyParams.merge(schemaModelRequiredParams);

// export const schemaModelPublic = Model.omit({
//   id: true,
//   userId: true,
// });

// export const withValidModel = withValidation({
//   schema: schemaModelBodyParams,
//   type: "Zod",
//   mode: "body",
// });
