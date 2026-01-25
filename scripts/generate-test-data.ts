/**
 * VaultCRM Synthetic Test Data Generator
 * 
 * Generates realistic test data for performance benchmarking:
 * - 10,000 contacts
 * - 50,000 interactions
 * - 20,000 followups
 * 
 * Usage: npx tsx scripts/generate-test-data.ts [--output=./test-data.json]
 */

import { writeFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

// Configuration
const CONFIG = {
  contacts: 10000,
  interactionsPerContact: 5, // Average
  followupsPerContact: 2,    // Average
  tags: 15
}

// Turkish/English first names
const FIRST_NAMES = [
  // Turkish
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Ömer', 'Osman', 'Yusuf',
  'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Meryem', 'Şerife', 'Zehra', 'Sultan',
  'Emre', 'Burak', 'Can', 'Deniz', 'Ege', 'Furkan', 'Gökhan', 'Kerem', 'Mert', 'Onur',
  'Selin', 'Derya', 'Esra', 'Gamze', 'Gül', 'İrem', 'Melis', 'Nazlı', 'Pınar', 'Seda',
  // English
  'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Alex', 'Chris', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Cameron'
]

// Turkish/English last names
const LAST_NAMES = [
  // Turkish
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan',
  'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek', 'Polat',
  'Erdoğan', 'Güneş', 'Aktaş', 'Yalçın', 'Korkmaz', 'Tekin', 'Güler', 'Karahan', 'Aksoy', 'Acar',
  // English
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Young',
  'Walker', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Adams', 'Baker', 'Hill', 'Nelson'
]

// Companies
const COMPANIES = [
  'Tech Innovations', 'Global Solutions', 'Digital Dynamics', 'Cloud Systems', 'Data Insights',
  'Smart Analytics', 'Future Tech', 'Cyber Security Pro', 'AI Ventures', 'Blockchain Labs',
  'Fintech Solutions', 'HealthTech Inc', 'EdTech Global', 'GreenEnergy Co', 'Retail Plus',
  'Logistics Hub', 'Media Works', 'Creative Agency', 'Consulting Group', 'Investment Partners',
  'Startup Studio', 'Growth Hackers', 'Scale Up', 'Enterprise Systems', 'Mobile First',
  'Web Solutions', 'API Factory', 'DevOps Team', 'QA Masters', 'Design Studio',
  'Marketing Pro', 'Sales Force', 'HR Tech', 'Legal Tech', 'PropTech',
  'AgriTech', 'BioTech', 'CleanTech', 'SpaceTech', 'GameDev Studios'
]

// Job titles
const TITLES = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'VP Engineering', 'VP Sales', 'VP Marketing',
  'Director of Product', 'Director of Engineering', 'Director of Sales', 'Director of Operations',
  'Senior Software Engineer', 'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Product Manager', 'Project Manager', 'Business Analyst', 'Data Scientist',
  'UX Designer', 'UI Designer', 'Graphic Designer', 'Marketing Manager',
  'Sales Representative', 'Account Manager', 'Customer Success Manager', 'Support Engineer',
  'DevOps Engineer', 'QA Engineer', 'Security Engineer', 'Network Engineer',
  'Financial Analyst', 'HR Manager', 'Legal Counsel', 'Operations Manager',
  'Founder', 'Co-Founder', 'Partner', 'Consultant', 'Freelancer'
]

// Locations
const LOCATIONS = [
  'İstanbul, Turkey', 'Ankara, Turkey', 'İzmir, Turkey', 'Bursa, Turkey', 'Antalya, Turkey',
  'New York, USA', 'San Francisco, USA', 'Los Angeles, USA', 'Chicago, USA', 'Boston, USA',
  'London, UK', 'Berlin, Germany', 'Paris, France', 'Amsterdam, Netherlands', 'Dublin, Ireland',
  'Singapore', 'Tokyo, Japan', 'Sydney, Australia', 'Toronto, Canada', 'Dubai, UAE',
  'Remote', 'Hybrid'
]

// Sources
const SOURCES = [
  'LinkedIn', 'Twitter', 'Conference', 'Referral', 'Cold Email', 'Website', 'Meetup',
  'Webinar', 'Podcast', 'Newsletter', 'Partnership', 'Inbound', 'Outbound', 'Event', 'Demo'
]

// Interaction types
const INTERACTION_TYPES = ['note', 'call', 'meeting', 'email'] as const

