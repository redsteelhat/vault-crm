# VaultCRM License API

Vercel Serverless Functions for license generation and verification.

## Setup

1. Install Vercel CLI: `npm i -g vercel`
2. Set environment variables in Vercel dashboard:
   - `LICENSE_PRIVATE_KEY` - RSA private key for signing licenses
   - `LICENSE_PUBLIC_KEY` - RSA public key for verification

3. Deploy: `vercel deploy`

## Endpoints

### POST /api/license/generate

Generate a new license key.

**Request:**
```json
{
  "email": "user@example.com",
  "plan": "lifetime",
  "expires": "2027-01-25", // Optional, for annual/trial
  "machineId": "abc123" // Optional, for device-locked licenses
}
```

**Response:**
```json
{
  "success": true,
  "licenseKey": "base64-encoded-license-key",
  "license": {
    "email": "user@example.com",
    "plan": "lifetime",
    "issuedAt": "2026-01-25T12:00:00.000Z",
    "expiresAt": null
  }
}
```

### POST /api/license/verify

Verify a license key.

**Request:**
```json
{
  "licenseKey": "base64-encoded-license-key"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "license": {
    "email": "user@example.com",
    "plan": "lifetime",
    "issuedAt": "2026-01-25T12:00:00.000Z",
    "expiresAt": null,
    "isValid": true,
    "isExpired": false
  }
}
```

### GET /api/license/status?key=LICENSE_KEY

Get license status.

**Response:**
```json
{
  "success": true,
  "license": {
    "email": "user@example.com",
    "plan": "lifetime",
    "issuedAt": "2026-01-25T12:00:00.000Z",
    "expiresAt": null,
    "isValid": true,
    "isExpired": false
  }
}
```

## Key Generation

Use the script in the main project:

```bash
npx tsx scripts/generate-license.ts --email=user@example.com --plan=lifetime
```

This will generate both private and public keys in `.keys/` directory. Use these keys as environment variables in Vercel.
