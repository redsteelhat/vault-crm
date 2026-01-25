import { useState, useEffect } from 'react'
import { Download, Database, Moon, Sun, Shield, HardDrive, Info, Lock, Clock, Eye, EyeOff, Key, RefreshCw, MessageCircle, Bug, FileText, Radio } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useUIStore } from '@/stores/uiStore'
import { useContactStore } from '@/stores/contactStore'
import { useToast } from '@/hooks/useToast'

export function Settings() {
  const { toast } = useToast()
  const { theme, setTheme } = useUIStore()
  const { contacts } = useContactStore()

  const [appInfo, setAppInfo] = useState({
    version: '',
    platform: '',
    dataPath: ''
  })
  const [isExporting, setIsExporting] = useState(false)
  const [idleTimeout, setIdleTimeout] = useState(15)
  const [lockOnMinimize, setLockOnMinimize] = useState(false)
  
  // Password change dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Update settings
  const [updateChannel, setUpdateChannel] = useState<'stable' | 'beta'>('stable')
  const [autoCheck, setAutoCheck] = useState(true)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  // Diagnostics
  const [isExportingDiagnostics, setIsExportingDiagnostics] = useState(false)

  // Feedback dialog
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general')
  const [feedbackText, setFeedbackText] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false)

  useEffect(() => {
    loadAppInfo()
    loadVaultSettings()
    loadUpdateSettings()
  }, [])

  const loadAppInfo = async () => {
    try {
      const [version, platform, dataPath] = await Promise.all([
        window.api.app.getVersion(),
        window.api.app.getPlatform(),
        window.api.app.getDataPath()
      ])
      setAppInfo({ version, platform, dataPath })
    } catch (error) {
      console.error('Failed to load app info:', error)
    }
  }

  const loadVaultSettings = async () => {
    try {
      const [timeout, lockMin] = await Promise.all([
        window.api.vault.getIdleTimeout(),
        window.api.vault.getLockOnMinimize()
      ])
      setIdleTimeout(timeout)
      setLockOnMinimize(lockMin)
    } catch (error) {
      console.error('Failed to load vault settings:', error)
    }
  }

  const loadUpdateSettings = async () => {
    try {
      const status = await window.api.updater.getStatus()
      setUpdateChannel(status.channel)
      setAutoCheck(status.autoCheck)
    } catch (error) {
      console.error('Failed to load update settings:', error)
    }
  }

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true)
    try {
      const result = await window.api.updater.checkForUpdates()
      if (!result.available) {
        toast({ title: 'You are running the latest version' })
      }
    } catch {
      toast({ title: 'Failed to check for updates', variant: 'destructive' })
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleUpdateChannelChange = async (channel: 'stable' | 'beta') => {
    setUpdateChannel(channel)
    await window.api.updater.setChannel(channel)
    toast({ title: `Update channel changed to ${channel}` })
  }

  const handleAutoCheckChange = async () => {
    const newValue = !autoCheck
    setAutoCheck(newValue)
    await window.api.updater.setAutoCheck(newValue)
    toast({ title: newValue ? 'Auto-update check enabled' : 'Auto-update check disabled' })
  }

  const handleExportDiagnostics = async () => {
    setIsExportingDiagnostics(true)
    try {
      const result = await window.api.diagnostics.export()
      if (result.success) {
        toast({ title: 'Diagnostics exported successfully', variant: 'success' })
      } else if (!result.cancelled) {
        toast({ title: result.error || 'Failed to export diagnostics', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to export diagnostics', variant: 'destructive' })
    } finally {
      setIsExportingDiagnostics(false)
    }
  }

  const handleSendFeedback = () => {
    // Create mailto link with feedback
    const subject = encodeURIComponent(`[VaultCRM ${feedbackType}] Feedback`)
    const body = encodeURIComponent(`Type: ${feedbackType}\n\n${feedbackText}\n\n---\nVersion: ${appInfo.version}\nPlatform: ${appInfo.platform}`)
    window.open(`mailto:feedback@vaultcrm.app?subject=${subject}&body=${body}`)
    
    toast({ title: 'Opening email client...' })
    setShowFeedbackDialog(false)
    setFeedbackText('')
  }

  const handleIdleTimeoutChange = async (value: string) => {
    const minutes = parseInt(value, 10)
    setIdleTimeout(minutes)
    await window.api.vault.setIdleTimeout(minutes)
    toast({ title: 'Idle timeout updated' })
  }

  const handleLockOnMinimizeChange = async () => {
    const newValue = !lockOnMinimize
    setLockOnMinimize(newValue)
    await window.api.vault.setLockOnMinimize(newValue)
    toast({ title: newValue ? 'Lock on minimize enabled' : 'Lock on minimize disabled' })
  }

  const handleLockNow = async () => {
    await window.api.vault.lock()
    // The app will redirect to unlock screen
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }

    if (newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await window.api.vault.changePassword(currentPassword, newPassword)
      if (result.success) {
        toast({ title: 'Password changed successfully', variant: 'success' })
        setShowPasswordDialog(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast({ title: result.error || 'Failed to change password', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'An error occurred', variant: 'destructive' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      const path = await window.api.export.selectSaveLocation('vaultcrm-contacts.csv', [
        { name: 'CSV Files', extensions: ['csv'] }
      ])
      if (path) {
        setIsExporting(true)
        await window.api.export.csv(path)
        toast({ title: 'Contacts exported successfully', variant: 'success' })
      }
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' })
    }
    setIsExporting(false)
  }

  const handleBackup = async () => {
    try {
      const date = new Date().toISOString().split('T')[0]
      const path = await window.api.export.selectSaveLocation(`vaultcrm-backup-${date}.zip`, [
        { name: 'Backup Files', extensions: ['zip'] }
      ])
      if (path) {
        await window.api.export.backup(path)
        toast({ title: 'Backup created successfully', variant: 'success' })
      }
    } catch {
      toast({ title: 'Backup failed', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Settings" description="Manage your preferences and data" />

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Vault Security */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Vault Security
              </CardTitle>
              <CardDescription>Manage your vault password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Master Password</p>
                  <p className="text-sm text-muted-foreground">
                    Change your vault encryption password
                  </p>
                </div>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Key className="h-4 w-4 mr-2" /> Change
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Master Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="current">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="current"
                            type={showPasswords ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new">New Password</Label>
                        <Input
                          id="new"
                          type={showPasswords ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm">Confirm New Password</Label>
                        <Input
                          id="confirm"
                          type={showPasswords ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="text-muted-foreground"
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showPasswords ? 'Hide' : 'Show'} passwords
                      </Button>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                        {isChangingPassword ? 'Changing...' : 'Change Password'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Auto-Lock Timeout</p>
                  <p className="text-sm text-muted-foreground">
                    Lock vault after inactivity
                  </p>
                </div>
                <Select value={idleTimeout.toString()} onValueChange={handleIdleTimeoutChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="0">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Lock on Minimize</p>
                  <p className="text-sm text-muted-foreground">
                    Lock vault when window loses focus
                  </p>
                </div>
                <Button
                  variant={lockOnMinimize ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleLockOnMinimizeChange}
                >
                  {lockOnMinimize ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div>
                  <p className="font-medium text-amber-500">Lock Now</p>
                  <p className="text-sm text-muted-foreground">
                    Immediately lock your vault
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleLockNow}>
                  <Lock className="h-4 w-4 mr-2" /> Lock Vault
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how VaultCRM looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4 mr-1" /> Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4 mr-1" /> Dark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>Export and backup your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Export Contacts (CSV)</p>
                  <p className="text-sm text-muted-foreground">
                    Download all {contacts.length} contacts as a CSV file
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportCsv} disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Backup Database</p>
                  <p className="text-sm text-muted-foreground">
                    Create a full encrypted backup
                  </p>
                </div>
                <Button variant="outline" onClick={handleBackup}>
                  <HardDrive className="h-4 w-4 mr-2" /> Backup
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Encryption
              </CardTitle>
              <CardDescription>Your data is protected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-emerald-500">AES-256-GCM Encryption</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All your data is encrypted with military-grade encryption. Your master password 
                      never leaves your device.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Data Location</p>
                    <p className="text-xs font-mono mt-1 break-all">{appInfo.dataPath}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Encryption</p>
                    <Badge variant="secondary" className="mt-1">
                      AES-256-GCM + PBKDF2
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Updates */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Updates
              </CardTitle>
              <CardDescription>Keep VaultCRM up to date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Check for Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Current version: {appInfo.version || '1.0.0'}
                  </p>
                </div>
                <Button variant="outline" onClick={handleCheckForUpdates} disabled={isCheckingUpdate}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  {isCheckingUpdate ? 'Checking...' : 'Check Now'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Update Channel</p>
                  <p className="text-sm text-muted-foreground">
                    Beta channel includes early features
                  </p>
                </div>
                <Select value={updateChannel} onValueChange={(v) => handleUpdateChannelChange(v as 'stable' | 'beta')}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stable">
                      <div className="flex items-center gap-2">
                        <Radio className="h-3 w-3 text-emerald-500" /> Stable
                      </div>
                    </SelectItem>
                    <SelectItem value="beta">
                      <div className="flex items-center gap-2">
                        <Radio className="h-3 w-3 text-amber-500" /> Beta
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Auto-Check Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Check for updates on startup
                  </p>
                </div>
                <Button
                  variant={autoCheck ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleAutoCheckChange}
                >
                  {autoCheck ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostics & Support */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Diagnostics & Support
              </CardTitle>
              <CardDescription>Troubleshooting and feedback</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Export Diagnostics</p>
                  <p className="text-sm text-muted-foreground">
                    Export system info for troubleshooting (no personal data)
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportDiagnostics} disabled={isExportingDiagnostics}>
                  <FileText className="h-4 w-4 mr-2" />
                  {isExportingDiagnostics ? 'Exporting...' : 'Export'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Send Feedback</p>
                  <p className="text-sm text-muted-foreground">
                    Report bugs, request features, or share your thoughts
                  </p>
                </div>
                <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" /> Feedback
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Feedback</DialogTitle>
                      <DialogDescription>
                        We appreciate your feedback! Let us know how we can improve.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Feedback Type</Label>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={feedbackType === 'bug' ? 'default' : 'outline'}
                            onClick={() => setFeedbackType('bug')}
                          >
                            <Bug className="h-4 w-4 mr-1" /> Bug Report
                          </Button>
                          <Button
                            size="sm"
                            variant={feedbackType === 'feature' ? 'default' : 'outline'}
                            onClick={() => setFeedbackType('feature')}
                          >
                            Feature Request
                          </Button>
                          <Button
                            size="sm"
                            variant={feedbackType === 'general' ? 'default' : 'outline'}
                            onClick={() => setFeedbackType('general')}
                          >
                            General
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feedback">Your Feedback</Label>
                        <textarea
                          id="feedback"
                          className="w-full h-32 p-3 rounded-md border bg-background resize-none"
                          placeholder="Describe your feedback..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="include-diagnostics"
                          checked={includeDiagnostics}
                          onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="include-diagnostics" className="text-sm">
                          Include system diagnostics (no personal data)
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendFeedback} disabled={!feedbackText.trim()}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Send Feedback
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-500 font-medium">Need Help?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Visit our documentation or community forum for support.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => window.open('https://docs.vaultcrm.app', '_blank')}>
                    Documentation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open('https://community.vaultcrm.app', '_blank')}>
                    Community
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                About VaultCRM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{appInfo.version || '1.0.0'}</p>
                  <p className="text-sm text-muted-foreground">Version</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold capitalize">{appInfo.platform || 'Desktop'}</p>
                  <p className="text-sm text-muted-foreground">Platform</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{contacts.length}</p>
                  <p className="text-sm text-muted-foreground">Contacts</p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="text-center text-sm text-muted-foreground">
                <p className="font-medium">VaultCRM - Local-First Personal CRM</p>
                <p className="mt-1">Privacy-first relationship management for professionals</p>
                <p className="mt-4">© 2026 VaultCRM. All rights reserved.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
