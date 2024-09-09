export interface TroubleshooterProps {
    /**
     * If month is NOT set as a prop on the component, we expect a query parameter
     * called `month` to be present on the url. If that is missing, the component will
     * default to the current month.
     * @note In case you're using a client side router, please pass the value in as a prop,
     * since the component will leverage window.location, which might not have the query param yet.
     * @format YYYY-MM.
     * @optional
     */
    month: string | null;
    selectedDate?: Date;
}
//# sourceMappingURL=types.d.ts.map