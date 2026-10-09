import { defineSiteContent, field, page, section } from "@einblick/sdk/content";

export const content = defineSiteContent({
  website: "website",
  locales: ["de"],
  pages: {
    portfolio: page({
      label: "Portfolio",
      path: "/portfolio",
      sections: {
        dossier: section("Architecture dossier", {
          title: field.string({
            label: "Title",
            default: "Lennon Lee Hartmann / Architecture Dossier / 2021 - 2026",
          }),
          pdf: field.file({
            label: "Portfolio PDF",
            options: { allowedMimeTypes: ["application/pdf"] },
          }),
        }),
        controls: section("Viewer", {
          downloadLabel: field.string({
            label: "Download label",
            default: "Download PDF",
          }),
        }),
      },
    }),
    privacy: page({
      label: "Privacy",
      path: "/privacy",
      sections: {
        introduction: section("Introduction", {
          title: field.string({ default: "Privacy" }),
          description: field.string({
            default:
              "Privacy information for the Lennon Lee Hartmann portfolio.",
          }),
          controller: field.text({
            default:
              "The controller for this website is Lennon Lee Hartmann. Privacy questions and data-subject requests can be sent to",
          }),
          email: field.string({ default: "LennonLeeHartmann@gmail.com" }),
        }),
        analytics: section("Analytics", {
          consent: field.text({
            default:
              "This website can use Einblick Website Analytics to understand pseudonymous page views and improve the portfolio experience. Collection starts only after you accept analytics in the privacy choices. The legal basis is your consent under Article 6(1)(a) GDPR.",
          }),
          collection: field.text({
            default:
              "Einblick analytics is cookieless. The browser sends the site key, visited path, referrer and basic device information. IP address and user-agent are processed transiently to create short-lived pseudonymous measurements; they are not stored as raw event fields. The choice itself is stored locally in your browser and can be changed at any time through “Privacy choices” below.",
          }),
          retention: field.text({
            default:
              "The website operator is responsible for this processing and uses Einblick as a service provider. Detailed analytics data is retained for the configured period and never longer than 90 days. You can withdraw permission at any time; future collection then stops immediately. Withdrawal does not affect processing that was lawful before it.",
          }),
          portfolio: field.text({
            default:
              "The portfolio shown at the main address is delivered directly as a PDF. That raw PDF response does not run website analytics, so its views are not included in Einblick measurements.",
          }),
        }),
      },
    }),
  },
});
