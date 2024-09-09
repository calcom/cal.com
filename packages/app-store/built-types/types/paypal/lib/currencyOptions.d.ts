export declare const currencyOptions: readonly [{
    readonly label: "United States dollar";
    readonly value: "USD";
}, {
    readonly label: "Australian dollar";
    readonly value: "AUD";
}, {
    readonly label: "Brazilian real 2";
    readonly value: "BRL";
}, {
    readonly label: "Canadian dollar";
    readonly value: "CAD";
}, {
    readonly label: "Chinese Renmenbi 3";
    readonly value: "CNY";
}, {
    readonly label: "Czech koruna";
    readonly value: "CZK";
}, {
    readonly label: "Danish krone";
    readonly value: "DKK";
}, {
    readonly label: "Euro";
    readonly value: "EUR";
}, {
    readonly label: "Hong Kong dollar";
    readonly value: "HKD";
}, {
    readonly label: "Hungarian forint 1";
    readonly value: "HUF";
}, {
    readonly label: "Israeli new shekel";
    readonly value: "ILS";
}, {
    readonly label: "Japanese yen 1";
    readonly value: "JPY";
}, {
    readonly label: "Malaysian ringgit 3";
    readonly value: "MYR";
}, {
    readonly label: "Mexican peso";
    readonly value: "MXN";
}, {
    readonly label: "New Taiwan dollar 1";
    readonly value: "TWD";
}, {
    readonly label: "New Zealand dollar";
    readonly value: "NZD";
}, {
    readonly label: "Norwegian krone";
    readonly value: "NOK";
}, {
    readonly label: "Philippine peso";
    readonly value: "PHP";
}, {
    readonly label: "Polish złoty";
    readonly value: "PLN";
}, {
    readonly label: "Pound sterling";
    readonly value: "GBP";
}, {
    readonly label: "Russian ruble";
    readonly value: "RUB";
}, {
    readonly label: "Singapore dollar";
    readonly value: "SGD";
}, {
    readonly label: "Swedish krona";
    readonly value: "SEK";
}, {
    readonly label: "Swiss franc";
    readonly value: "CHF";
}, {
    readonly label: "Thai baht";
    readonly value: "THB";
}];
type CurrencyCode = (typeof currencyOptions)[number]["value"];
export declare const currencySymbols: Record<CurrencyCode, string>;
export declare function isAcceptedCurrencyCode(currencyCode: string): currencyCode is CurrencyCode;
export {};
//# sourceMappingURL=currencyOptions.d.ts.map