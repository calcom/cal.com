/// <reference types="react" />
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { getServerSideProps } from "./getServerSideProps";
export default function Router({ form, message }: inferSSRProps<typeof getServerSideProps>): JSX.Element;
export { getServerSideProps };
//# sourceMappingURL=%5B...appPages%5D.d.ts.map