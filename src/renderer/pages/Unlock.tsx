import { useState, useEffect } from 'react'
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'

interface UnlockProps {
  onUnlock: () => void
}

export function Unlock({ onUnlock }: UnlockProps) {
  const [isSetup, setIsSetup] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasLegacyData, setHasLegacyData] = useState(false)

  useEffect(() => {
    checkVaultStatus()
  }, [])

  const checkVaultStatus = async () => {
    const setup = await window.api.vault.isSetup()
    const legacy = await window.api.vault.hasLegacyData()
    setIsSetup(setup)
    setHasLegacyData(legacy)
  }

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = []
    if (pwd.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter')
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter')
    if (!/[0-9]/.test(pwd)) errors.push('One number')
    return errors
  }

  const handleSetup = async () => {
    setError('')
    
    const validationErrors = validatePassword(password)
    if (validationErrors.length > 0) {
      setError('Password requirements not met')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const result = await window.api.vault.setup(password)
      if (result.success) {
        onUnlock()
      } else {
        setError(result.error || 'Setup failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlock = async () => {
    setError('')
    
    if (!password) {
      setError('Please enter your password')
      return
    }

    setIsLoading(true)
    try {
      const result = await window.api.vault.unlock(password)
      if (result.success) {
        onUnlock()
      } else {
        if (result.error === 'INVALID_PASSWORD') {
          setError('Incorrect password')
        } else if (result.error === 'DECRYPTION_FAILED') {
          setError('Failed to decrypt vault. Wrong password or corrupted data.')
        } else {
          setError(result.error || 'Unlock failed')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = validatePassword(password)
  const isPasswordValid = passwordStrength.length === 0

  if (isSetup === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse">
          <Shield className="h-16 w-16 text-emerald-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl">
              <Shield className="h-10 w-10 text-white" />
            </div>
          </motion.div>
          <h1 className="mt-6 text-3xl font-bold text-white">VaultCRM</h1>
          <p className="mt-2 text-slate-400">
            {isSetup ? 'Welcome back' : 'Secure your data'}
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">
              {isSetup ? 'Unlock Your Vault' : 'Create Master Password'}
            </CardTitle>
            <CardDescription>
              {isSetup
                ? 'Enter your master password to access your data'
                : 'This password encrypts all your data locally'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {hasLegacyData && !isSetup && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500">Existing data found</p>
                  <p className="text-slate-400">
                    Your previous data will be encrypted and migrated after setup.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Master Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (isSetup ? handleUnlock() : null)}
                  placeholder={isSetup ? 'Enter password' : 'Create a strong password'}
                  className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isSetup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
                      placeholder="Confirm your password"
                      className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Password requirements */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '8+ characters', check: password.length >= 8 },
                      { label: 'Uppercase', check: /[A-Z]/.test(password) },
                      { label: 'Lowercase', check: /[a-z]/.test(password) },
                      { label: 'Number', check: /[0-9]/.test(password) }
                    ].map((req) => (
                      <div
                        key={req.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          req.check ? 'text-emerald-500' : 'text-slate-500'
                        }`}
                      >
                        {req.check ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-slate-600" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-400">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              onClick={isSetup ? handleUnlock : handleSetup}
              disabled={isLoading || (!isSetup && !isPasswordValid)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSetup ? 'Unlocking...' : 'Setting up...'}
                </div>
              ) : isSetup ? (
                'Unlock Vault'
              ) : (
                'Create Vault'
              )}
            </Button>

            {isSetup && (
              <p className="text-center text-xs text-slate-500">
                Your data is encrypted with AES-256-GCM
              </p>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-600">
          All data stays on your device. No cloud, no tracking.
        </p>
      </motion.div>
    </div>
  )
}
