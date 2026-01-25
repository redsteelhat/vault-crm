import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreVertical, Mail, Phone, Building2, MapPin, ExternalLink } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatRelativeDate, parseEmails, parsePhones, getInitials } from '@/lib/utils'

interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  emails: string
  phones: string
  location: string | null
  source: string | null
  last_contact_at: string | null
  created_at: string
}

interface ContactsTableProps {
  contacts: Contact[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onDelete: (id: string, name: string) => void
}

export function ContactsTable({
  contacts,
  selectedIds,
  onSelectionChange,
  onDelete
}: ContactsTableProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isAllSelected = contacts.length > 0 && selectedIds.size === contacts.length
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < contacts.length

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(contacts.map((c) => c.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                ref={(ref) => {
                  if (ref) {
                    (ref as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isSomeSelected
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>{t('contacts.fields.name')}</TableHead>
            <TableHead>{t('contacts.fields.company')}</TableHead>
            <TableHead>{t('contacts.fields.email')}</TableHead>
            <TableHead>{t('contacts.fields.phone')}</TableHead>
            <TableHead>{t('contacts.fields.location')}</TableHead>
            <TableHead>{t('contacts.fields.source')}</TableHead>
            <TableHead>{t('contacts.fields.lastContact')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const emails = parseEmails(contact.emails)
            const phones = parsePhones(contact.phones)
            const isSelected = selectedIds.has(contact.id)

            return (
              <TableRow
                key={contact.id}
                className={isSelected ? 'bg-muted/50' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectOne(contact.id)}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to={`/contacts/${contact.id}`}
                    className="flex items-center gap-3 hover:text-primary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      {contact.title && (
                        <p className="text-xs text-muted-foreground">{contact.title}</p>
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  {contact.company && (
                    <span className="flex items-center gap-1 text-sm">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      {contact.company}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {emails[0] && (
                    <a
                      href={`mailto:${emails[0]}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{emails[0]}</span>
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {phones[0] && (
                    <a
                      href={`tel:${phones[0]}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Phone className="h-3 w-3" />
                      {phones[0]}
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {contact.location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[100px]">{contact.location}</span>
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.source && (
                    <Badge variant="secondary" className="text-xs">
                      {contact.source}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeDate(contact.last_contact_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/contacts/${contact.id}`)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(contact.id, contact.name)}
                      >
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
