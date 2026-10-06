// Public (browser-safe) settings read at runtime instead of build time, so one Docker image
// works on any host: the server writes them into the page and the browser reads them back.

export type PublicEnv = {
  supabaseUrl: string;
  supabaseKey: string;
  /** SIGNUP_OPEN=true shows registration, mobile and Google login; otherwise only invited users log in. */
  signupOpen: boolean;
};

const EMPTY: PublicEnv = { supabaseUrl: "", supabaseKey: "", signupOpen: false };

declare global {
  interface Window {
    __GOLDOON_ENV__?: PublicEnv;
  }
}

export function getPublicEnv(): PublicEnv {
  if (typeof window === "undefined") {
    return {
      supabaseUrl: process.env.SUPABASE_URL ?? "",
      supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
      signupOpen: process.env.SIGNUP_OPEN === "true",
    };
  }
  return { ...EMPTY, ...window.__GOLDOON_ENV__ };
}

/** Inline script that hands the server's public settings to the browser. */
export function publicEnvScript(): string {
  return `window.__GOLDOON_ENV__=${JSON.stringify(getPublicEnv()).replace(/</g, "\\u003c")};`;
}
