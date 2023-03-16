import type { Field } from "../types/types";

const getFieldIdentifier = (field: Field) => field.identifier || field.label;

export default getFieldIdentifier;
