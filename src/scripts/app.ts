import type { PackageInfo } from "../lib/listing";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelectorAll<T>(selector);

const PACKAGES: PackageInfo[] = JSON.parse($("packageData").textContent!);
const LISTING_URL = document.body.dataset.listingUrl!;

$<HTMLInputElement>("searchInput").addEventListener("input", (e) => {
  const query = (e.target as HTMLInputElement).value.toLowerCase();
  $$("tr[data-package-id]").forEach((row) => {
    const { packageName = "", packageId = "" } = row.dataset;
    row.hidden = !packageName.toLowerCase().includes(query) && !packageId.toLowerCase().includes(query);
  });
});

$$(".copyButton").forEach((button) =>
  button.addEventListener("click", () => {
    const field = button.previousElementSibling as HTMLInputElement;
    field.select();
    navigator.clipboard.writeText(field.value);
    button.classList.add("accent");
    setTimeout(() => button.classList.remove("accent"), 1000);
  }),
);

$$(".addToVccButton").forEach((button) =>
  button.addEventListener("click", () =>
    window.location.assign(`vcc://vpm/addRepo?url=${encodeURIComponent(LISTING_URL)}`),
  ),
);

const listingHelp = $<HTMLDialogElement>("addListingToVccHelp");
$$(".listingHelpButton").forEach((button) => button.addEventListener("click", () => listingHelp.showModal()));

const rowMoreMenu = $("rowMoreMenu");
const downloadLink = $<HTMLAnchorElement>("rowMoreMenuDownload");
downloadLink.addEventListener("click", () => rowMoreMenu.hidePopover());
$$(".rowMenuButton").forEach((button) =>
  button.addEventListener("click", () => {
    const rect = button.getBoundingClientRect();
    rowMoreMenu.style.top = `${rect.bottom + 4}px`;
    rowMoreMenu.style.right = `${window.innerWidth - rect.right}px`;
    downloadLink.href = button.dataset.packageUrl!;
    rowMoreMenu.showPopover();
  }),
);

const packageInfoModal = $<HTMLDialogElement>("packageInfoModal");
const info = {
  name: $("packageInfoName"),
  id: $("packageInfoId"),
  version: $("packageInfoVersion"),
  description: $("packageInfoDescription"),
  author: $<HTMLAnchorElement>("packageInfoAuthor"),
  dependencies: $("packageInfoDependencies"),
  keywords: $("packageInfoKeywords"),
  license: $<HTMLAnchorElement>("packageInfoLicense"),
};

const createElement = (tag: string, text: string, ...classes: string[]) => {
  const el = document.createElement(tag);
  el.classList.add(...classes);
  el.textContent = text;
  return el;
};

$$(".rowPackageInfoButton").forEach((button) =>
  button.addEventListener("click", () => {
    const pkg = PACKAGES.find((p) => p.name === button.dataset.packageId)!;

    info.name.textContent = pkg.displayName ?? pkg.name;
    info.id.textContent = pkg.name;
    info.version.textContent = `v${pkg.version}`;
    info.description.textContent = pkg.description ?? "";
    info.author.textContent = pkg.author?.name ?? "";
    info.author.href = pkg.author?.url ?? "#";

    const keywords = pkg.keywords ?? [];
    info.keywords.parentElement!.classList.toggle("hidden", keywords.length === 0);
    info.keywords.replaceChildren(...keywords.map((k) => createElement("div", k, "me-2", "mb-2", "badge")));

    info.license.parentElement!.classList.toggle("hidden", !pkg.license && !pkg.licensesUrl);
    info.license.textContent = pkg.license || "See License";
    info.license.href = pkg.licensesUrl || "#";

    info.dependencies.replaceChildren(
      ...Object.entries(pkg.vpmDependencies ?? {}).map(([name, version]) =>
        createElement("li", `${name} @ ${version}`, "mb-2"),
      ),
    );

    packageInfoModal.showModal();
  }),
);
