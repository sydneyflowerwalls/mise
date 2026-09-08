import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, dayOfWeek, formatWeekRange, nextWeekStart, startOfWeek } from "./week";

describe("week boundaries", () => {
  it("treats Sunday as the start of its own week", () => {
    const sunday = new Date(2026, 8, 6); // Sun 6 Sep 2026
    assert.equal(startOfWeek(sunday).getTime(), sunday.getTime());
  });

  it("rolls a Saturday back to the Sunday six days earlier", () => {
    const saturday = new Date(2026, 8, 12);
    assert.equal(startOfWeek(saturday).getTime(), new Date(2026, 8, 6).getTime());
  });

  it("rolls over at Sunday 00:00 with no timer", () => {
    const satLate = new Date(2026, 8, 12, 23, 59);
    const sunEarly = new Date(2026, 8, 13, 0, 1);
    assert.notEqual(startOfWeek(satLate).getTime(), startOfWeek(sunEarly).getTime());
    // Last week's "next" is now "this".
    assert.equal(nextWeekStart(satLate).getTime(), startOfWeek(sunEarly).getTime());
  });

  it("crosses a month boundary correctly", () => {
    const tue = new Date(2026, 8, 1); // Tue 1 Sep 2026
    assert.equal(startOfWeek(tue).getTime(), new Date(2026, 7, 30).getTime());
  });
});

describe("day codes", () => {
  it("maps dates to codes", () => {
    assert.equal(dayOfWeek(new Date(2026, 8, 6)), "SUN");
    assert.equal(dayOfWeek(new Date(2026, 8, 9)), "WED");
  });
});

describe("the live week header", () => {
  it("omits the repeated month within one month", () => {
    assert.equal(formatWeekRange(new Date(2026, 8, 6)), "Week of Sun 6 – Sat 12 Sep");
  });

  it("shows both months when the week straddles them", () => {
    assert.equal(formatWeekRange(new Date(2026, 7, 30)), "Week of Sun 30 Aug – Sat 5 Sep");
  });
});

describe("addDays", () => {
  it("does not mutate its argument", () => {
    const d = new Date(2026, 8, 6);
    addDays(d, 5);
    assert.equal(d.getDate(), 6);
  });
});
