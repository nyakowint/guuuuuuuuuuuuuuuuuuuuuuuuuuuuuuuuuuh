import { existsSync, readFileSync } from "node:fs";
import semver from "semver";
import source from "../../source.json";

interface Manifest {
  name: string;
  displayName?: string;
  description?: string;
  version: string;
  url: string;
  author?: { name?: string; url?: string };
  vpmDependencies?: Record<string, string>;
  keywords?: string[];
  license?: string;
  licensesUrl?: string;
}

export interface RepoListing {
  packages: Record<string, { versions: Record<string, Manifest> }>;
}

export interface PackageInfo extends Manifest {
  type: "Avatar" | "World" | "Any";
}

// CI writes the freshly built listing here; local dev falls back to the live one
const LISTING_PATH = process.env.LISTING_PATH ?? "listing/index.json";

export const listingInfo: {
  name: string;
  url: string;
  description?: string;
  author: { name: string; url?: string; email?: string };
  infoLink?: { url: string; text?: string };
  bannerUrl?: string;
} = source;

export async function loadRepoListing(): Promise<RepoListing> {
  if (existsSync(LISTING_PATH)) return JSON.parse(readFileSync(LISTING_PATH, "utf8"));
  return (await fetch(source.url)).json();
}

function packageType(deps: Record<string, string> = {}): PackageInfo["type"] {
  if ("com.vrchat.avatars" in deps) return "Avatar";
  if ("com.vrchat.worlds" in deps) return "World";
  return "Any";
}

export async function loadPackages(): Promise<PackageInfo[]> {
  const { packages } = await loadRepoListing();
  return Object.values(packages).map(({ versions }) => {
    const latest = versions[semver.rsort(Object.keys(versions))[0]];
    return { ...latest, type: packageType(latest.vpmDependencies) };
  });
}
