import { Notification, app } from 'electron'
import type { FollowUpWithContact } from '../database/types'

export function showFollowUpNotification(followup: FollowUpWithContact): void {
  if (!Notification.isSupported()) {
    console.log('Notifications not supported on this platform')
    return
  }

  const notification = new Notification({
    title: 'Follow-up Reminder',
    body: `Time to follow up with ${followup.contact_name}${followup.reason ? `: ${followup.reason}` : ''}`,
    icon: undefined, // Will use app icon
    silent: false,
    urgency: 'normal'
  })

  notification.on('click', () => {
    // Focus the app window when notification is clicked
    const { BrowserWindow } = require('electron')
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
      // Send event to navigate to contact
      mainWindow.webContents.send('navigate:contact', followup.contact_id)
    }
  })

  notification.show()
}

export function showBatchNotification(count: number): void {
  if (!Notification.isSupported()) {
    return
  }

  const notification = new Notification({
    title: 'VaultCRM',
    body: `You have ${count} follow-up${count > 1 ? 's' : ''} due today`,
    silent: false
  })

  notification.on('click', () => {
    const { BrowserWindow } = require('electron')
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
      mainWindow.webContents.send('navigate:followups')
    }
  })

  notification.show()
}

// Request notification permission on macOS
export function requestNotificationPermission(): void {
  if (process.platform === 'darwin') {
    app.dock?.bounce()
  }
}
