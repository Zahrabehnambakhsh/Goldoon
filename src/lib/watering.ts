// Over-watering rule shared by the server (when a watering is logged) and the UI.

import { daysBetween } from "./fa";

/** Watering again before half of the interval has passed counts as too much water. */
export function isTooSoon(intervalDays: number, lastWateredAt: Date, now: Date): boolean {
  const hours = (now.getTime() - lastWateredAt.getTime()) / 3_600_000;
  return hours >= 0 && hours < (intervalDays * 24) / 2;
}

/**
 * A plant stays "over-watered" (shown in red) from the extra watering until its next
 * watering is due.
 */
export function overwaterInfo(
  plant: { overwatered_on?: string | null; last_watered: string; watering_interval_days: number },
  today = new Date(),
): { overwatered: boolean; waitDays: number } {
  const daysLeft = plant.watering_interval_days - daysBetween(today, new Date(plant.last_watered));
  return {
    overwatered: Boolean(plant.overwatered_on) && daysLeft > 0,
    waitDays: Math.max(0, daysLeft),
  };
}
