import type { MetadataRoute } from "next";
import {
  absoluteUrl,
  lastUpdated,
  ogImage,
  portfolioPdfPath,
} from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: lastUpdated,
      changeFrequency: "monthly",
      priority: 1,
      images: [absoluteUrl(ogImage.path)],
    },
    {
      url: absoluteUrl(portfolioPdfPath),
      lastModified: lastUpdated,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
