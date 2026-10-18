// Optional analytics: Microsoft Clarity (recordings, heatmaps) and PostHog (events, funnels).
// Both stay off until their ids are set as environment variables on the server:
//   CLARITY_ID    the Clarity project id
//   POSTHOG_KEY   the PostHog project API key (starts with "phc_")
//   POSTHOG_HOST  optional; defaults to https://us.i.posthog.com (use https://eu.i.posthog.com for the EU cloud)
// Users are identified by their anonymous account id only, never by email or name, and every typed
// value is masked in recordings.

import { getPublicEnv } from "@/lib/public-env";

type PostHog = typeof import("posthog-js").default;

let posthog: PostHog | null = null;
let started = false;
// PostHog loads lazily, so calls made before it is ready (the account id right at startup, the
// first events) wait here and run as soon as it is.
let queue: Array<(ph: PostHog) => void> = [];
let postHogEnabled = false;

function withPostHog(fn: (ph: PostHog) => void) {
  if (posthog) fn(posthog);
  else if (postHogEnabled && queue.length < 50) queue.push(fn);
}

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

function startClarity(id: string) {
  if (window.clarity) return;
  // Standard Clarity snippet.
  const clarity = function (...args: unknown[]) {
    (clarity.q = clarity.q || []).push(args);
  } as NonNullable<Window["clarity"]>;
  window.clarity = clarity;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function startAnalytics() {
  if (started || typeof window === "undefined") return;
  started = true;
  const { clarityId, posthogKey, posthogHost } = getPublicEnv();

  if (clarityId) startClarity(clarityId);

  if (posthogKey) {
    postHogEnabled = true;
    // Loaded on demand so it never slows down the first paint.
    import("posthog-js")
      .then(({ default: ph }) => {
        ph.init(posthogKey, {
          api_host: posthogHost || "https://us.i.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: "history_change", // the app is a single-page app
          session_recording: { maskAllInputs: true, maskTextSelector: "[data-ph-mask]" },
        });
        posthog = ph;
        const waiting = queue;
        queue = [];
        waiting.forEach((fn) => fn(ph));
      })
      .catch(() => {
        // Blocked by an ad blocker or the network: the app works the same without it.
        postHogEnabled = false;
        queue = [];
      });
  }
}

/** Ties the visitor to their account id (no personal data). */
export function identifyUser(userId: string) {
  window.clarity?.("identify", userId);
  withPostHog((ph) => ph.identify(userId));
}

export function resetAnalyticsUser() {
  withPostHog((ph) => ph.reset());
}

/** Records one named event, e.g. track("plant_added", { type: "indoor" }). */
export function track(event: string, props?: Record<string, string | number | boolean | null>) {
  try {
    withPostHog((ph) => ph.capture(event, props));
    window.clarity?.("event", event);
  } catch {
    // never let analytics break the app
  }
}
