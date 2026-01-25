import { useState } from 'react'
import { Upload, FileSpreadsheet, ArrowRight, Check, AlertCircle, X } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import { useContactStore } from '@/stores/contactStore'
import { cn } from '@/lib/utils'

const CONTACT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'company', label: 'Company', required: false },
  { key: 'title', label: 'Title', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'location', label: 'Location', required: false },
  { key: 'source', label: 'Source', required: false },
  { key: 'notes', label: 'Notes', required: false }
]

type Step = 'select' | 'map' | 'preview' | 'result'

interface CsvPreview {
  headers: string[]
  rows: Record<string, string>[]
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export function Import() {
  const { toast } = useToast()
  const { fetchContacts } = useContactStore()

  const [step, setStep] = useState<Step>('select')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleSelectFile = async () => {
    try {
      const path = await window.api.import.selectFile()
      if (path) {
        setFilePath(path)
        setIsLoading(true)
        const csvPreview = await window.api.import.previewCsv(path)
        setPreview(csvPreview)

        // Auto-map columns with matching names
        const autoMapping: Record<string, string> = {}
        CONTACT_FIELDS.forEach((field) => {
          const match = csvPreview.headers.find(
            (h) =>
              h.toLowerCase() === field.key.toLowerCase() ||
              h.toLowerCase().includes(field.key.toLowerCase())
          )
          if (match) {
            autoMapping[field.key] = match
          }
        })
        setMapping(autoMapping)
        setStep('map')
        setIsLoading(false)
      }
    } catch (error) {
      toast({ title: 'Failed to load file', variant: 'destructive' })
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!filePath || !mapping.name) {
      toast({ title: 'Name mapping is required', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const importResult = await window.api.import.csv(filePath, mapping)
      setResult(importResult)
      setStep('result')
      fetchContacts()
    } catch (error) {
      toast({ title: 'Import failed', variant: 'destructive' })
    }
    setIsLoading(false)
  }

  const handleReset = () => {
    setStep('select')
    setFilePath(null)
    setPreview(null)
    setMapping({})
    setResult(null)
  }

  const updateMapping = (field: string, column: string) => {
    if (column === '_none') {
      const newMapping = { ...mapping }
      delete newMapping[field]
      setMapping(newMapping)
    } else {
      setMapping({ ...mapping, [field]: column })
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Import Contacts" description="Import contacts from CSV files" />

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {['select', 'map', 'preview', 'result'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    step === s || ['select', 'map', 'preview', 'result'].indexOf(step) > i
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={cn(
                      'w-16 h-0.5 mx-2',
                      ['select', 'map', 'preview', 'result'].indexOf(step) > i
                        ? 'bg-primary'
                        : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select File */}
          {step === 'select' && (
            <Card className="border-none shadow-sm">
              <CardHeader className="text-center">
                <CardTitle>Select CSV File</CardTitle>
                <CardDescription>
                  Choose a CSV file containing your contacts to import
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-12">
                <div
                  className="w-full max-w-md p-12 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                  onClick={handleSelectFile}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Click to select CSV file</p>
                  <p className="text-sm text-muted-foreground">
                    Supports standard CSV format with headers
                  </p>
                </div>
                <div className="mt-6 text-sm text-muted-foreground text-center">
                  <p className="font-medium mb-2">Required columns:</p>
                  <p>At minimum, your CSV should have a &quot;Name&quot; column</p>
                  <p className="mt-2">
                    Optional: Email, Company, Title, Phone, Location, Source, Notes
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Map Columns */}
          {step === 'map' && preview && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Map Columns
                </CardTitle>
                <CardDescription>
                  Match your CSV columns to contact fields. Found {preview.rows.length}+ rows.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  {CONTACT_FIELDS.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label}</span>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <Select
                        value={mapping[field.key] || '_none'}
                        onValueChange={(v) => updateMapping(field.key, v)}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">-- Skip --</SelectItem>
                          {preview.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* Preview Table */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Data Preview (first 5 rows)</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted">
                            {preview.headers.map((header) => (
                              <th
                                key={header}
                                className="px-3 py-2 text-left font-medium whitespace-nowrap"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t">
                              {preview.headers.map((header) => (
                                <td
                                  key={header}
                                  className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate"
                                >
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep('preview')} disabled={!mapping.name}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview & Confirm */}
          {step === 'preview' && preview && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Confirm Import</CardTitle>
                <CardDescription>Review your mapping before importing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {CONTACT_FIELDS.filter((f) => mapping[f.key]).map((field) => (
                    <div key={field.key} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{field.label}:</span>
                      <span className="text-muted-foreground">{mapping[field.key]}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 text-amber-500">
                  <p className="text-sm">
                    <strong>Ready to import {preview.rows.length}+ contacts.</strong>
                    <br />
                    Duplicate emails will be skipped automatically.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep('map')}>
                    Back
                  </Button>
                  <Button onClick={handleImport} disabled={isLoading}>
                    {isLoading ? 'Importing...' : 'Start Import'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Result */}
          {step === 'result' && result && (
            <Card className="border-none shadow-sm">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle>Import Complete</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-green-500/10">
                    <p className="text-3xl font-bold text-green-500">{result.imported}</p>
                    <p className="text-sm text-muted-foreground">Imported</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10">
                    <p className="text-3xl font-bold text-amber-500">{result.skipped}</p>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10">
                    <p className="text-3xl font-bold text-red-500">
                      {result.errors.filter((e) => !e.includes('Duplicate')).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <h4 className="text-sm font-medium mb-2">Details:</h4>
                    <div className="space-y-1">
                      {result.errors.slice(0, 20).map((error, i) => (
                        <p key={i} className="text-sm text-muted-foreground">
                          {error.includes('Duplicate') ? (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-500" /> {error}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <X className="h-3 w-3 text-red-500" /> {error}
                            </span>
                          )}
                        </p>
                      ))}
                      {result.errors.length > 20 && (
                        <p className="text-sm text-muted-foreground">
                          ...and {result.errors.length - 20} more
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <Button onClick={handleReset}>Import Another File</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
