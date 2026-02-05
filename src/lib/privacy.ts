/**
 * F2.3: Opt-in crash report preference.
 * Stored locally; when enabled, crash logs may be sent anonymously (feature TBD).
 */
const CRASH_REPORT_OPT_IN_KEY = "vaultcrm_crash_report_opt_in";

export function getCrashReportOptIn(): boolean {
  try {
    return localStorage.getItem(CRASH_REPORT_OPT_IN_KEY) === "true";
  } catch {
    return false;
  }
}

export function setCrashReportOptIn(value: boolean): void {
  try {
    localStorage.setItem(CRASH_REPORT_OPT_IN_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}
