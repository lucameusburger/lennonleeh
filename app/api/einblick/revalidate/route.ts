import { createEinblickRevalidateHandler } from "@einblick/sdk/next/cache";
import { einblickTags } from "@/app/lib/einblick-cache";

export const POST = createEinblickRevalidateHandler({
  tags: einblickTags,
  secret: process.env.EINBLICK_REVALIDATE_SECRET,
});