// Interaction templates
const INTERACTION_TEMPLATES = {
  note: [
    'Discussed potential collaboration opportunities',
    'Reviewed project requirements and timeline',
    'Shared industry insights and market trends',
    'Followed up on previous conversation',
    'Noted interest in our product roadmap',
    'Key decision maker, high priority lead',
    'Mentioned budget constraints, follow up next quarter',
    'Very responsive, good communication',
    'Technical background, understands our solution well',
    'Referred by mutual connection'
  ],
  call: [
    'Introductory call, explained our value proposition',
    'Discovery call, identified pain points',
    'Demo call, showed main features',
    'Follow-up call, answered technical questions',
    'Pricing discussion, sent proposal',
    'Negotiation call, discussed terms',
    'Onboarding call, walked through setup',
    'Check-in call, gathered feedback',
    'Quarterly review call',
    'Renewal discussion'
  ],
  meeting: [
    'In-person meeting at their office',
    'Virtual meeting via Zoom',
    'Lunch meeting to discuss partnership',
    'Conference meeting at tech event',
    'Product demo meeting with team',
    'Strategy session for Q4 planning',
    'Workshop on implementation approach',
    'Executive briefing presentation',
    'Technical deep-dive session',
    'Contract signing meeting'
  ],
  email: [
    'Sent introduction email with company overview',
    'Shared case study and success stories',
    'Followed up with pricing information',
    'Sent proposal document',
    'Answered technical questions via email',
    'Shared product roadmap update',
    'Sent meeting recap and next steps',
    'Forwarded relevant article/resource',
    'Confirmed next meeting date',
    'Sent thank you note after meeting'
  ]
}

// Follow-up reasons
const FOLLOWUP_REASONS = [
  'Schedule demo call',
  'Send proposal',
  'Follow up on proposal',
  'Check decision status',
  'Quarterly check-in',
  'Share new feature update',
  'Discuss renewal',
  'Request referral',
  'Send case study',
  'Schedule lunch meeting',
  'Review contract terms',
  'Onboarding follow-up',
  'Collect feedback',
  'Introduce new team member',
  'Share industry report'
]

// Tag definitions
const TAGS = [
  { id: 'tag_investor', name: 'Investor', color: '#10b981' },
  { id: 'tag_hotlead', name: 'Hot Lead', color: '#ef4444' },
  { id: 'tag_community', name: 'Community', color: '#8b5cf6' },
  { id: 'tag_partner', name: 'Partner', color: '#f59e0b' },
  { id: 'tag_friend', name: 'Friend', color: '#3b82f6' },
  { id: 'tag_customer', name: 'Customer', color: '#06b6d4' },
  { id: 'tag_prospect', name: 'Prospect', color: '#84cc16' },
  { id: 'tag_enterprise', name: 'Enterprise', color: '#6366f1' },
  { id: 'tag_smb', name: 'SMB', color: '#ec4899' },
  { id: 'tag_startup', name: 'Startup', color: '#14b8a6' },
  { id: 'tag_speaker', name: 'Speaker', color: '#f97316' },
  { id: 'tag_advisor', name: 'Advisor', color: '#a855f7' },
  { id: 'tag_media', name: 'Media', color: '#22c55e' },
  { id: 'tag_churned', name: 'Churned', color: '#64748b' },
  { id: 'tag_vip', name: 'VIP', color: '#eab308' }
]

// Helper functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(startDays: number, endDays: number): string {
  const now = new Date()
  const days = randomInt(startDays, endDays)
  const date = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

