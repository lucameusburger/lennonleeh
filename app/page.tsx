import PdfPortfolioViewer from "./components/PdfPortfolioViewer";
import {
  absoluteUrl,
  lastUpdated,
  ogImage,
  pageDescription,
  pageTitle,
  person,
  portfolioPdfPath,
  siteOrigin,
} from "./seo";

export default function Home() {
  const portfolioPdfUrl = absoluteUrl(portfolioPdfPath);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${siteOrigin}/#person`,
        name: person.name,
        alternateName: person.alternateName,
        email: person.email,
        telephone: person.phone,
        birthDate: person.birthDate,
        jobTitle: "Architect",
        address: [
          {
            "@type": "PostalAddress",
            addressLocality: "Vienna",
            addressCountry: "AT",
          },
          {
            "@type": "PostalAddress",
            addressLocality: "Lustenau",
            addressCountry: "AT",
          },
        ],
        alumniOf: [
          {
            "@type": "CollegeOrUniversity",
            name: "Technical University of Vienna",
          },
          {
            "@type": "CollegeOrUniversity",
            name: "University of Liechtenstein",
          },
          {
            "@type": "CollegeOrUniversity",
            name: "Bezalel Academy of Arts and Design",
          },
        ],
        knowsAbout: [
          "Architecture",
          "Adaptive reuse",
          "Competition design",
          "Urban planning",
          "Social housing",
          "Urban housing",
          "Cultural installations",
          "Stage design",
          "Spatial planning",
        ],
      },
      {
        "@type": "CreativeWork",
        "@id": `${siteOrigin}/#architecture-dossier`,
        name: "Lennon Lee Hartmann / Architecture Dossier 2020-2026",
        description: pageDescription,
        url: portfolioPdfUrl,
        image: absoluteUrl(ogImage.path),
        author: {
          "@id": `${siteOrigin}/#person`,
        },
        dateModified: lastUpdated,
        about: [
          "Metrics of Affection",
          "Yellow Brick Road",
          "My Neighbour Has (Almost) Everything",
          "Viertelhaus",
          "Studio Margarita",
          "Triple Plus Social Housing",
          "2 Haeuser am Platz",
          "Haus an Haus Social Pedagogical Center",
        ],
      },
      {
        "@type": "ProfilePage",
        "@id": `${siteOrigin}/#profile-page`,
        url: siteOrigin,
        name: pageTitle,
        description: pageDescription,
        inLanguage: "en",
        dateModified: lastUpdated,
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: absoluteUrl(ogImage.path),
          width: ogImage.width,
          height: ogImage.height,
          caption: ogImage.alt,
        },
        mainEntity: {
          "@id": `${siteOrigin}/#person`,
        },
        hasPart: {
          "@id": `${siteOrigin}/#architecture-dossier`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <noscript>
        <section>
          <h1>{pageTitle}</h1>
          <p>{pageDescription}</p>
          <p>
            {person.name} is based in {person.basedIn}. Download the
            architecture dossier PDF to view selected academic works,
            interdisciplinary practice, and recent competitions.
          </p>
          <a href={portfolioPdfPath}>Download Lennon Lee Hartmann portfolio PDF</a>
        </section>
      </noscript>
      <PdfPortfolioViewer />
    </>
  );
}
