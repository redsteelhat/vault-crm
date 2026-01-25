import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

export interface EncryptedData {
  encrypted: string
  iv: string
  authTag: string
  salt: string
}

export function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

export function encrypt(text: string, password: string): EncryptedData {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex')
  }
}

export function decrypt(data: EncryptedData, password: string): string {
  const salt = Buffer.from(data.salt, 'hex')
  const key = deriveKey(password, salt)
  const iv = Buffer.from(data.iv, 'hex')
  const authTag = Buffer.from(data.authTag, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// For encrypting individual fields (simpler, less secure)
export function simpleEncrypt(text: string, key: string): string {
  const salt = randomBytes(16)
  const derivedKey = scryptSync(key, salt, 32)
  const iv = randomBytes(16)
  
  const cipher = createCipheriv('aes-256-cbc', derivedKey, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + encrypted
}

export function simpleDecrypt(encryptedText: string, key: string): string {
  const [saltHex, ivHex, encrypted] = encryptedText.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const derivedKey = scryptSync(key, salt, 32)
  
  const decipher = createDecipheriv('aes-256-cbc', derivedKey, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
