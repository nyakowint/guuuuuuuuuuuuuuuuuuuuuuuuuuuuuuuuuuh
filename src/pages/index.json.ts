import { loadRepoListing } from "../lib/listing";

export async function GET() {
  return Response.json(await loadRepoListing());
}
