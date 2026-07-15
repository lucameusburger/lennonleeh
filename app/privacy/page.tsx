import type { Metadata } from "next";
import { person } from "../seo";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy information for the Lennon Lee Hartmann portfolio.",
};

export default function PrivacyPage() {
  return (
    <main className="fixed inset-0 overflow-y-auto bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold">Privacy</h1>
        <div className="mt-8 space-y-5 leading-7 text-white/80">
          <p>
            The controller for this website is Lennon Lee Hartmann. Privacy
            questions and data-subject requests can be sent to{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${person.email}`}
            >
              {person.email}
            </a>
            .
          </p>
          <p>
            This website can use Einblick Website Analytics to understand
            pseudonymous page views and improve the portfolio experience.
            Collection starts only after you accept analytics in the privacy
            choices. The legal basis is your consent under Article 6(1)(a)
            GDPR.
          </p>
          <p>
            Einblick analytics is cookieless. The browser sends the site key,
            visited path, referrer and basic device information. IP address and
            user-agent are processed transiently to create short-lived
            pseudonymous measurements; they are not stored as raw event fields.
            The choice itself is stored locally in your browser and can be
            changed at any time through “Privacy choices”.
          </p>
          <p>
            The website operator is responsible for this processing and uses
            Einblick as a service provider. Detailed analytics data is retained
            for the configured period and never longer than 90 days. You can
            withdraw permission at any time; future collection then stops
            immediately. Withdrawal does not affect processing that was lawful
            before it.
          </p>
          <p>
            The portfolio shown at the main address is delivered directly as a
            PDF. That raw PDF response does not run website analytics, so its
            views are not included in Einblick measurements.
          </p>
        </div>
      </div>
    </main>
  );
}
