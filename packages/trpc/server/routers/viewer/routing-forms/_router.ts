import { router } from "../../../trpc";

const NAMESPACE = "routingForms";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const routingFormsRouter = router({});
