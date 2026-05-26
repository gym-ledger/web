import { apiClient } from "@/lib/api-client";

export interface WeightEntry {
  id: string;
  weight: number;
  day: string; // YYYY-MM-DD
}

export interface WeightMovingAverage {
  id: string;
  three_day_moving_average: number | null;
  seven_day_moving_average: number | null;
  day: string;
}

export interface WeightRangeData {
  weight_entries: WeightEntry[];
  weight_moving_averages: WeightMovingAverage[];
}

export interface WeightView {
  id: string;
  name: string;
  from: string; // YYYY-MM-DD
  to: string | "now";
}

export async function fetchWeightForDate(isoDate: string): Promise<WeightRangeData> {
  return apiClient.get<WeightRangeData>(
    `/user/weight/view?date=${encodeURIComponent(isoDate)}`
  );
}

// Fetches weight data for an arbitrary range by chunking into 30-day windows
export async function fetchWeightRange(from: string, to: string): Promise<WeightRangeData> {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffDays = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 30) {
    const data = await fetchWeightForDate(to);
    return {
      weight_entries: data.weight_entries.filter((e) => e.day >= from),
      weight_moving_averages: data.weight_moving_averages.filter((m) => m.day >= from),
    };
  }

  const allEntries: WeightEntry[] = [];
  const allAverages: WeightMovingAverage[] = [];
  const seenEntryIds = new Set<string>();
  const seenAvgIds = new Set<string>();

  let current = new Date(toDate);
  while (current >= fromDate) {
    const dateStr = current.toISOString().split("T")[0];
    const data = await fetchWeightForDate(dateStr);
    for (const entry of data.weight_entries) {
      if (!seenEntryIds.has(entry.id) && entry.day >= from) {
        seenEntryIds.add(entry.id);
        allEntries.push(entry);
      }
    }
    for (const avg of data.weight_moving_averages) {
      if (!seenAvgIds.has(avg.id) && avg.day >= from) {
        seenAvgIds.add(avg.id);
        allAverages.push(avg);
      }
    }
    current.setDate(current.getDate() - 30);
  }

  return {
    weight_entries: allEntries.sort((a, b) => a.day.localeCompare(b.day)),
    weight_moving_averages: allAverages.sort((a, b) => a.day.localeCompare(b.day)),
  };
}

export async function createWeightEntry(
  weight: number,
  date: string
): Promise<{ user_weight_entry: WeightEntry }> {
  return apiClient.post("/user/weight/entry", { weight, date });
}

export async function updateWeightEntry(
  id: string,
  weight: number
): Promise<{ user_weight_entry: WeightEntry }> {
  return apiClient.put(`/user/weight/entry/${id}`, { weight });
}
