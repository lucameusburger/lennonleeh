import "server-only";

import { getEinblickAssetUrl } from "@einblick/sdk";
import { cache } from "react";
import { einblickTags } from "./einblick-cache";
import { createGeneratedEinblickClient } from "./einblick.generated";

const EINBLICK_REVALIDATE_SECONDS = 60;

export const getSiteSettings = cache(async () => {
  const einblick = createGeneratedEinblickClient({
    cacheTags: einblickTags,
    requestInit: { next: { revalidate: EINBLICK_REVALIDATE_SECONDS } },
  });
  const response = await einblick.request("site-settings", {
    fields: ["pdf"],
  });

  return response.record.fields;
});

export const getPortfolioPdfAsset = cache(async () => {
  const siteSettings = await getSiteSettings();
  const pdf = siteSettings.pdf;
  const url = getEinblickAssetUrl(pdf);

  if (!pdf || !url) {
    return null;
  }

  return {
    ...pdf,
    url,
  };
});
