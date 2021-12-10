const notEmpty = <T>(value: T): value is NonNullable<typeof value> => !!value;

export default notEmpty;
