/// <reference types="react" />
import { within } from "@testing-library/react";
import type { FormBuilder } from "./FormBuilder";
export interface FieldProps {
    fieldType: string;
    identifier: string;
    label: string;
}
type FormBuilderProps = React.ComponentProps<typeof FormBuilder>;
export declare const mockProps: FormBuilderProps;
export declare const getLocationBookingField: () => {
    type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
    name: string;
    label?: string | undefined;
    options?: {
        label: string;
        value: string;
    }[] | undefined;
    maxLength?: number | undefined;
    defaultLabel?: string | undefined;
    defaultPlaceholder?: string | undefined;
    labelAsSafeHtml?: string | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    getOptionsAt?: string | undefined;
    optionsInputs?: Record<string, {
        type: "text" | "address" | "phone";
        required?: boolean | undefined;
        placeholder?: string | undefined;
    }> | undefined;
    minLength?: number | undefined;
    variant?: string | undefined;
    variantsConfig?: {
        variants: Record<string, {
            fields: {
                type: "number" | "boolean" | "text" | "address" | "select" | "textarea" | "name" | "url" | "multiselect" | "email" | "phone" | "multiemail" | "checkbox" | "radio" | "radioInput";
                name: string;
                label?: string | undefined;
                maxLength?: number | undefined;
                labelAsSafeHtml?: string | undefined;
                placeholder?: string | undefined;
                required?: boolean | undefined;
                minLength?: number | undefined;
            }[];
        }>;
    } | undefined;
    views?: {
        label: string;
        id: string;
        description?: string | undefined;
    }[] | undefined;
    hideWhenJustOneOption?: boolean | undefined;
    hidden?: boolean | undefined;
    editable?: "system" | "system-but-optional" | "system-but-hidden" | "user" | "user-readonly" | undefined;
    sources?: {
        label: string;
        type: string;
        id: string;
        editUrl?: string | undefined;
        fieldRequired?: boolean | undefined;
    }[] | undefined;
    disableOnPrefill?: boolean | undefined;
};
export declare const setMockMatchMedia: () => void;
export declare const setMockIntersectionObserver: () => void;
type TestingLibraryElement = ReturnType<typeof within>;
export declare const pageObject: {
    openAddFieldDialog: () => {
        getByLabelText<T extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T;
        getAllByLabelText<T_1 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_1[];
        queryByLabelText<T_2 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_2 | null;
        queryAllByLabelText<T_3 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_3[];
        findByLabelText<T_4 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_4>;
        findAllByLabelText<T_5 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_5[]>;
        getByPlaceholderText<T_6 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_6;
        getAllByPlaceholderText<T_7 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_7[];
        queryByPlaceholderText<T_8 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_8 | null;
        queryAllByPlaceholderText<T_9 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_9[];
        findByPlaceholderText<T_10 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_10>;
        findAllByPlaceholderText<T_11 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_11[]>;
        getByText<T_12 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_12;
        getAllByText<T_13 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_13[];
        queryByText<T_14 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_14 | null;
        queryAllByText<T_15 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_15[];
        findByText<T_16 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_16>;
        findAllByText<T_17 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_17[]>;
        getByAltText<T_18 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_18;
        getAllByAltText<T_19 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_19[];
        queryByAltText<T_20 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_20 | null;
        queryAllByAltText<T_21 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_21[];
        findByAltText<T_22 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_22>;
        findAllByAltText<T_23 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_23[]>;
        getByTitle<T_24 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_24;
        getAllByTitle<T_25 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_25[];
        queryByTitle<T_26 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_26 | null;
        queryAllByTitle<T_27 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_27[];
        findByTitle<T_28 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_28>;
        findAllByTitle<T_29 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_29[]>;
        getByDisplayValue<T_30 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_30;
        getAllByDisplayValue<T_31 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_31[];
        queryByDisplayValue<T_32 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_32 | null;
        queryAllByDisplayValue<T_33 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_33[];
        findByDisplayValue<T_34 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_34>;
        findAllByDisplayValue<T_35 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_35[]>;
        getByRole<T_36 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_36;
        getAllByRole<T_37 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_37[];
        queryByRole<T_38 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_38 | null;
        queryAllByRole<T_39 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_39[];
        findByRole<T_40 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_40>;
        findAllByRole<T_41 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_41[]>;
        getByTestId<T_42 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_42;
        getAllByTestId<T_43 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_43[];
        queryByTestId<T_44 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_44 | null;
        queryAllByTestId<T_45 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_45[];
        findByTestId<T_46 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_46>;
        findAllByTestId<T_47 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_47[]>;
    } & {
        getByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement;
        getAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        queryByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement | null;
        queryAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        findByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement;
        getAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        queryByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement | null;
        queryAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        findByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement;
        getAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement[];
        queryByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement | null;
        queryAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement[];
        findByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    };
    openEditFieldDialog: ({ identifier }: {
        identifier: string;
    }) => {
        getByLabelText<T extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T;
        getAllByLabelText<T_1 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_1[];
        queryByLabelText<T_2 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_2 | null;
        queryAllByLabelText<T_3 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_3[];
        findByLabelText<T_4 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_4>;
        findAllByLabelText<T_5 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_5[]>;
        getByPlaceholderText<T_6 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_6;
        getAllByPlaceholderText<T_7 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_7[];
        queryByPlaceholderText<T_8 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_8 | null;
        queryAllByPlaceholderText<T_9 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_9[];
        findByPlaceholderText<T_10 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_10>;
        findAllByPlaceholderText<T_11 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_11[]>;
        getByText<T_12 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_12;
        getAllByText<T_13 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_13[];
        queryByText<T_14 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_14 | null;
        queryAllByText<T_15 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined): T_15[];
        findByText<T_16 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_16>;
        findAllByText<T_17 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_17[]>;
        getByAltText<T_18 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_18;
        getAllByAltText<T_19 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_19[];
        queryByAltText<T_20 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_20 | null;
        queryAllByAltText<T_21 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_21[];
        findByAltText<T_22 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_22>;
        findAllByAltText<T_23 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_23[]>;
        getByTitle<T_24 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_24;
        getAllByTitle<T_25 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_25[];
        queryByTitle<T_26 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_26 | null;
        queryAllByTitle<T_27 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_27[];
        findByTitle<T_28 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_28>;
        findAllByTitle<T_29 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_29[]>;
        getByDisplayValue<T_30 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_30;
        getAllByDisplayValue<T_31 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_31[];
        queryByDisplayValue<T_32 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_32 | null;
        queryAllByDisplayValue<T_33 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_33[];
        findByDisplayValue<T_34 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_34>;
        findAllByDisplayValue<T_35 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_35[]>;
        getByRole<T_36 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_36;
        getAllByRole<T_37 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_37[];
        queryByRole<T_38 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_38 | null;
        queryAllByRole<T_39 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined): T_39[];
        findByRole<T_40 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_40>;
        findAllByRole<T_41 extends HTMLElement = HTMLElement>(role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_41[]>;
        getByTestId<T_42 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_42;
        getAllByTestId<T_43 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_43[];
        queryByTestId<T_44 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_44 | null;
        queryAllByTestId<T_45 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined): T_45[];
        findByTestId<T_46 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_46>;
        findAllByTestId<T_47 extends HTMLElement = HTMLElement>(id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined): Promise<T_47[]>;
    } & {
        getByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement;
        getAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        queryByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement | null;
        queryAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        findByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByLabelText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByPlaceholderText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement;
        getAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        queryByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement | null;
        queryAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined) => HTMLElement[];
        findByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").SelectorMatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByAltText: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByTitle: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByDisplayValue: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement;
        getAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement[];
        queryByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement | null;
        queryAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined) => HTMLElement[];
        findByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByRole: (role: import("@testing-library/react").ByRoleMatcher, options?: import("@testing-library/react").ByRoleOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
        getByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement;
        getAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        queryByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement | null;
        queryAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined) => HTMLElement[];
        findByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement>;
        findAllByTestId: (id: import("@testing-library/react").Matcher, options?: import("@testing-library/react").MatcherOptions | undefined, waitForElementOptions?: import("@testing-library/react").waitForOptions | undefined) => Promise<HTMLElement[]>;
    };
    dialog: {
        isFieldShowingAsRequired: ({ dialog }: {
            dialog: TestingLibraryElement;
        }) => boolean;
        makeFieldOptional: ({ dialog }: {
            dialog: TestingLibraryElement;
        }) => void;
        makeFieldRequired: ({ dialog }: {
            dialog: TestingLibraryElement;
        }) => void;
        queryIdentifierInput: ({ dialog }: {
            dialog: TestingLibraryElement;
        }) => any;
        saveField: ({ dialog }: {
            dialog: ReturnType<typeof within>;
        }) => void;
        openFieldTypeDropdown: ({ dialog }: {
            dialog: TestingLibraryElement;
        }) => void;
        fieldTypeDropdown: {
            queryOptionForFieldType: ({ dialog, fieldType, }: {
                dialog: TestingLibraryElement;
                fieldType: string;
            }) => HTMLElement | null;
            queryAllOptions: ({ dialog }: {
                dialog: TestingLibraryElement;
            }) => HTMLElement[];
        };
        selectFieldType: ({ dialog, fieldType }: {
            dialog: TestingLibraryElement;
            fieldType: string;
        }) => void;
        fillInFieldIdentifier: ({ dialog, identifier, }: {
            dialog: TestingLibraryElement;
            identifier: string;
        }) => void;
        fillInFieldLabel: ({ dialog, label, fieldType, }: {
            dialog: TestingLibraryElement;
            label: string;
            fieldType: string;
        }) => void;
        close: ({ dialog }: {
            dialog: TestingLibraryElement;
        }) => void;
    };
    queryDeleteButton: ({ identifier }: {
        identifier: string;
    }) => HTMLElement | null;
    getDeleteButton: ({ identifier }: {
        identifier: string;
    }) => HTMLElement | null;
    deleteField: ({ identifier }: {
        identifier: string;
    }) => void;
    queryToggleButton: ({ identifier }: {
        identifier: string;
    }) => HTMLElement | null;
    getToggleButton: ({ identifier }: {
        identifier: string;
    }) => HTMLElement;
    toggleField: ({ identifier }: {
        identifier: string;
    }) => void;
};
export declare const verifier: {
    verifyFieldAddition: (props: FieldProps) => Promise<void>;
    verifyIdentifierChange: (props: {
        newIdentifier: string;
        existingIdentifier: string;
    }) => Promise<void>;
    verifyFieldDeletion: ({ identifier }: {
        identifier: string;
    }) => Promise<void>;
    verifyFieldToggle: ({ identifier }: {
        identifier: string;
    }) => Promise<void>;
    verifyThatFieldCanBeMarkedOptional: ({ identifier }: {
        identifier: string;
    }) => Promise<void>;
};
export declare const expectScenario: {
    toHaveFieldTypeDropdownDisabled: ({ dialog }: {
        dialog: TestingLibraryElement;
    }) => void;
    toHaveIdentifierChangeDisabled: ({ dialog }: {
        dialog: TestingLibraryElement;
    }) => void;
    toHaveRequirablityToggleDisabled: ({ dialog }: {
        dialog: TestingLibraryElement;
    }) => void;
    toHaveLabelChangeAllowed: ({ dialog }: {
        dialog: TestingLibraryElement;
    }) => void;
    toNotHaveDeleteButton: ({ identifier }: {
        identifier: string;
    }) => void;
    toNotHaveToggleButton: ({ identifier }: {
        identifier: string;
    }) => void;
    toHaveSourceBadge: ({ identifier, sourceLabel }: {
        identifier: string;
        sourceLabel: string;
    }) => void;
    toHaveRequiredBadge: ({ identifier }: {
        identifier: string;
    }) => void;
};
export {};
//# sourceMappingURL=testUtils.d.ts.map