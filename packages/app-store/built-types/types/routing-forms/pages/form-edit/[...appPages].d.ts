/// <reference types="react" />
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { getServerSidePropsForSingleFormView as getServerSideProps } from "../../components/SingleForm";
export { getServerSideProps };
declare function FormEditPage({ form, appUrl, }: inferSSRProps<typeof getServerSideProps> & {
    appUrl: string;
}): JSX.Element;
declare namespace FormEditPage {
    var getLayout: (page: import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>>) => JSX.Element;
}
export default FormEditPage;
//# sourceMappingURL=%5B...appPages%5D.d.ts.map