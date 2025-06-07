import type { Field } from "../types/types";

const getFieldIdentifier = (field: Field) => field.id || field.identifier || field.label;

export default getFieldIdentifier;
