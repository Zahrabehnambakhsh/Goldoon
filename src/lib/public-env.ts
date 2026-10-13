// Public (browser-safe) settings read at runtime instead of build time, so one Docker image
// works on any host: the server writes them into the page and the browser reads them back.

export type PublicEnv = {
  supabaseUrl: string;
  supabaseKey: string;
  /** SIGNUP_OPEN=true lets anyone register with email; otherwise only invited users log in. */
  signupOpen: boolean;
  /** PHONE_LOGIN=true adds SMS login (needs Kavenegar). Only offered when signupOpen is on. */
  phoneLogin: boolean;
  /** GOOGLE_LOGIN=true adds "Continue with Google" (needs the Google provider in Supabase). */
  googleLogin: boolean;
};

const EMPTY: PublicEnv = {
  supabaseUrl: "",
  supabaseKey: "",
  signupOpen: false,
  phoneLogin: false,
  googleLogin: false,
};

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
      phoneLogin: process.env.SIGNUP_OPEN === "true" && process.env.PHONE_LOGIN === "true",
      googleLogin: process.env.SIGNUP_OPEN === "true" && process.env.GOOGLE_LOGIN === "true",
    };
  }
  return { ...EMPTY, ...window.__GOLDOON_ENV__ };
}

/** Inline script that hands the server's public settings to the browser. */
export function publicEnvScript(): string {
  return `window.__GOLDOON_ENV__=${JSON.stringify(getPublicEnv()).replace(/</g, "\\u003c")};`;
}