function generateEmail(firstName: string, lastName: string, company: string): string {
  const domain = company.toLowerCase().replace(/\s+/g, '') + '.com'
  const formats = [
    `${firstName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    `${firstName[0].toLowerCase()}${lastName.toLowerCase()}@${domain}`
  ]
  return randomElement(formats)
}

function generatePhone(): string {
  const formats = [
    `+90 ${randomInt(500, 559)} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
    `+1 ${randomInt(200, 999)} ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
    `+44 ${randomInt(20, 79)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`
  ]
  return randomElement(formats)
}

// Data generation
interface Contact {
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
}

interface Interaction {
  id: string
  contact_id: string
  type: 'note' | 'call' | 'meeting' | 'email'
  body: string
  occurred_at: string
  created_at: string
  deleted_at: string | null
}

interface FollowUp {
  id: string
  contact_id: string
  due_at: string
  reason: string | null
  status: 'open' | 'done' | 'snoozed'
  created_at: string
  done_at: string | null
  deleted_at: string | null
}

interface ContactTag {
  contact_id: string
  tag_id: string
}

function generateContacts(count: number): Contact[] {
  console.log(`Generating ${count} contacts...`)
  const contacts: Contact[] = []
  
  for (let i = 0; i < count; i++) {
    const firstName = randomElement(FIRST_NAMES)
    const lastName = randomElement(LAST_NAMES)
    const company = Math.random() > 0.1 ? randomElement(COMPANIES) : null
    
    const createdAt = randomDate(-365, -1)
    const updatedAt = randomDate(-30, 0)
    const lastContactAt = Math.random() > 0.3 ? randomDate(-60, 0) : null
    
    contacts.push({
      id: uuidv4(),
      name: `${firstName} ${lastName}`,
      company,
      title: Math.random() > 0.15 ? randomElement(TITLES) : null,
      emails: JSON.stringify(company ? [generateEmail(firstName, lastName, company)] : []),
      phones: JSON.stringify(Math.random() > 0.3 ? [generatePhone()] : []),
      location: Math.random() > 0.2 ? randomElement(LOCATIONS) : null,
      source: Math.random() > 0.25 ? randomElement(SOURCES) : null,
      notes: Math.random() > 0.5 ? `Initial contact from ${randomElement(SOURCES)}. ${randomElement(INTERACTION_TEMPLATES.note)}` : null,
      last_contact_at: lastContactAt,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null
    })
    
    if ((i + 1) % 1000 === 0) {
      console.log(`  Generated ${i + 1} contacts...`)
    }
  }
  
  return contacts
}

function generateInteractions(contacts: Contact[], avgPerContact: number): Interaction[] {
  console.log(`Generating interactions (avg ${avgPerContact} per contact)...`)
  const interactions: Interaction[] = []
  
  for (const contact of contacts) {
    const count = randomInt(0, avgPerContact * 2)
    
    for (let i = 0; i < count; i++) {
      const type = randomElement(INTERACTION_TYPES)
      const occurredAt = randomDate(-180, 0)
      
      interactions.push({
        id: uuidv4(),
        contact_id: contact.id,
        type,
        body: randomElement(INTERACTION_TEMPLATES[type]),
        occurred_at: occurredAt,
        created_at: occurredAt,
        deleted_at: null
      })
    }
  }
  
  console.log(`  Generated ${interactions.length} interactions`)
  return interactions
}

function generateFollowups(contacts: Contact[], avgPerContact: number): FollowUp[] {
  console.log(`Generating followups (avg ${avgPerContact} per contact)...`)
  const followups: FollowUp[] = []
  
  for (const contact of contacts) {
    const count = randomInt(0, avgPerContact * 2)
    
    for (let i = 0; i < count; i++) {
      const createdAt = randomDate(-60, 0)
      const dueAt = randomDate(-14, 30)
      const isDone = Math.random() > 0.6
      const isSnoozed = !isDone && Math.random() > 0.8
      
      followups.push({
        id: uuidv4(),
        contact_id: contact.id,
        due_at: dueAt,
        reason: randomElement(FOLLOWUP_REASONS),
        status: isDone ? 'done' : isSnoozed ? 'snoozed' : 'open',
        created_at: createdAt,
        done_at: isDone ? randomDate(-7, 0) : null,
        deleted_at: null
      })
    }
  }
  
  console.log(`  Generated ${followups.length} followups`)
  return followups
}

function generateContactTags(contacts: Contact[]): ContactTag[] {
  console.log('Generating contact-tag relationships...')
  const contactTags: ContactTag[] = []
  
  for (const contact of contacts) {
    // Each contact has 0-3 tags
    const tagCount = randomInt(0, 3)
    const shuffledTags = [...TAGS].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < tagCount; i++) {
      contactTags.push({
        contact_id: contact.id,
        tag_id: shuffledTags[i].id
      })
    }
  }
  
  console.log(`  Generated ${contactTags.length} contact-tag relationships`)
  return contactTags
}

// Main function
async function main() {
  console.log('=== VaultCRM Test Data Generator ===\n')
  console.log('Configuration:')
  console.log(`  Contacts: ${CONFIG.contacts}`)
  console.log(`  Interactions per contact (avg): ${CONFIG.interactionsPerContact}`)
  console.log(`  Followups per contact (avg): ${CONFIG.followupsPerContact}`)
  console.log('')
  
  const startTime = Date.now()
  
  // Generate data
  const contacts = generateContacts(CONFIG.contacts)
  const interactions = generateInteractions(contacts, CONFIG.interactionsPerContact)
  const followups = generateFollowups(contacts, CONFIG.followupsPerContact)
  const contactTags = generateContactTags(contacts)
  
  // Build output
  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      version: '1.0.0',
      stats: {
        contacts: contacts.length,
        interactions: interactions.length,
        followups: followups.length,
        tags: TAGS.length,
        contact_tags: contactTags.length
      }
    },
    tags: TAGS,
    contacts,
    interactions,
    followups,
    contact_tags: contactTags
  }
  
  // Parse output path from args
  const args = process.argv.slice(2)
  const outputArg = args.find(a => a.startsWith('--output='))
  const outputPath = outputArg ? outputArg.split('=')[1] : './test-data.json'
  
  // Write to file
  console.log(`\nWriting to ${outputPath}...`)
  writeFileSync(outputPath, JSON.stringify(output, null, 2))
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  const fileSize = (JSON.stringify(output).length / (1024 * 1024)).toFixed(2)
  
  console.log('')
  console.log('=== Summary ===')
  console.log(`  Contacts: ${contacts.length}`)
  console.log(`  Interactions: ${interactions.length}`)
  console.log(`  Followups: ${followups.length}`)
  console.log(`  Tags: ${TAGS.length}`)
  console.log(`  Contact-Tags: ${contactTags.length}`)
  console.log(`  File size: ${fileSize} MB`)
  console.log(`  Time: ${elapsed}s`)
  console.log('')
  console.log('Done!')
}

main().catch(console.error)
