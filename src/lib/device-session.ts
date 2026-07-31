import { supabase } from "@/integrations/supabase/client";

const KEY = "fpc_device_account";

type DeviceAccount = { email: string; password: string };

function readAccount(): DeviceAccount | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DeviceAccount) : null;
  } catch {
    return null;
  }
}

function createAccount(): DeviceAccount {
  const id = crypto.randomUUID();
  const account: DeviceAccount = {
    email: `device-${id}@plantcare.app`,
    password: `pc-${crypto.randomUUID()}`,
  };
  localStorage.setItem(KEY, JSON.stringify(account));
  return account;
}

/** Makes sure there's always a usable session so the app opens straight up. */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (data.user) return;

  let account = readAccount();
  if (account) {
    const { error } = await supabase.auth.signInWithPassword(account);
    if (!error) return;
  }

  account = createAccount();
  const { error } = await supabase.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { name: "کاربر گیاه‌دوست" } },
  });
  if (error) throw error;

  const { data: after } = await supabase.auth.getUser();
  if (!after.user) {
    await supabase.auth.signInWithPassword(account);
  }
}
