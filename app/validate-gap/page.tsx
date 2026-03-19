import ValidateGapBoard from "@/components/validate-gap/validate-gap-board";
import { getSearchResponse } from "@/lib/verischolar/data";

export default async function ValidateGapPage() {
    const searchResponse = await getSearchResponse("");

    return <ValidateGapBoard initialSearchResponse={searchResponse} />;
}