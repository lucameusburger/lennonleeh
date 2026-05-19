const fallbackSiteOrigin = "https://lennonleeh.com";

function getSiteOrigin() {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    fallbackSiteOrigin;
  const originWithProtocol = /^https?:\/\//i.test(configuredOrigin)
    ? configuredOrigin
    : `https://${configuredOrigin}`;

  try {
    return new URL(originWithProtocol).origin;
  } catch {
    return fallbackSiteOrigin;
  }
}

export const siteOrigin = getSiteOrigin();
export const metadataBase = new URL(siteOrigin);

export const person = {
  name: "Lennon Lee Hartmann",
  alternateName: "Lennon Lee",
  email: "LennonLeeHartmann@gmail.com",
  phone: "+43 678 13 22 841",
  basedIn: "Vienna (AT) & Lustenau (AT)",
  birthDate: "1996-09-12",
} as const;

export const siteName = "Lennon Lee Hartmann";
export const pageTitle = "Lennon Lee Hartmann | Architecture Portfolio";
export const pageDescription =
  "Architecture dossier and portfolio of Lennon Lee Hartmann, an architect based in Vienna and Lustenau, with adaptive reuse, cultural spaces, housing, and competitions.";

export const ogImage = {
  path: "/lennonleeh-og.jpg",
  width: 1200,
  height: 630,
  alt: "Lennon Lee Hartmann architecture dossier 2020-2026",
} as const;

export const portfolioPdfPath = "/portfolio.pdf";
export const lastUpdated = "2026-05-19";

export function absoluteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}
