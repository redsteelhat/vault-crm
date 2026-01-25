import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Database, Moon, Sun, Shield, HardDrive, Info, Lock, Clock, Eye, EyeOff, Key, RefreshCw, MessageCircle, Bug, FileText, Radio, Globe } from 'lucide-react'
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
import { supportedLanguages, changeLanguage, getCurrentLanguage, type SupportedLanguage } from '@/i18n'

export function Settings() {
  const { t } = useTranslation()
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
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(getCurrentLanguage())
  
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
        toast({ title: t('settings.backupSuccess'), variant: 'success' })
      }
    } catch {
      toast({ title: t('errors.backupFailed'), variant: 'destructive' })
    }
  }

  const handleLanguageChange = async (lang: string) => {
    const newLang = lang as SupportedLanguage
    setCurrentLanguage(newLang)
    await changeLanguage(newLang)
    toast({ title: t('settings.languageChanged', { lang: supportedLanguages.find(l => l.code === newLang)?.nativeName }) })
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title={t('settings.title')} description={t('settings.description')} />

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Language */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>{t('settings.languageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.language')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
                </div>
                <Select value={currentLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Vault Security */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {t('settings.vault')}
              </CardTitle>
              <CardDescription>{t('settings.vaultDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.masterPassword')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.masterPasswordDesc')}
                  </p>
                </div>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Key className="h-4 w-4 mr-2" /> {t('settings.changePassword')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('settings.changePassword')}</DialogTitle>
                      <DialogDescription>
                        {t('settings.masterPasswordDesc')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="current">{t('settings.currentPassword')}</Label>
                        <div className="relative">
                          <Input
                            id="current"
                            type={showPasswords ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder={t('settings.currentPassword')}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new">{t('settings.newPassword')}</Label>
                        <Input
                          id="new"
                          type={showPasswords ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('settings.newPassword')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm">{t('settings.confirmPassword')}</Label>
                        <Input
                          id="confirm"
                          type={showPasswords ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('settings.confirmPassword')}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="text-muted-foreground"
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showPasswords ? t('common.close') : t('common.edit')}
                      </Button>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                        {isChangingPassword ? t('common.loading') : t('settings.changePassword')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.idleTimeout')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.idleTimeoutDesc')}
                  </p>
                </div>
                <Select value={idleTimeout.toString()} onValueChange={handleIdleTimeoutChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 {t('settings.minutes')}</SelectItem>
                    <SelectItem value="15">15 {t('settings.minutes')}</SelectItem>
                    <SelectItem value="30">30 {t('settings.minutes')}</SelectItem>
                    <SelectItem value="60">1 {t('settings.hour')}</SelectItem>
                    <SelectItem value="0">{t('settings.never')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.lockOnMinimize')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.lockOnMinimizeDesc')}
                  </p>
                </div>
                <Button
                  variant={lockOnMinimize ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleLockOnMinimizeChange}
                >
                  {lockOnMinimize ? t('settings.enabled') : t('settings.disabled')}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div>
                  <p className="font-medium text-amber-500">{t('settings.lockNow')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.lockNowDesc')}
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleLockNow}>
                  <Lock className="h-4 w-4 mr-2" /> {t('nav.lock')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                {t('settings.appearance')}
              </CardTitle>
              <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('settings.theme')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.themeDesc')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4 mr-1" /> {t('settings.light')}
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4 mr-1" /> {t('settings.dark')}
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
                {t('settings.dataManagement')}
              </CardTitle>
              <CardDescription>{t('settings.dataManagementDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.exportCsv')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.exportCsvDesc')} ({contacts.length})
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportCsv} disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? t('settings.exporting') : t('settings.export')}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.backupDatabase')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.backupDatabaseDesc')}
                  </p>
                </div>
                <Button variant="outline" onClick={handleBackup}>
                  <HardDrive className="h-4 w-4 mr-2" /> {t('settings.backup')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('settings.privacy')}
              </CardTitle>
              <CardDescription>{t('settings.privacyDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-emerald-500">{t('settings.encryptionInfo')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('settings.encryptionInfoDesc')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{t('settings.dataLocation')}</p>
                    <p className="text-xs font-mono mt-1 break-all">{appInfo.dataPath}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">{t('settings.encryption')}</p>
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
                {t('settings.updates')}
              </CardTitle>
              <CardDescription>{t('settings.updatesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.checkForUpdates')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.currentVersion')}: {appInfo.version || '1.0.0'}
                  </p>
                </div>
                <Button variant="outline" onClick={handleCheckForUpdates} disabled={isCheckingUpdate}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  {isCheckingUpdate ? t('settings.checking') : t('settings.checkForUpdates')}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.updates')}</p>
                  <p className="text-sm text-muted-foreground">
                    Beta / Stable
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
                  <p className="font-medium">{t('settings.checkForUpdates')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.updatesDesc')}
                  </p>
                </div>
                <Button
                  variant={autoCheck ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleAutoCheckChange}
                >
                  {autoCheck ? t('settings.enabled') : t('settings.disabled')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostics & Support */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                {t('settings.diagnostics')}
              </CardTitle>
              <CardDescription>{t('settings.diagnosticsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.exportDiagnostics')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.exportDiagnosticsDesc')}
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportDiagnostics} disabled={isExportingDiagnostics}>
                  <FileText className="h-4 w-4 mr-2" />
                  {isExportingDiagnostics ? t('settings.exporting') : t('settings.export')}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{t('settings.sendFeedback')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.diagnosticsDesc')}
                  </p>
                </div>
                <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" /> {t('settings.sendFeedback')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('settings.sendFeedback')}</DialogTitle>
                      <DialogDescription>
                        {t('settings.diagnosticsDesc')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>{t('settings.feedbackType')}</Label>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={feedbackType === 'bug' ? 'default' : 'outline'}
                            onClick={() => setFeedbackType('bug')}
                          >
                            <Bug className="h-4 w-4 mr-1" /> {t('settings.bugReport')}
                          </Button>
                          <Button
                            size="sm"
                            variant={feedbackType === 'feature' ? 'default' : 'outline'}
                            onClick={() => setFeedbackType('feature')}
                          >
                            {t('settings.featureRequest')}
                          </Button>
                          <Button
                            size="sm"
                            variant={feedbackType === 'general' ? 'default' : 'outline'}
                            onClick={() => setFeedbackType('general')}
                          >
                            {t('settings.generalFeedback')}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feedback">{t('settings.feedbackMessage')}</Label>
                        <textarea
                          id="feedback"
                          className="w-full h-32 p-3 rounded-md border bg-background resize-none"
                          placeholder={t('settings.feedbackPlaceholder')}
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
                          {t('settings.exportDiagnosticsDesc')}
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleSendFeedback} disabled={!feedbackText.trim()}>
                        <MessageCircle className="h-4 w-4 mr-2" /> {t('common.submit')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t('settings.about')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{appInfo.version || '1.0.0'}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.version')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold capitalize">{appInfo.platform || 'Desktop'}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.platform')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{contacts.length}</p>
                  <p className="text-sm text-muted-foreground">{t('contacts.title')}</p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="text-center text-sm text-muted-foreground">
                <p className="font-medium">VaultCRM - {t('settings.aboutTagline')}</p>
                <p className="mt-1">{t('settings.aboutDesc')}</p>
                <p className="mt-4">{t('settings.copyright', { year: new Date().getFullYear() })}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
