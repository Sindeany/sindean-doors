/** Factory clock. Saudi factory calendar; not a general timezone setting. */
export const FACTORY_TIME_ZONE = "Asia/Riyadh";

/**
 * Calendar year in the factory timezone.
 * The instant is interpreted on the server. Callers must not pass a client clock.
 */
export function factoryCalendarYear(
  now: Date,
  timeZone: string = FACTORY_TIME_ZONE
): number {
  if (Number.isNaN(now.getTime())) {
    throw new Error("factory clock time is invalid");
  }
  const yearText = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone,
    year: "numeric",
  }).format(now);
  const year = Number(yearText);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error(`factory calendar year is invalid: ${yearText}`);
  }
  return year;
}
