import "server-only";

import { getEinblickAssetUrl } from "@einblick/sdk";
import { cache } from "react";
import { getContent } from "./content";

export const getPortfolioPdfAsset = cache(async () => {
  const { content } = await getContent();
  const pdf = content.portfolio.dossier.pdf;
  const url = getEinblickAssetUrl(pdf);
  return pdf && url ? { ...pdf, url } : null;
});
