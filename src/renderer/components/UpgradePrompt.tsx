import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Crown, Check, X, ExternalLink, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface UpgradePromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: string
  title?: string
  message?: string
}

export function UpgradePrompt({ open, onOpenChange, feature, title, message }: UpgradePromptProps) {
  const { t } = useTranslation()
  const [comparison, setComparison] = useState<Array<{
    feature: string
    description: string
    free: boolean | string
    pro: boolean | string
  }>>([])
  const [tierInfo, setTierInfo] = useState<{
    tier: 'free' | 'pro'
    contactsUsed: number
    contactsRemaining: number
    upgradeUrl: string
  } | null>(null)
  const [customPrompt, setCustomPrompt] = useState<{ title: string; message: string; cta: string } | null>(null)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, feature])

  const loadData = async () => {
    try {
      const [comparisonData, tierData] = await Promise.all([
        window.api.tier.getComparison(),
        window.api.tier.getInfo()
      ])
      setComparison(comparisonData)
      setTierInfo(tierData)

      if (feature) {
        const prompt = await window.api.tier.getUpgradePrompt(feature)
        setCustomPrompt(prompt)
        await window.api.tier.recordPromptShown(feature)
      }
    } catch (error) {
      console.error('Failed to load tier data:', error)
    }
  }

  const handleUpgrade = () => {
    if (tierInfo?.upgradeUrl) {
      window.open(tierInfo.upgradeUrl, '_blank')
    }
  }

  const displayTitle = title || customPrompt?.title || t('pricing.upgradeTitle')
  const displayMessage = message || customPrompt?.message || t('pricing.upgradeMessage')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-amber-500" />
            {displayTitle}
          </DialogTitle>
          <DialogDescription className="text-base">
            {displayMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Tier Comparison Table */}
          <div className="rounded-lg border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-muted/50">
              <div className="p-3 font-medium">{t('pricing.feature')}</div>
              <div className="p-3 text-center font-medium">
                <Badge variant="outline">{t('pricing.free')}</Badge>
              </div>
              <div className="p-3 text-center font-medium">
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <Crown className="h-3 w-3 mr-1" /> {t('pricing.pro')}
                </Badge>
              </div>
            </div>

            {/* Rows */}
            {comparison.map((item, index) => (
              <div 
                key={index} 
                className={cn(
                  'grid grid-cols-3 border-t',
                  index % 2 === 0 && 'bg-muted/20'
                )}
              >
                <div className="p-3">
                  <p className="font-medium text-sm">{item.feature}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="p-3 flex items-center justify-center">
                  {typeof item.free === 'boolean' ? (
                    item.free ? (
                      <Check className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">{item.free}</span>
                  )}
                </div>
                <div className="p-3 flex items-center justify-center">
                  {typeof item.pro === 'boolean' ? (
                    item.pro ? (
                      <Check className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )
                  ) : (
                    <span className="text-sm font-medium text-emerald-600">{item.pro}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current Usage */}
          {tierInfo && tierInfo.tier === 'free' && (
            <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-amber-600">{t('pricing.currentUsage')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('pricing.contactsUsed', { 
                  used: tierInfo.contactsUsed, 
                  limit: tierInfo.contactsRemaining >= 0 ? tierInfo.contactsUsed + tierInfo.contactsRemaining : '∞' 
                })}
              </p>
              {tierInfo.contactsRemaining >= 0 && tierInfo.contactsRemaining <= 10 && (
                <p className="text-sm text-amber-600 mt-1">
                  {t('pricing.runningLow', { remaining: tierInfo.contactsRemaining })}
                </p>
              )}
            </div>
          )}

          {/* Pricing */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <div className="text-center p-4 rounded-lg border bg-muted/30">
              <p className="text-3xl font-bold">$0</p>
              <p className="text-sm text-muted-foreground">{t('pricing.freeForever')}</p>
            </div>
            <div className="text-center p-4 rounded-lg border-2 border-amber-500 bg-amber-500/5">
              <p className="text-3xl font-bold text-amber-600">$49</p>
              <p className="text-sm text-muted-foreground">{t('pricing.lifetime')}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('pricing.maybeLater')}
          </Button>
          <Button 
            onClick={handleUpgrade}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            {t('pricing.upgradeToPro')}
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
