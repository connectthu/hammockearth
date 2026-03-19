const TZ = "America/Toronto";

/**
 * Convert a naive "YYYY-MM-DDTHH:MM" string (Toronto local time) to a UTC ISO string.
 * This is safe regardless of the browser's own timezone setting.
 */
export function torontoNaiveToUTC(naive: string): string {
  const [y, mo, d] = naive.slice(0, 10).split("-").map(Number);
  const [h, min] = naive.slice(11, 16).split(":").map(Number);

  // Treat the naive datetime as UTC temporarily, then compute Toronto's offset at
  // that approximate instant so we can back-calculate the real UTC time.
  const approxUTCMs = Date.UTC(y, mo - 1, d, h, min);
  const torontoAtApprox = new Date(approxUTCMs).toLocaleString("sv-SE", { timeZone: TZ });
  // "YYYY-MM-DD HH:MM:SS"
  const [td, tt] = torontoAtApprox.split(" ");
  const [ty, tmo, tday] = td.split("-").map(Number);
  const [th, tmin] = tt.split(":").map(Number);
  const torontoAsUTCMs = Date.UTC(ty, tmo - 1, tday, th, tmin);

  const offsetMs = approxUTCMs - torontoAsUTCMs; // e.g. EDT → 4 * 3600 * 1000
  return new Date(approxUTCMs + offsetMs).toISOString();
}

/**
 * Convert a UTC ISO string to a "YYYY-MM-DDTHH:MM" string in Toronto local time,
 * suitable for use as a datetime-local input value.
 */
export function utcToTorontoNaive(iso: string): string {
  return new Date(iso)
    .toLocaleString("sv-SE", { timeZone: TZ })
    .slice(0, 16)
    .replace(" ", "T");
}
