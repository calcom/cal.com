import type { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { getData } from "../../page";

type PageProps = Readonly<{
	params: Params;
}>;

const Page = ({ params }: PageProps) => {
	await getData(params, true);

	return null;
};
	
export default Page;