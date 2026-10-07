import { createEinblickCmsTags } from "@einblick/sdk/next/cache";
import {
  ASSET_RESOURCES,
  EINBLICK_WEBSITE,
  type EinblickResourceSlug,
} from "./einblick.generated";

export const einblickTags = createEinblickCmsTags<EinblickResourceSlug>({
  website: EINBLICK_WEBSITE,
  assetResources: ASSET_RESOURCES,
});
