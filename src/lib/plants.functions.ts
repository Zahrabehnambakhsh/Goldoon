import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { isTooSoon } from "./watering";
import type { StreakLog } from "./streak";

const PlantInput = z.object({
  name: z.string().min(1).max(80),
  latin_name: z.string().max(120).optional().nullable(),
  type: z.string().max(40).optional().nullable(),
  image_url: z.string().max(400000).optional().nullable(),
  watering_interval_days: z.number().int().min(1).max(365).default(7),
  last_watered: z.string(),
  light_level: z.enum(["low", "medium", "high"]).default("medium"),
  notes: z.string().max(500).optional().nullable(),
});

export const listPlants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** The whole plant catalog (~100 rows). The form loads it once and searches it on the device. */
export const listPlantCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plant_catalog")
      .select("name_fa, aliases, latin_name, type, light_level, watering_interval_days")
      .order("name_fa");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlantInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("plants")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const waterPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const today = new Date().toISOString().slice(0, 10);

    const { data: plant, error: readError } = await context.supabase
      .from("plants")
      .select("watering_interval_days, last_watered, overwatered_on")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!plant) throw new Error("گیاه پیدا نشد");

    // When was it last watered? Prefer the exact time from the log; fall back to the date.
    const { data: lastLog } = await context.supabase
      .from("watering_logs")
      .select("created_at")
      .eq("plant_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastAt = lastLog?.created_at
      ? new Date(lastLog.created_at)
      : new Date(`${plant.last_watered}T12:00:00Z`);
    const overwatered = isTooSoon(plant.watering_interval_days, lastAt, new Date());

    const { error } = await context.supabase
      .from("plants")
      .update({ last_watered: today, overwatered_on: overwatered ? today : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    // History is best-effort: watering still counts if the log table isn't available yet.
    await context.supabase
      .from("watering_logs")
      .insert({ user_id: context.userId, plant_id: data.id, watered_on: today });

    return {
      ok: true,
      overwatered,
      waitDays: plant.watering_interval_days,
      // Lets the client undo an accidental tap.
      previous: { last_watered: plant.last_watered, overwatered_on: plant.overwatered_on },
    };
  });

/** Undoes the latest watering of a plant (for accidental taps). */
export const undoWatering = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        last_watered: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        overwatered_on: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: lastLog } = await context.supabase
      .from("watering_logs")
      .select("id")
      .eq("plant_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastLog) await context.supabase.from("watering_logs").delete().eq("id", lastLog.id);

    const { error } = await context.supabase
      .from("plants")
      .update({ last_watered: data.last_watered, overwatered_on: data.overwatered_on })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("plants")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("گیاه پیدا نشد");
    return row;
  });

export const updatePlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlantInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { data: row, error } = await context.supabase
      .from("plants")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Watering history: total count, plus each watering (plant and date) from the last ~5 months. */
export const getWateringStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date();
    since.setDate(since.getDate() - 150);
    const [{ count, error: countError }, { data: rows, error: rowsError }] = await Promise.all([
      context.supabase.from("watering_logs").select("id", { count: "exact", head: true }),
      context.supabase
        .from("watering_logs")
        .select("plant_id, watered_on")
        .gte("watered_on", since.toISOString().slice(0, 10)),
    ]);
    if (countError || rowsError) {
      return { available: false, total: 0, dates: [] as string[], logs: [] as StreakLog[] };
    }
    const logs: StreakLog[] = (rows ?? []).map((r) => ({
      plant_id: r.plant_id,
      watered_on: r.watered_on,
    }));
    return { available: true, total: count ?? 0, dates: logs.map((l) => l.watered_on), logs };
  });

export const deletePlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("plants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    return data;
  });

const ProfileUpdateInput = z.object({
  name: z.string().trim().min(1, "نام لازم است").max(80),
  display_name: z.string().trim().min(1).max(40).optional(),
  family_name: z.string().trim().max(80).optional().nullable(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ نامعتبر")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "شماره نامعتبر")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileUpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      id: context.userId,
      name: data.name,
      ...(data.display_name ? { display_name: data.display_name } : {}),
      family_name: data.family_name || null,
      birth_date: data.birth_date ? data.birth_date : null,
      phone: data.phone || null,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await context.supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Saves the name the app uses to address the user (asked once after first login). */
export const setDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ display_name: z.string().trim().min(1, "یه اسم بنویس").max(40) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.display_name, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
