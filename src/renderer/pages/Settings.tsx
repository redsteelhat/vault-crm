import { useState, useEffect } from 'react'
import { Download, Database, Moon, Sun, Shield, HardDrive, Info } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/stores/uiStore'
import { useContactStore } from '@/stores/contactStore'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'

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

  useEffect(() => {
    loadAppInfo()
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
    } catch (error) {
      toast({ title: 'Export failed', variant: 'destructive' })
    }
    setIsExporting(false)
  }

  const handleBackup = async () => {
    try {
      const date = new Date().toISOString().split('T')[0]
      const path = await window.api.export.selectSaveLocation(`vaultcrm-backup-${date}.db`, [
        { name: 'Database Files', extensions: ['db'] }
      ])
      if (path) {
        await window.api.export.backup(path)
        toast({ title: 'Backup created successfully', variant: 'success' })
      }
    } catch (error) {
      toast({ title: 'Backup failed', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Settings" description="Manage your preferences and data" />

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
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
                    Create a full backup of your local database
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
                Privacy & Security
              </CardTitle>
              <CardDescription>Your data stays on your device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-500">Local-First Architecture</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All your data is stored locally on your device. No cloud sync, no data
                      collection. Your network is your own.
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
                      SQLite with WAL mode
                    </Badge>
                  </div>
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
                  <p className="text-2xl font-bold">{appInfo.version || '0.1.0'}</p>
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
                <p className="mt-4">© 2024 VaultCRM. All rights reserved.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
