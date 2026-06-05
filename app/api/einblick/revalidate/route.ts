import { createEinblickRevalidateHandler } from "@einblick/sdk/next";
import { einblickTags } from "@/app/lib/einblick-cache";

export const POST = createEinblickRevalidateHandler({
  tags: einblickTags,
});
