import * as followupsRepo from '../database/repositories/followups'
import { showBatchNotification, showFollowUpNotification } from './notifications'
import { sendToRenderer } from '../ipc/handlers'
import { IPC_CHANNELS } from '../ipc/channels'

let schedulerInterval: NodeJS.Timeout | null = null
let lastCheckDate: string | null = null

const CHECK_INTERVAL = 60 * 1000 // Check every minute
const MORNING_HOUR = 9 // Show batch notification at 9 AM

export function startScheduler(): void {
  console.log('Starting follow-up scheduler...')

  // Initial check
  checkFollowups()

  // Set up interval
  schedulerInterval = setInterval(checkFollowups, CHECK_INTERVAL)
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
    console.log('Follow-up scheduler stopped')
  }
}

function checkFollowups(): void {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const currentHour = now.getHours()

    // Check if we should show the morning batch notification
    if (lastCheckDate !== today && currentHour >= MORNING_HOUR) {
      const dueToday = followupsRepo.getDueTodayFollowups()
      const overdue = followupsRepo.getOverdueFollowups()
      
      const totalDue = dueToday.length + overdue.length

      if (totalDue > 0) {
        showBatchNotification(totalDue)
        
        // Send event to renderer
        sendToRenderer(IPC_CHANNELS.FOLLOWUP_REMINDER, {
          dueToday: dueToday.length,
          overdue: overdue.length
        })
      }

      lastCheckDate = today
    }

    // Check for specific follow-up times (within the current hour)
    const dueNow = followupsRepo.getDueTodayFollowups().filter((followup) => {
      const dueDate = new Date(followup.due_at)
      const dueHour = dueDate.getHours()
      const dueMinute = dueDate.getMinutes()
      
      // Check if due within the current minute
      return (
        dueHour === currentHour &&
        dueMinute === now.getMinutes()
      )
    })

    // Show individual notifications for items due now
    for (const followup of dueNow) {
      showFollowUpNotification(followup)
    }
  } catch (error) {
    console.error('Error checking follow-ups:', error)
  }
}

// Manual trigger for testing
export function triggerCheck(): void {
  checkFollowups()
}
