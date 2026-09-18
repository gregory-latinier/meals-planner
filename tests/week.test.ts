import { describe, expect, test } from "vitest";
import {
  formatISOMonth,
  getStartOfMonth,
  parseMonth,
  parseWeekStart,
  shiftMonth,
} from "@/lib/week";

describe("week/date helpers", () => {
  test("parses valid month and rejects invalid month values", () => {
    expect(parseMonth("2026-09")).toBeTruthy();
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("2026-9")).toBeNull();
  });

  test("formats and shifts month in UTC", () => {
    const month = parseMonth("2026-12");
    expect(month).toBeTruthy();

    const shifted = shiftMonth(month as Date, 1);
    expect(formatISOMonth(shifted)).toBe("2027-01");
  });

  test("computes start of month and preserves week parsing behavior", () => {
    const date = new Date("2026-09-18T16:30:00.000Z");
    expect(formatISOMonth(getStartOfMonth(date))).toBe("2026-09");
    expect(parseWeekStart("2026-09-14")).toBeTruthy();
    expect(parseWeekStart("2026-09-15")).toBeNull();
  });
});
