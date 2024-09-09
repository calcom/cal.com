import type { CreateInnerContextOptions } from "../../createContext";
type CountryCodeOptions = {
    ctx: CreateInnerContextOptions;
};
export declare const countryCodeHandler: ({ ctx }: CountryCodeOptions) => Promise<{
    countryCode: string;
}>;
export default countryCodeHandler;
