export const isKeyInObject = <T extends object>(k: PropertyKey, o: T): k is keyof T => k in o;
