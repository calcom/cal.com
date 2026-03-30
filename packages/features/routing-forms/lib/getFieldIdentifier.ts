import type { Field } from "./types";

const getFieldIdentifier = (field: Field) => field.identifier || field.label;

export default getFieldIdentifier;
