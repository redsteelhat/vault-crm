/**
 * VaultCRM Performance Benchmark Script
 * 
 * Tests performance of key operations:
 * - Search latency
 * - Contact CRUD operations
 * - Database save/load cycles
 * - Memory usage
 * 
 * Usage: npx tsx scripts/benchmark.ts [--data=./test-data.json]
 */

import { readFileSync, existsSync, unlinkSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import initSqlJs, { Database } from 'sql.js'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

// Benchmark configuration
const BENCHMARK_CONFIG = {
  searchIterations: 100,
  crudIterations: 1000,
  searchTerms: ['john', 'smith', 'tech', 'ceo', 'istanbul', 'new york', 'sales', 'engineer']
}

// Encryption constants (matching connection.ts)
const MAGIC_BYTES = Buffer.from('VCDB')
const FORMAT_VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const HEADER_SIZE = 4 + 2 + IV_LENGTH + AUTH_TAG_LENGTH

interface BenchmarkResult {
  name: string
  iterations: number
  totalMs: number
  avgMs: number
  minMs: number
  maxMs: number
  opsPerSecond: number
}

interface TestData {
  meta: {
    stats: {
      contacts: number
      interactions: number
      followups: number
    }
  }
  tags: Array<{ id: string; name: string; color: string }>
  contacts: Array<{
    id: string
    name: string
    company: string | null
    title: string | null
    emails: string
    phones: string
    location: string | null
    source: string | null
    notes: string | null
    last_contact_at: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
  }>
  interactions: Array<{
    id: string
    contact_id: string
    type: string
    body: string
    occurred_at: string
    created_at: string
  }>
  followups: Array<{
    id: string
    contact_id: string
    due_at: string
    reason: string | null
    status: string
    created_at: string
    done_at: string | null
  }>
  contact_tags: Array<{ contact_id: string; tag_id: string }>
}

// Encryption helpers
function encryptWithHeader(data: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()
  const versionBuffer = Buffer.alloc(2)
  versionBuffer.writeUInt16BE(FORMAT_VERSION, 0)
  return Buffer.concat([MAGIC_BYTES, versionBuffer, iv, authTag, encrypted])
}

function decryptWithHeader(data: Buffer, key: Buffer): Buffer {
  const iv = data.subarray(6, 6 + IV_LENGTH)
  const authTag = data.subarray(6 + IV_LENGTH, 6 + IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.subarray(HEADER_SIZE)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

// Benchmark helper
function benchmark(name: string, fn: () => void, iterations: number): BenchmarkResult {
  const times: number[] = []
  
  // Warmup
  for (let i = 0; i < Math.min(10, iterations / 10); i++) {
    fn()
  }
  
  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    times.push(performance.now() - start)
  }
  
  const totalMs = times.reduce((a, b) => a + b, 0)
  const avgMs = totalMs / iterations
  const minMs = Math.min(...times)
  const maxMs = Math.max(...times)
  const opsPerSecond = 1000 / avgMs
  
  return {
    name,
    iterations,
    totalMs: Math.round(totalMs * 100) / 100,
    avgMs: Math.round(avgMs * 100) / 100,
    minMs: Math.round(minMs * 100) / 100,
    maxMs: Math.round(maxMs * 100) / 100,
    opsPerSecond: Math.round(opsPerSecond)
  }
}

// Format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// Main benchmark
async function main() {
  console.log('=== VaultCRM Performance Benchmark ===\n')
  
  // Parse args
  const args = process.argv.slice(2)
  const dataArg = args.find(a => a.startsWith('--data='))
  const dataPath = dataArg ? dataArg.split('=')[1] : './test-data.json'
  
  // Check if test data exists
  if (!existsSync(dataPath)) {
    console.error(`Test data file not found: ${dataPath}`)
    console.error('Run: npx tsx scripts/generate-test-data.ts first')
    process.exit(1)
  }
  
  console.log(`Loading test data from: ${dataPath}`)
  const testData: TestData = JSON.parse(readFileSync(dataPath, 'utf-8'))
  
  console.log('\nTest Data Statistics:')
  console.log(`  Contacts: ${testData.meta.stats.contacts}`)
  console.log(`  Interactions: ${testData.meta.stats.interactions}`)
  console.log(`  Followups: ${testData.meta.stats.followups}`)
  console.log('')
  
  // Initialize sql.js
  console.log('Initializing sql.js...')
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  
  // Create schema
  console.log('Creating schema...')
  db.run(`
    CREATE TABLE contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      title TEXT,
      emails TEXT DEFAULT '[]',
      phones TEXT DEFAULT '[]',
      location TEXT,
      source TEXT,
      notes TEXT,
      last_contact_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX idx_contacts_name ON contacts(name);
    CREATE INDEX idx_contacts_company ON contacts(company);
    CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at);
    CREATE INDEX idx_contacts_name_lower ON contacts(lower(name));
    CREATE INDEX idx_contacts_company_lower ON contacts(lower(company));
  `)
  
  db.run(`
    CREATE TABLE tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );
  `)
  
  db.run(`
    CREATE TABLE contact_tags (
      contact_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (contact_id, tag_id)
    );
  `)
  
  db.run(`
    CREATE TABLE interactions (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      type TEXT NOT NULL,
      body TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX idx_interactions_contact_id ON interactions(contact_id);
  `)
  
  db.run(`
    CREATE TABLE followups (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      done_at TEXT,
      deleted_at TEXT
    );
    CREATE INDEX idx_followups_contact_id ON followups(contact_id);
    CREATE INDEX idx_followups_due_at ON followups(due_at);
    CREATE INDEX idx_followups_status ON followups(status);
  `)
  
  // Benchmark: Data import
  console.log('\n--- Benchmark: Data Import ---')
  const importStart = performance.now()
  
  // Insert tags
  const insertTag = db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)')
  for (const tag of testData.tags) {
    insertTag.run([tag.id, tag.name, tag.color])
  }
  insertTag.free()
  
  // Insert contacts
  const insertContact = db.prepare(`
    INSERT INTO contacts (id, name, company, title, emails, phones, location, source, notes, last_contact_at, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const c of testData.contacts) {
    insertContact.run([
      c.id, c.name, c.company, c.title, c.emails, c.phones,
      c.location, c.source, c.notes, c.last_contact_at,
      c.created_at, c.updated_at, c.deleted_at
    ])
  }
  insertContact.free()
  
  // Insert contact_tags
  const insertContactTag = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)')
  for (const ct of testData.contact_tags) {
    insertContactTag.run([ct.contact_id, ct.tag_id])
  }
  insertContactTag.free()
  
  // Insert interactions
  const insertInteraction = db.prepare(`
    INSERT INTO interactions (id, contact_id, type, body, occurred_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  for (const i of testData.interactions) {
    insertInteraction.run([i.id, i.contact_id, i.type, i.body, i.occurred_at, i.created_at])
  }
  insertInteraction.free()
  
  // Insert followups
  const insertFollowup = db.prepare(`
    INSERT INTO followups (id, contact_id, due_at, reason, status, created_at, done_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  for (const f of testData.followups) {
    insertFollowup.run([f.id, f.contact_id, f.due_at, f.reason, f.status, f.created_at, f.done_at])
  }
  insertFollowup.free()
  
  const importTime = performance.now() - importStart
  console.log(`Import completed in ${(importTime / 1000).toFixed(2)}s`)
  
  // Memory usage
  const dbBuffer = db.export()
  console.log(`Database size: ${formatBytes(dbBuffer.length)}`)
  console.log(`Memory usage: ${formatBytes(process.memoryUsage().heapUsed)}`)
  
  // Benchmark results array
  const results: BenchmarkResult[] = []
  
  // Benchmark: Search operations
  console.log('\n--- Benchmark: Search Operations ---')
  
  for (const term of BENCHMARK_CONFIG.searchTerms) {
    const pattern = `%${term.toLowerCase()}%`
    const result = benchmark(
      `Search: "${term}"`,
      () => {
        const stmt = db.prepare(`
          SELECT * FROM contacts 
          WHERE deleted_at IS NULL AND (
            lower(name) LIKE ? OR 
            lower(company) LIKE ? OR 
            lower(title) LIKE ? OR 
            lower(emails) LIKE ? OR 
            lower(notes) LIKE ?
          )
          ORDER BY 
            CASE WHEN lower(name) LIKE ? THEN 0 ELSE 1 END,
            updated_at DESC
          LIMIT 50
        `)
        stmt.bind([pattern, pattern, pattern, pattern, pattern, pattern])
        const rows: unknown[] = []
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }
        stmt.free()
      },
      BENCHMARK_CONFIG.searchIterations
    )
    results.push(result)
    console.log(`  ${result.name}: ${result.avgMs}ms avg (${result.opsPerSecond} ops/s)`)
  }
  
  // Benchmark: Get all contacts
  const getAllResult = benchmark(
    'Get all contacts',
    () => {
      const stmt = db.prepare('SELECT * FROM contacts WHERE deleted_at IS NULL ORDER BY updated_at DESC')
      const rows: unknown[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject())
      }
      stmt.free()
    },
    20
  )
  results.push(getAllResult)
  console.log(`  ${getAllResult.name}: ${getAllResult.avgMs}ms avg`)
  
  // Benchmark: Get contact by ID
  const sampleContactId = testData.contacts[Math.floor(testData.contacts.length / 2)].id
  const getByIdResult = benchmark(
    'Get contact by ID',
    () => {
      const stmt = db.prepare('SELECT * FROM contacts WHERE id = ?')
      stmt.bind([sampleContactId])
      stmt.step()
      stmt.getAsObject()
      stmt.free()
    },
    BENCHMARK_CONFIG.crudIterations
  )
  results.push(getByIdResult)
  console.log(`  ${getByIdResult.name}: ${getByIdResult.avgMs}ms avg (${getByIdResult.opsPerSecond} ops/s)`)
  
  // Benchmark: Insert contact
  console.log('\n--- Benchmark: CRUD Operations ---')
  
  const insertResult = benchmark(
    'Insert contact',
    () => {
      const stmt = db.prepare(`
        INSERT INTO contacts (id, name, company, title, emails, phones, location, source, notes, last_contact_at, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run([
        uuidv4(), 'Test User', 'Test Company', 'Test Title', '[]', '[]',
        'Test Location', 'Test Source', 'Test Notes', null,
        new Date().toISOString(), new Date().toISOString(), null
      ])
      stmt.free()
    },
    BENCHMARK_CONFIG.crudIterations
  )
  results.push(insertResult)
  console.log(`  ${insertResult.name}: ${insertResult.avgMs}ms avg (${insertResult.opsPerSecond} ops/s)`)
  
  // Benchmark: Update contact
  const updateResult = benchmark(
    'Update contact',
    () => {
      const stmt = db.prepare('UPDATE contacts SET name = ?, updated_at = ? WHERE id = ?')
      stmt.run(['Updated Name', new Date().toISOString(), sampleContactId])
      stmt.free()
    },
    BENCHMARK_CONFIG.crudIterations
  )
  results.push(updateResult)
  console.log(`  ${updateResult.name}: ${updateResult.avgMs}ms avg (${updateResult.opsPerSecond} ops/s)`)
  
  // Benchmark: Followups queries
  console.log('\n--- Benchmark: Followup Queries ---')
  
  const today = new Date().toISOString().split('T')[0]
  
  const dueTodayResult = benchmark(
    'Get due today followups',
    () => {
      const stmt = db.prepare(`
        SELECT f.*, c.name as contact_name, c.company as contact_company
        FROM followups f
        JOIN contacts c ON f.contact_id = c.id
        WHERE f.status = 'open' AND date(f.due_at) = date(?)
        AND f.deleted_at IS NULL
        ORDER BY f.due_at ASC
      `)
      stmt.bind([today])
      const rows: unknown[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject())
      }
      stmt.free()
    },
    BENCHMARK_CONFIG.searchIterations
  )
  results.push(dueTodayResult)
  console.log(`  ${dueTodayResult.name}: ${dueTodayResult.avgMs}ms avg`)
  
  const overdueResult = benchmark(
    'Get overdue followups',
    () => {
      const stmt = db.prepare(`
        SELECT f.*, c.name as contact_name, c.company as contact_company
        FROM followups f
        JOIN contacts c ON f.contact_id = c.id
        WHERE f.status = 'open' AND date(f.due_at) < date(?)
        AND f.deleted_at IS NULL
        ORDER BY f.due_at ASC
      `)
      stmt.bind([today])
      const rows: unknown[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject())
      }
      stmt.free()
    },
    BENCHMARK_CONFIG.searchIterations
  )
  results.push(overdueResult)
  console.log(`  ${overdueResult.name}: ${overdueResult.avgMs}ms avg`)
  
  // Benchmark: Encryption/Decryption
  console.log('\n--- Benchmark: Encryption/Decryption ---')
  
  const encryptionKey = randomBytes(32)
  const dbExport = Buffer.from(db.export())
  
  let encryptedDb: Buffer
  const encryptResult = benchmark(
    'Encrypt database',
    () => {
      encryptedDb = encryptWithHeader(dbExport, encryptionKey)
    },
    10
  )
  results.push(encryptResult)
  console.log(`  ${encryptResult.name}: ${encryptResult.avgMs}ms avg (${formatBytes(dbExport.length)})`)
  
  const decryptResult = benchmark(
    'Decrypt database',
    () => {
      decryptWithHeader(encryptedDb!, encryptionKey)
    },
    10
  )
  results.push(decryptResult)
  console.log(`  ${decryptResult.name}: ${decryptResult.avgMs}ms avg`)
  
  // Benchmark: Save cycle
  const saveResult = benchmark(
    'Export + Encrypt cycle',
    () => {
      const data = Buffer.from(db.export())
      encryptWithHeader(data, encryptionKey)
    },
    10
  )
  results.push(saveResult)
  console.log(`  ${saveResult.name}: ${saveResult.avgMs}ms avg`)
  
  // Summary
  console.log('\n=== Benchmark Summary ===\n')
  console.log('| Operation | Avg (ms) | Min (ms) | Max (ms) | Ops/s |')
  console.log('|-----------|----------|----------|----------|-------|')
  for (const r of results) {
    console.log(`| ${r.name.padEnd(30)} | ${r.avgMs.toString().padStart(8)} | ${r.minMs.toString().padStart(8)} | ${r.maxMs.toString().padStart(8)} | ${r.opsPerSecond.toString().padStart(5)} |`)
  }
  
  // Performance assessment
  console.log('\n=== Performance Assessment ===\n')
  
  const searchResults = results.filter(r => r.name.startsWith('Search:'))
  const avgSearchMs = searchResults.reduce((a, b) => a + b.avgMs, 0) / searchResults.length
  
  if (avgSearchMs < 50) {
    console.log('Search Performance: EXCELLENT (< 50ms avg)')
  } else if (avgSearchMs < 150) {
    console.log('Search Performance: GOOD (< 150ms avg)')
  } else if (avgSearchMs < 300) {
    console.log('Search Performance: ACCEPTABLE (< 300ms avg)')
  } else {
    console.log('Search Performance: NEEDS IMPROVEMENT (> 300ms avg)')
  }
  
  const saveMs = saveResult.avgMs
  if (saveMs < 500) {
    console.log('Save Performance: EXCELLENT (< 500ms)')
  } else if (saveMs < 1000) {
    console.log('Save Performance: GOOD (< 1s)')
  } else if (saveMs < 2000) {
    console.log('Save Performance: ACCEPTABLE (< 2s)')
  } else {
    console.log('Save Performance: NEEDS IMPROVEMENT (> 2s)')
  }
  
  // Write results to file
  const resultsPath = './benchmark-results.json'
  writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: BENCHMARK_CONFIG,
    dataStats: testData.meta.stats,
    dbSize: dbExport.length,
    results
  }, null, 2))
  console.log(`\nResults saved to: ${resultsPath}`)
  
  db.close()
  console.log('\nDone!')
}

main().catch(console.error)
