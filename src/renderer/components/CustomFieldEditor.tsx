import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Link,
  Mail,
  Phone,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface CustomFieldDefinition {
  id: string
  entity_type: 'contact' | 'deal' | 'task'
  name: string
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'email' | 'phone'
  options: string
  required: number
  sort_order: number
}

interface CustomFieldEditorProps {
  entityType: 'contact' | 'deal' | 'task'
  onClose?: () => void
}

const FIELD_TYPE_ICONS = {
  text: Type,
  number: Hash,
  date: Calendar,
  select: List,
  multiselect: List,
  checkbox: CheckSquare,
  url: Link,
  email: Mail,
  phone: Phone
}

const FIELD_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Select',
  multiselect: 'Multi-select',
  checkbox: 'Checkbox',
  url: 'URL',
  email: 'Email',
  phone: 'Phone'
}

export function CustomFieldEditor({ entityType, onClose }: CustomFieldEditorProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  // Field dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [fieldForm, setFieldForm] = useState({
    name: '',
    field_type: 'text' as CustomFieldDefinition['field_type'],
    options: '',
    required: false
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null)

  const loadFields = async () => {
    try {
      setLoading(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      const data = await api.customFields.getDefinitions(entityType)
      setFields(data)
    } catch (error) {
      console.error('Error loading custom fields:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFields()
  }, [entityType])

  const openNewFieldDialog = () => {
    setEditingField(null)
    setFieldForm({
      name: '',
      field_type: 'text',
      options: '',
      required: false
    })
    setDialogOpen(true)
  }

  const openEditFieldDialog = (field: CustomFieldDefinition) => {
    setEditingField(field)
    const options = field.options ? JSON.parse(field.options) : []
    setFieldForm({
      name: field.name,
      field_type: field.field_type,
      options: options.join('\n'),
      required: field.required === 1
    })
    setDialogOpen(true)
  }

  const handleSaveField = async () => {
    if (!fieldForm.name.trim()) {
      toast({
        title: t('common.error'),
        description: t('customFields.nameRequired'),
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api

      const optionsArray = fieldForm.options
        .split('\n')
        .map(o => o.trim())
        .filter(o => o.length > 0)

      const fieldData = {
        entity_type: entityType,
        name: fieldForm.name.trim(),
        field_type: fieldForm.field_type,
        options: JSON.stringify(optionsArray),
        required: fieldForm.required ? 1 : 0,
        sort_order: fields.length
      }

      if (editingField) {
        await api.customFields.updateDefinition(editingField.id, fieldData)
        toast({
          title: t('customFields.fieldUpdated'),
          description: t('customFields.fieldUpdatedDesc')
        })
      } else {
        await api.customFields.createDefinition(fieldData)
        toast({
          title: t('customFields.fieldCreated'),
          description: t('customFields.fieldCreatedDesc')
        })
      }

      setDialogOpen(false)
      loadFields()
    } catch (error) {
      console.error('Error saving field:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteField = async () => {
    if (!fieldToDelete) return

    try {
      const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
      await api.customFields.deleteDefinition(fieldToDelete)

      toast({
        title: t('customFields.fieldDeleted'),
        description: t('customFields.fieldDeletedDesc')
      })

      setDeleteDialogOpen(false)
      setFieldToDelete(null)
      loadFields()
    } catch (error) {
      console.error('Error deleting field:', error)
      toast({
        title: t('common.error'),
        description: String(error),
        variant: 'destructive'
      })
    }
  }

  const confirmDeleteField = (fieldId: string) => {
    setFieldToDelete(fieldId)
    setDeleteDialogOpen(true)
  }

  const needsOptions = ['select', 'multiselect'].includes(fieldForm.field_type)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('customFields.title')}</h3>
        <Button size="sm" onClick={openNewFieldDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('customFields.addField')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('customFields.noFields')}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {fields.map((field) => {
              const Icon = FIELD_TYPE_ICONS[field.field_type] || Type
              return (
                <Card key={field.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.name}</span>
                          {field.required === 1 && (
                            <Badge variant="outline" className="text-xs">
                              {t('customFields.required')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {FIELD_TYPE_LABELS[field.field_type]}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditFieldDialog(field)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => confirmDeleteField(field.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {/* Field Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? t('customFields.editField') : t('customFields.addField')}
            </DialogTitle>
            <DialogDescription>
              {editingField ? t('customFields.editFieldDesc') : t('customFields.addFieldDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('customFields.fieldName')} *</Label>
              <Input
                id="name"
                value={fieldForm.name}
                onChange={(e) => setFieldForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('customFields.fieldNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type">{t('customFields.fieldType')}</Label>
              <Select
                value={fieldForm.field_type}
                onValueChange={(value: CustomFieldDefinition['field_type']) => 
                  setFieldForm(prev => ({ ...prev, field_type: value }))
                }
                disabled={!!editingField}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsOptions && (
              <div className="space-y-2">
                <Label htmlFor="options">{t('customFields.options')}</Label>
                <textarea
                  id="options"
                  className="w-full h-24 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  value={fieldForm.options}
                  onChange={(e) => setFieldForm(prev => ({ ...prev, options: e.target.value }))}
                  placeholder={t('customFields.optionsPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('customFields.optionsHint')}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={fieldForm.required}
                onCheckedChange={(checked) => 
                  setFieldForm(prev => ({ ...prev, required: checked === true }))
                }
              />
              <Label htmlFor="required">{t('customFields.markRequired')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveField} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingField ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('customFields.deleteField')}</DialogTitle>
            <DialogDescription>
              {t('customFields.deleteFieldConfirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteField}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Component to render custom field values in forms
interface CustomFieldsFormProps {
  entityId: string
  entityType: 'contact' | 'deal' | 'task'
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
}

export function CustomFieldsForm({ entityId, entityType, values, onChange }: CustomFieldsFormProps) {
  const { t } = useTranslation()
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFields = async () => {
      try {
        const api = (window as unknown as { api: typeof import('../preload').ElectronAPI }).api
        const data = await api.customFields.getDefinitions(entityType)
        setFields(data)
      } catch (error) {
        console.error('Error loading custom fields:', error)
      } finally {
        setLoading(false)
      }
    }
    loadFields()
  }, [entityType])

  if (loading || fields.length === 0) return null

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground">
        {t('customFields.customFields')}
      </h4>
      {fields.map((field) => {
        const value = values[field.id] || ''
        const options = field.options ? JSON.parse(field.options) : []

        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.name}
              {field.required === 1 && <span className="text-destructive ml-1">*</span>}
            </Label>

            {field.field_type === 'text' && (
              <Input
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'number' && (
              <Input
                type="number"
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'date' && (
              <Input
                type="date"
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'email' && (
              <Input
                type="email"
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'url' && (
              <Input
                type="url"
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'phone' && (
              <Input
                type="tel"
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
              />
            )}

            {field.field_type === 'checkbox' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={value === 'true'}
                  onCheckedChange={(checked) => onChange(field.id, checked ? 'true' : 'false')}
                />
              </div>
            )}

            {field.field_type === 'select' && (
              <Select value={value} onValueChange={(v) => onChange(field.id, v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt: string) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.field_type === 'multiselect' && (
              <div className="space-y-2">
                {options.map((opt: string) => {
                  const selected = value.split(',').includes(opt)
                  return (
                    <div key={opt} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => {
                          const current = value ? value.split(',').filter(v => v) : []
                          if (checked) {
                            current.push(opt)
                          } else {
                            const idx = current.indexOf(opt)
                            if (idx > -1) current.splice(idx, 1)
                          }
                          onChange(field.id, current.join(','))
                        }}
                      />
                      <Label>{opt}</Label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
