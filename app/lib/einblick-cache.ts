import { createEinblickCmsTags } from "@einblick/sdk/next/cache";

export const einblickTags = createEinblickCmsTags({
  // `site-settings` reads embed the portfolio PDF asset (URL, file name),
  // so file metadata changes notified under `files` must expire them too.
  fanOut: { files: ["site-settings"] },
});
