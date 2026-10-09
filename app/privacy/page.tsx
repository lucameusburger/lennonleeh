import type { Metadata } from "next";
import { EditableRegion, EditableText } from "@einblick/editor/react";
import { PrivacySettingsButton } from "../components/EinblickAnalyticsConsent";
import { getContent } from "../lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getContent();
  return {
    title: content.privacy.introduction.title,
    description: content.privacy.introduction.description,
  };
}

export default async function PrivacyPage() {
  const { content, pages } = await getContent();
  const { introduction, analytics } = content.privacy;
  const page = pages.privacy;

  return (
    <main className="fixed inset-x-0 top-0 bottom-[var(--einblick-editor-bottom-offset,0px)] overflow-y-auto bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <EditableText
          editInline
          as="h1"
          binding={page.binding("introduction.title")}
          placeholder="Privacy title"
          className="text-4xl font-semibold"
        >
          {introduction.title}
        </EditableText>
        <div className="mt-8 space-y-5 leading-7 text-white/80">
          <p>
            <EditableText
              editInline
              as="span"
              binding={page.binding("introduction.controller")}
              placeholder="Controller information"
            >
              {introduction.controller}
            </EditableText>{" "}
            <EditableRegion
              as="span"
              className="inline-block"
              binding={page.binding("introduction.email")}
            >
              <a
                className="underline underline-offset-4"
                href={`mailto:${introduction.email}`}
              >
                {introduction.email}
              </a>
            </EditableRegion>
            .
          </p>
          <EditableText
            editInline
            as="p"
            binding={page.binding("analytics.consent")}
            placeholder="Analytics consent information"
          >
            {analytics.consent}
          </EditableText>
          <EditableText
            editInline
            as="p"
            binding={page.binding("analytics.collection")}
            placeholder="Data collection information"
          >
            {analytics.collection}
          </EditableText>
          <EditableText
            editInline
            as="p"
            binding={page.binding("analytics.retention")}
            placeholder="Retention information"
          >
            {analytics.retention}
          </EditableText>
          <EditableText
            editInline
            as="p"
            binding={page.binding("analytics.portfolio")}
            placeholder="Portfolio analytics information"
          >
            {analytics.portfolio}
          </EditableText>
        </div>
        <div
          className="mt-10 border-t border-white/25 pt-6"
          data-einblick-chrome
        >
          <PrivacySettingsButton />
        </div>
      </div>
    </main>
  );
}
