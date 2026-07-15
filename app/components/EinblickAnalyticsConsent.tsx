"use client";

import type { AnalyticsConsent } from "@einblick/analytics";
import { Analytics } from "@einblick/analytics/next";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "einblick-analytics-consent";
const CONSENT_EVENT = "einblick-analytics-consent-change";
let memoryConsent: AnalyticsConsent = "unknown";

type PrivacyNavigator = Navigator & { globalPrivacyControl?: boolean };
type Panel = "summary" | "preferences" | null;

function isGlobalPrivacyControlEnabled() {
  return (
    typeof navigator !== "undefined" &&
    (navigator as PrivacyNavigator).globalPrivacyControl === true
  );
}

function readConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unknown";
  if (isGlobalPrivacyControlEnabled()) return "denied";

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : memoryConsent;
  } catch {
    return memoryConsent;
  }
}

function subscribe(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CONSENT_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CONSENT_EVENT, callback);
  };
}

function saveConsent(consent: Exclude<AnalyticsConsent, "unknown">) {
  const effectiveConsent = isGlobalPrivacyControlEnabled()
    ? "denied"
    : consent;
  memoryConsent = effectiveConsent;
  try {
    window.localStorage.setItem(STORAGE_KEY, effectiveConsent);
  } catch {
    // The in-memory decision still applies when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

function ChoiceButton({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`min-h-11 border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        primary
          ? "border-white bg-white text-black hover:bg-white/85"
          : "border-white/50 bg-transparent text-white hover:border-white hover:bg-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function EinblickAnalyticsConsent() {
  const consent = useSyncExternalStore<AnalyticsConsent>(
    subscribe,
    readConsent,
    () => "unknown",
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const gpcEnabled = isGlobalPrivacyControlEnabled();
  const activePanel = panel ?? (consent === "unknown" ? "summary" : null);

  const decide = (decision: "granted" | "denied") => {
    saveConsent(decision);
    setPanel(null);
  };

  const openPreferences = () => {
    setAnalyticsAllowed(consent === "granted" && !gpcEnabled);
    setPanel("preferences");
  };

  const savePreferences = () => {
    decide(analyticsAllowed && !gpcEnabled ? "granted" : "denied");
  };

  return (
    <>
      <Analytics consent={gpcEnabled ? "denied" : consent} />

      {activePanel ? (
        <section
          aria-label="Privacy choices"
          aria-modal="true"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[calc(100dvh-1.5rem)] max-w-3xl overflow-y-auto border border-white/40 bg-[#0a0a0a] text-white sm:inset-x-6 sm:bottom-6 sm:max-h-[calc(100dvh-3rem)]"
          role="dialog"
        >
          <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.16em] text-white/55">
                PRIVACY / MEASUREMENT
              </p>
              <h2 className="mt-2 text-xl font-medium tracking-tight">
                {activePanel === "preferences"
                  ? "Privacy preferences"
                  : "Your visit, your choice"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                Einblick can measure pseudonymous page views without analytics
                cookies. Nothing is collected until you choose. Read the{" "}
                <Link className="underline underline-offset-4" href="/privacy">
                  privacy information
                </Link>
                .
              </p>
            </div>

            <div className="font-mono text-[10px] tracking-[0.14em] text-white/45 sm:text-right">
              LLH / PORTFOLIO
            </div>
          </div>

          {activePanel === "preferences" ? (
            <div className="border-t border-white/25">
              <div className="grid border-b border-white/20 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="p-5 sm:p-6">
                  <h3 className="text-sm font-medium">Necessary storage</h3>
                  <p className="mt-1 text-xs leading-5 text-white/60">
                    Stores only this privacy choice on your device. It is not
                    used to track you and cannot be disabled here.
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/20 px-5 py-4 sm:border-l sm:border-t-0 sm:px-6">
                  <span className="font-mono text-xs text-white/55">REQUIRED</span>
                  <span
                    aria-label="Necessary storage enabled"
                    className="flex h-7 w-12 items-center justify-end border border-white bg-white p-1"
                    role="img"
                  >
                    <span className="size-4 bg-black" />
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-[minmax(0,1fr)_12rem]">
                <div className="p-5 sm:p-6">
                  <h3 className="text-sm font-medium">Einblick Analytics</h3>
                  <p className="mt-1 text-xs leading-5 text-white/60">
                    Optional, cookieless and pseudonymous page-view measurement.
                    No form content or portfolio PDF is collected.
                  </p>
                  {gpcEnabled ? (
                    <p className="mt-2 text-xs leading-5 text-white">
                      Global Privacy Control is enabled, so analytics remains off.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between border-t border-white/20 px-5 py-4 sm:border-l sm:border-t-0 sm:px-6">
                  <span className="font-mono text-xs text-white/55">
                    {analyticsAllowed && !gpcEnabled ? "ON" : "OFF"}
                  </span>
                  <button
                    aria-checked={analyticsAllowed && !gpcEnabled}
                    aria-label="Allow Einblick Analytics"
                    className={`flex h-7 w-12 items-center border p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      analyticsAllowed && !gpcEnabled
                        ? "justify-end border-white bg-white"
                        : "justify-start border-white/60 bg-transparent"
                    }`}
                    disabled={gpcEnabled}
                    onClick={() => setAnalyticsAllowed((allowed) => !allowed)}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`size-4 ${
                        analyticsAllowed && !gpcEnabled ? "bg-black" : "bg-white"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 border-t border-white/25 p-4 sm:grid-cols-3 sm:p-5">
            {activePanel === "summary" ? (
              <>
                <ChoiceButton onClick={() => decide("denied")}>
                  Reject analytics
                </ChoiceButton>
                <ChoiceButton onClick={openPreferences}>Customize</ChoiceButton>
                <ChoiceButton onClick={() => decide("granted")}>
                  Accept analytics
                </ChoiceButton>
              </>
            ) : (
              <>
                <ChoiceButton
                  onClick={() =>
                    setPanel(consent === "unknown" ? "summary" : null)
                  }
                >
                  Back
                </ChoiceButton>
                <div className="hidden sm:block" />
                <ChoiceButton onClick={savePreferences} primary>
                  Save preferences
                </ChoiceButton>
              </>
            )}
          </div>
        </section>
      ) : (
        <button
          aria-label="Open privacy choices"
          className="fixed bottom-4 right-4 z-50 border border-white/40 bg-black px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-white hover:text-black"
          onClick={openPreferences}
          type="button"
        >
          PRIVACY CHOICES
        </button>
      )}
    </>
  );
}
