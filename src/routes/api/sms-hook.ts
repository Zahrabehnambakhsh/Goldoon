import { createFileRoute } from "@tanstack/react-router";
import { sendOtpSms, verifyHookSignature } from "@/lib/sms.server";

// Supabase Auth calls this for every phone OTP (Authentication > Hooks > Send SMS hook).
export const Route = createFileRoute("/api/sms-hook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text();
        if (!verifyHookSignature(request.headers, payload)) {
          return hookError(401, "Invalid signature");
        }

        let data: { user?: { phone?: string }; sms?: { otp?: string } };
        try {
          data = JSON.parse(payload);
        } catch {
          return hookError(400, "Invalid JSON");
        }
        const phone = data.user?.phone;
        const otp = data.sms?.otp;
        if (!phone || !otp) return hookError(400, "Missing phone or otp");

        try {
          await sendOtpSms(phone, otp);
        } catch (err) {
          console.error("[sms-hook]", err);
          return hookError(500, "Failed to send SMS");
        }
        return Response.json({});
      },
    },
  },
});

function hookError(status: number, message: string) {
  return Response.json({ error: { http_code: status, message } }, { status });
}
