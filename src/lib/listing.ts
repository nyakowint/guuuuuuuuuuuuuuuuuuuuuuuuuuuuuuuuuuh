import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import semver from "semver";
import source from "../../source.json";

interface Manifest {
  name: string;
  displayName?: string;
  description?: string;
  version: string;
  url: string;
  zipSHA256: string;
  author?: { name?: string; url?: string };
  vpmDependencies?: Record<string, string>;
  keywords?: string[];
  license?: string;
  licensesUrl?: string;
}

export interface PackageInfo extends Manifest {
  type: "Avatar" | "World" | "Any";
}

interface Release {
  assets: { name: string; browser_download_url: string }[];
}

export const listingInfo: {
  name: string;
  id: string;
  url: string;
  description?: string;
  author: { name: string; url?: string; email?: string };
  infoLink?: { url: string; text?: string };
  bannerUrl?: string;
  githubRepos: string[];
} = source;

const githubHeaders: HeadersInit = process.env.GITHUB_TOKEN
  ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  : {};

async function releaseZipUrls(repo: string) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, { headers: githubHeaders });
  if (!res.ok) {
    console.warn(`Skipping ${repo}: GitHub returned ${res.status}`);
    return [];
  }
  const releases: Release[] = await res.json();
  return releases.flatMap((r) => r.assets.filter((a) => a.name.endsWith(".zip")).map((a) => a.browser_download_url));
}

async function loadManifest(url: string): Promise<Manifest | undefined> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download ${url}: ${res.status}`);
  const zip = new Uint8Array(await res.arrayBuffer());
  const packageJson = unzipSync(zip, { filter: (file) => file.name === "package.json" })["package.json"];
  if (!packageJson) {
    console.warn(`Skipping ${url}: no package.json in zip`);
    return;
  }
  return {
    ...JSON.parse(strFromU8(packageJson)),
    url,
    zipSHA256: createHash("sha256").update(zip).digest("hex"),
  };
}

async function buildRepoListing() {
  const urls = (await Promise.all(listingInfo.githubRepos.map(releaseZipUrls))).flat();
  const manifests = (await Promise.all(urls.map(loadManifest))).filter((m) => m !== undefined);

  const packages: Record<string, { versions: Record<string, Manifest> }> = {};
  for (const manifest of manifests) {
    packages[manifest.name] ??= { versions: {} };
    packages[manifest.name].versions[manifest.version] = manifest;
  }

  const { name, id, url, author } = listingInfo;
  return { name, id, url, author: author.name, packages };
}

// Shared by index.html and index.json so releases are only downloaded once per build
let repoListing: ReturnType<typeof buildRepoListing> | undefined;
export const loadRepoListing = () => (repoListing ??= buildRepoListing());

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
