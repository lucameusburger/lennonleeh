import "server-only";

import { createSiteContentClient } from "@einblick/sdk/content";
import { isEinblickDraftMode } from "@einblick/sdk/next";
import { cache } from "react";
import { content } from "../../content/einblick.content";
import { einblickTags } from "./einblick-cache";

const client = createSiteContentClient({
  manifest: content,
  cacheTags: einblickTags,
  preview: isEinblickDraftMode,
  requestInit: { next: { revalidate: 60 } },
});

export const getContent = cache(() => client.get());
