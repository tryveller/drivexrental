import { createServerFn } from "@tanstack/react-start";

function normalisePhone(input: string) {
  const digits = input.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) throw new Error("Enter a valid 10-digit mobile number");
  return digits;
}

/**
 * Sends the login OTP. No SMS provider is wired in V1, so the code is
 * returned to the caller and shown as a demo code in the app.
 */
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => input)
  .handler(async ({ data }) => {
    const phone = normalisePhone(data.phone);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabaseAdmin.from("otp_requests").insert({
      phone,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error(error.message);
    return { phone, demoCode: code };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string }) => input)
  .handler(async ({ data }) => {
    const phone = normalisePhone(data.phone);
    const code = data.code.replace(/\D/g, "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { track } = await import("./drivex.server");

    const { data: rows } = await supabaseAdmin
      .from("otp_requests")
      .select("id, code, expires_at, consumed_at")
      .eq("phone", phone)
      .eq("code", code)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const otp = rows?.[0];
    if (!otp) throw new Error("That code is incorrect. Please try again.");
    if (new Date(otp.expires_at).getTime() < Date.now())
      throw new Error("That code has expired. Send a new one.");

    await supabaseAdmin
      .from("otp_requests")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otp.id);

    const email = `rider${phone}@riders.drivex.app`;
    const password = `dx_${crypto.randomUUID()}`;

    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { phone },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Could not create profile");
      await supabaseAdmin.from("customers").insert({ id: created.user.id, phone });
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "rider" });
      await track("mobile_verified", { phone }, { customerId: created.user.id });
    }

    return { email, password, phone };
  });

export const saveLocation = createServerFn({ method: "POST" })
  .inputValidator((input: { locality?: string; pinCode?: string }) => input)
  .handler(async ({ data }) => {
    const { track } = await import("./drivex.server");
    await track("location_shared", { ...data });
    return { ok: true };
  });