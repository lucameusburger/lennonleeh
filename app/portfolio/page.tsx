import type { Metadata } from "next";
import PdfPortfolioViewer from "../components/PdfPortfolioViewer";
import { getContent } from "../lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getContent();
  return {
    title: content.portfolio.dossier.title,
    alternates: { canonical: "/" },
    robots: { index: false, follow: true },
  };
}

export default async function PortfolioPage() {
  const { content, pages } = await getContent();
  return (
    <PdfPortfolioViewer
      key={content.portfolio.dossier.pdf?.url ?? "empty"}
      dossier={content.portfolio.dossier}
      downloadLabel={content.portfolio.controls.downloadLabel}
      bindings={pages.portfolio.bindings}
    />
  );
}
