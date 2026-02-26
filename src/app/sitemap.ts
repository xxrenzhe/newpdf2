import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { languages } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pdftools.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["/", ...TOOLS.map((tool) => tool.href)];
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  for (const route of routes) {
    for (const language of languages) {
      const suffix = language.code === "en" ? "" : `?lang=${language.code}`;
      const url = `${SITE_URL}${route}${suffix}`;
      if (seen.has(url)) continue;
      seen.add(url);

      entries.push({
        url,
        lastModified: now,
        changeFrequency: route === "/" ? "weekly" : "monthly",
        priority: route === "/" ? 1 : 0.8,
      });
    }
  }

  if (!seen.has(SITE_URL)) {
    entries.push({
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    });
  }

  return entries;
}
