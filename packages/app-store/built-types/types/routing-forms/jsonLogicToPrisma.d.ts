type LogicData = Partial<Record<keyof typeof OPERATOR_MAP, any>>;
export type JsonLogicQuery = {
    logic: {
        and?: LogicData[];
        or?: LogicData[];
        "!"?: {
            and?: LogicData[];
            or?: LogicData[];
        };
    } | null;
};
type PrismaWhere = {
    AND?: ReturnType<typeof convertQueriesToPrismaWhereClause>[];
    OR?: ReturnType<typeof convertQueriesToPrismaWhereClause>[];
    NOT?: PrismaWhere;
};
declare const OPERATOR_MAP: {
    "==": {
        operator: string;
        secondaryOperand: null;
    };
    in: {
        operator: string;
        secondaryOperand: null;
    };
    "!=": {
        operator: string;
        secondaryOperand: null;
    };
    "!": {
        operator: string;
        secondaryOperand: string;
    };
    "!!": {
        operator: string;
        secondaryOperand: string;
    };
    ">": {
        operator: string;
        secondaryOperand: null;
    };
    ">=": {
        operator: string;
        secondaryOperand: null;
    };
    "<": {
        operator: string;
        secondaryOperand: null;
    };
    "<=": {
        operator: string;
        secondaryOperand: null;
    };
    all: {
        operator: string;
        secondaryOperand: null;
    };
};
declare const convertQueriesToPrismaWhereClause: (logicData: LogicData) => {
    NOT: {
        OR: {
            response: {
                [x: string]: any;
                path: any[];
            };
        }[];
    } | {
        response: {
            [x: string]: any;
            path: any[];
        };
    };
    OR?: undefined;
    response?: undefined;
} | {
    OR: {
        response: {
            [x: string]: any;
            path: any[];
        };
    }[];
    NOT?: undefined;
    response?: undefined;
} | {
    response: {
        [x: string]: any;
        path: any[];
    };
    NOT?: undefined;
    OR?: undefined;
} | undefined;
export declare const jsonLogicToPrisma: (query: JsonLogicQuery) => PrismaWhere;
export {};
//# sourceMappingURL=jsonLogicToPrisma.d.ts.map