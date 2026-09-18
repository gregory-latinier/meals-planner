export const dayValues = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type WeekDay = (typeof dayValues)[number];

export const dayDisplay: Record<WeekDay, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function isWeekDay(value: unknown): value is WeekDay {
  return typeof value === "string" && dayValues.includes(value as WeekDay);
}
