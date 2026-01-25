import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, X, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'

interface Tag {
  id: string
  name: string
  color: string
}

export interface ContactFilters {
  tags: string[]
  companies: string[]
  sources: string[]
  locations: string[]
  createdFrom: string | null
  createdTo: string | null
  lastContactFrom: string | null
  lastContactTo: string | null
}

interface FilterPanelProps {
  filters: ContactFilters
  onFiltersChange: (filters: ContactFilters) => void
  tags: Tag[]
  companies: string[]
  sources: string[]
  locations: string[]
}

const emptyFilters: ContactFilters = {
  tags: [],
  companies: [],
  sources: [],
  locations: [],
  createdFrom: null,
  createdTo: null,
  lastContactFrom: null,
  lastContactTo: null
}

export function FilterPanel({
  filters,
  onFiltersChange,
  tags,
  companies,
  sources,
  locations
}: FilterPanelProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<ContactFilters>(filters)
  const [expandedSections, setExpandedSections] = useState({
    tags: true,
    company: false,
    source: false,
    location: false,
    dates: false
  })

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const activeFilterCount = 
    filters.tags.length + 
    filters.companies.length + 
    filters.sources.length + 
    filters.locations.length +
    (filters.createdFrom ? 1 : 0) +
    (filters.createdTo ? 1 : 0) +
    (filters.lastContactFrom ? 1 : 0) +
    (filters.lastContactTo ? 1 : 0)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleTagToggle = (tagId: string) => {
    const newTags = localFilters.tags.includes(tagId)
      ? localFilters.tags.filter((t) => t !== tagId)
      : [...localFilters.tags, tagId]
    setLocalFilters({ ...localFilters, tags: newTags })
  }

  const handleCompanyToggle = (company: string) => {
    const newCompanies = localFilters.companies.includes(company)
      ? localFilters.companies.filter((c) => c !== company)
      : [...localFilters.companies, company]
    setLocalFilters({ ...localFilters, companies: newCompanies })
  }

  const handleSourceToggle = (source: string) => {
    const newSources = localFilters.sources.includes(source)
      ? localFilters.sources.filter((s) => s !== source)
      : [...localFilters.sources, source]
    setLocalFilters({ ...localFilters, sources: newSources })
  }

  const handleLocationToggle = (location: string) => {
    const newLocations = localFilters.locations.includes(location)
      ? localFilters.locations.filter((l) => l !== location)
      : [...localFilters.locations, location]
    setLocalFilters({ ...localFilters, locations: newLocations })
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClear = () => {
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const SectionHeader = ({ 
    title, 
    section, 
    count 
  }: { 
    title: string
    section: keyof typeof expandedSections
    count: number 
  }) => (
    <button
      className="flex items-center justify-between w-full py-2 text-sm font-medium"
      onClick={() => toggleSection(section)}
    >
      <span className="flex items-center gap-2">
        {title}
        {count > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5">
            {count}
          </Badge>
        )}
      </span>
      {expandedSections[section] ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          {t('filters.filters')}
          {activeFilterCount > 0 && (
            <Badge 
              variant="default" 
              className="ml-2 h-5 px-1.5 min-w-[20px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">{t('filters.filters')}</h4>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4 mr-1" />
              {t('filters.clearAll')}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-4 space-y-2">
            {/* Tags Section */}
            <div>
              <SectionHeader 
                title={t('filters.tags')} 
                section="tags" 
                count={localFilters.tags.length} 
              />
              {expandedSections.tags && (
                <div className="mt-2 space-y-2 pl-1">
                  {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                  ) : (
                    tags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={localFilters.tags.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id)}
                        />
                        <Label 
                          htmlFor={`tag-${tag.id}`} 
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Company Section */}
            <div>
              <SectionHeader 
                title={t('filters.company')} 
                section="company" 
                count={localFilters.companies.length} 
              />
              {expandedSections.company && (
                <div className="mt-2 space-y-2 pl-1 max-h-32 overflow-y-auto">
                  {companies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                  ) : (
                    companies.slice(0, 20).map((company) => (
                      <div key={company} className="flex items-center gap-2">
                        <Checkbox
                          id={`company-${company}`}
                          checked={localFilters.companies.includes(company)}
                          onCheckedChange={() => handleCompanyToggle(company)}
                        />
                        <Label 
                          htmlFor={`company-${company}`} 
                          className="text-sm cursor-pointer truncate"
                        >
                          {company}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Source Section */}
            <div>
              <SectionHeader 
                title={t('filters.source')} 
                section="source" 
                count={localFilters.sources.length} 
              />
              {expandedSections.source && (
                <div className="mt-2 space-y-2 pl-1">
                  {sources.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                  ) : (
                    sources.map((source) => (
                      <div key={source} className="flex items-center gap-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={localFilters.sources.includes(source)}
                          onCheckedChange={() => handleSourceToggle(source)}
                        />
                        <Label 
                          htmlFor={`source-${source}`} 
                          className="text-sm cursor-pointer"
                        >
                          {source}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Location Section */}
            <div>
              <SectionHeader 
                title={t('filters.location')} 
                section="location" 
                count={localFilters.locations.length} 
              />
              {expandedSections.location && (
                <div className="mt-2 space-y-2 pl-1 max-h-32 overflow-y-auto">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                  ) : (
                    locations.slice(0, 20).map((location) => (
                      <div key={location} className="flex items-center gap-2">
                        <Checkbox
                          id={`location-${location}`}
                          checked={localFilters.locations.includes(location)}
                          onCheckedChange={() => handleLocationToggle(location)}
                        />
                        <Label 
                          htmlFor={`location-${location}`} 
                          className="text-sm cursor-pointer truncate"
                        >
                          {location}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Date Section */}
            <div>
              <SectionHeader 
                title={t('filters.dateRange')} 
                section="dates" 
                count={
                  (localFilters.createdFrom ? 1 : 0) +
                  (localFilters.createdTo ? 1 : 0) +
                  (localFilters.lastContactFrom ? 1 : 0) +
                  (localFilters.lastContactTo ? 1 : 0)
                } 
              />
              {expandedSections.dates && (
                <div className="mt-2 space-y-3 pl-1">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {t('filters.createdFrom')}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          {localFilters.createdFrom 
                            ? format(new Date(localFilters.createdFrom), 'PPP')
                            : t('common.select')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={localFilters.createdFrom ? new Date(localFilters.createdFrom) : undefined}
                          onSelect={(d) => setLocalFilters({
                            ...localFilters,
                            createdFrom: d ? d.toISOString().split('T')[0] : null
                          })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {t('filters.lastContactFrom')}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          {localFilters.lastContactFrom 
                            ? format(new Date(localFilters.lastContactFrom), 'PPP')
                            : t('common.select')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={localFilters.lastContactFrom ? new Date(localFilters.lastContactFrom) : undefined}
                          onSelect={(d) => setLocalFilters({
                            ...localFilters,
                            lastContactFrom: d ? d.toISOString().split('T')[0] : null
                          })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleApply}>
            {t('filters.apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
