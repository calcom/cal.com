import type { ErrorInfo } from "react";
import React from "react";
declare class ErrorBoundary extends React.Component<{
    children: React.ReactNode;
    message?: string;
}, {
    error: Error | null;
    errorInfo: ErrorInfo | null;
}> {
    constructor(props: {
        children: React.ReactNode;
    } | Readonly<{
        children: React.ReactNode;
    }>);
    componentDidCatch?(error: Error, errorInfo: ErrorInfo): void;
    render(): string | number | boolean | React.ReactFragment | JSX.Element | null | undefined;
}
export default ErrorBoundary;
//# sourceMappingURL=ErrorBoundary.d.ts.map