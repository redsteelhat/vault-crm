/**
 * D1.1 — OS bildirimi: periyodik kontrol, due hatırlatıcılar için local notification.
 */
import { useEffect, useRef } from "react";
import { api, type Reminder } from "@/lib/api";

const POLL_MS = 60_000; // 1 dakika

function effectiveDueAt(r: Reminder): Date {
  const s = r.snooze_until;
  if (s && s.trim()) return new Date(s);
  return new Date(r.due_at);
}

export function useReminderNotifications() {
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval>;

    async function checkAndNotify() {
      if (!mounted) return;
      try {
        const { isPermissionGranted, requestPermission, sendNotification } = await import(
          "@tauri-apps/plugin-notification"
        );
        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === "granted";
        }
        if (!granted) return;

        const list = await api.reminderList();
        if (!Array.isArray(list)) return;
        const now = new Date();
        for (const r of list) {
          const due = effectiveDueAt(r);
          if (due <= now && !notifiedIds.current.has(r.id)) {
            notifiedIds.current.add(r.id);
            sendNotification({ title: "VaultCRM: Hatırlatıcı", body: r.title });
          }
        }
      } catch {
        // Tauri or notification not available
      }
    }

    checkAndNotify();
    intervalId = setInterval(checkAndNotify, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);
}
