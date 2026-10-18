// "Care streak": how many waterings in a row were done on time.
//
// Plants are not watered daily, so a streak of consecutive *days* makes no sense. Instead each
// watering is judged against that plant's own watering interval:
//   - on time:  the gap since the previous watering is between half the interval and the
//               interval plus a short grace period
//   - too late: the gap is longer than that, or the plant is overdue right now (a missed watering)
//   - too soon: the gap is under half the interval (the app warns "over-watered")
// The streak is the number of on-time waterings since the most recent too-late / too-soon / missed one.

export type StreakPlant = { id: string; watering_interval_days: number; last_watered: string };
export type StreakLog = { plant_id: string; watered_on: string };

const DAY = 86_400_000;
const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);

/** Extra days allowed after the due date before a watering counts as late. */
export function graceDays(intervalDays: number): number {
  return Math.max(1, Math.floor(intervalDays / 4));
}

type Event = { day: number; ok: boolean };

export function careStreak(plants: StreakPlant[], logs: StreakLog[], todayIso: string): number {
  const today = dayNumber(todayIso);
  const events: Event[] = [];

  for (const plant of plants) {
    const interval = plant.watering_interval_days;
    const grace = graceDays(interval);
    const days = Array.from(
      new Set(logs.filter((l) => l.plant_id === plant.id).map((l) => dayNumber(l.watered_on))),
    ).sort((a, b) => a - b);

    days.forEach((day, i) => {
      if (i === 0) {
        events.push({ day, ok: true }); // first recorded watering: nothing to compare with yet
        return;
      }
      const gap = day - days[i - 1];
      events.push({ day, ok: gap >= Math.ceil(interval / 2) && gap <= interval + grace });
    });

    // A plant that is overdue right now has a missed watering, dated the day it became late.
    const last = Math.max(dayNumber(plant.last_watered), days[days.length - 1] ?? -Infinity);
    if (today - last > interval + grace) {
      events.push({ day: last + interval + grace + 1, ok: false });
    }
  }

  events.sort((a, b) => b.day - a.day);
  let streak = 0;
  for (const e of events) {
    if (!e.ok) break;
    streak++;
  }
  return streak;
}
