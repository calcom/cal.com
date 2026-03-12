import type { Field } from "../types/types";

const getFieldIdentifier = (field: Field) => field.identifier || field.label || field.id;

export default getFieldIdentifier;
