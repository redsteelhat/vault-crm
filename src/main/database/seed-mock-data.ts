/**
 * VaultCRM Mock Data Seeder
 * 
 * Seeds the database with comprehensive mock data for testing all platform features.
 */

import { v4 as uuidv4 } from 'uuid'
import { run, query } from './sqlite/connection'

// Helper functions
const randomPastDate = (daysAgo: number): string => {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date.toISOString()
}

const randomFutureDate = (daysAhead: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead) + 1)
  return date.toISOString()
}

const randomPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const randomInt = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min

// Data pools
const firstNames = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hüseyin', 'Hasan', 'İbrahim', 'Osman',
  'Fatma', 'Ayşe', 'Emine', 'Hatice', 'Zeynep', 'Elif', 'Merve', 'Büşra',
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica'
]

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'
]

const companies = [
  'TechCorp', 'InnoSoft', 'DataDrive', 'CloudBase', 'AI Solutions', 'CyberSec Inc',
  'FinTech Pro', 'HealthTech', 'EduLearn', 'RetailMax', 'LogiTrans', 'MediaHub',
  'Türk Telekom', 'Anadolu Sigorta', 'Yapı Kredi', 'Garanti BBVA', 'İş Bankası',
  'Microsoft Turkey', 'Google Turkey', 'Amazon Web Services', 'Salesforce', 'SAP'
]

const titles = [
  'CEO', 'CTO', 'CFO', 'VP of Sales', 'VP of Engineering', 'Director of Marketing',
  'Product Manager', 'Senior Developer', 'Sales Manager', 'Account Executive',
  'Founder', 'Co-Founder', 'Managing Director', 'Partner', 'Consultant'
]

const locations = [
  'Istanbul, Turkey', 'Ankara, Turkey', 'Izmir, Turkey',
  'San Francisco, CA', 'New York, NY', 'London, UK', 'Berlin, Germany'
]

const sources = ['LinkedIn', 'Website', 'Referral', 'Conference', 'Cold Outreach', 'Trade Show', 'Webinar']

const noteTemplates = [
  'Had a great initial call. They are interested in our enterprise solution.',
  'Met at the tech conference. Very enthusiastic about AI features.',
  'Follow-up from webinar. Asked detailed questions about pricing.',
  'Demo scheduled for next week. Key decision maker is involved.',
  'Contract negotiations in progress. Legal team reviewing.',
  'Pilot program started. 10 users currently testing.',
  'Positive feedback from pilot. Ready to discuss full deployment.',
  'Closed! Signed 2-year enterprise agreement.'
]

const meetingNotes = [
  'Product demo - showed core CRM features and reporting capabilities.',
  'Technical deep-dive with engineering team on API integrations.',
  'Quarterly business review - discussed roadmap and expansion.',
  'Onboarding session - trained 15 team members on platform.'
]

const callNotes = [
  'Quick check-in call. Everything going well with the pilot.',
  'Discussed timeline for implementation. Targeting end of month.',
  'Price negotiation call. Offered 15% volume discount.'
]

const followUpReasons = [
  'Send proposal document', 'Schedule demo with team', 'Follow up on contract',
  'Check pilot progress', 'Send case study', 'Quarterly check-in', 'Renewal discussion'
]

const dealNames = [
  'Enterprise CRM Implementation', 'Cloud Migration Project', 'Annual Software License',
  'Professional Services Package', 'Custom Integration Development', 'Training & Onboarding'
]

const taskTitles = [
  'Prepare proposal', 'Schedule demo call', 'Send contract to legal', 'Follow up on quote',
  'Create presentation deck', 'Research competitor offerings', 'Update CRM records'
]

const tagData = [
  { name: 'VIP', color: '#f59e0b' },
  { name: 'Hot Lead', color: '#ef4444' },
  { name: 'Customer', color: '#3b82f6' },
  { name: 'Prospect', color: '#6366f1' },
  { name: 'Enterprise', color: '#f97316' },
  { name: 'Startup', color: '#84cc16' },
  { name: 'Decision Maker', color: '#a855f7' }
]

export async function seedMockData(): Promise<{ success: boolean; stats: Record<string, number> }> {
  console.log('Starting mock data seeding...')
  
  const stats = {
    tags: 0,
    contacts: 0,
    interactions: 0,
    followups: 0,
    deals: 0,
    tasks: 0,
    automations: 0,
    templates: 0
  }

  try {
    // Check if data already exists
    const existingContacts = query<{ count: number }>('SELECT COUNT(*) as count FROM contacts WHERE deleted_at IS NULL')
    if (existingContacts[0]?.count > 10) {
      console.log('Database already has data, skipping seed')
      return { success: true, stats }
    }

    // Seed Tags
    console.log('Seeding tags...')
    const tagIds: string[] = []
    for (const tag of tagData) {
      const id = `tag_${uuidv4().slice(0, 8)}`
      run(
        'INSERT OR IGNORE INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [id, tag.name, tag.color, randomPastDate(90)]
      )
      tagIds.push(id)
      stats.tags++
    }

    // Seed Contacts (50 contacts)
    console.log('Seeding 50 contacts...')
    const contactIds: string[] = []
    for (let i = 0; i < 50; i++) {
      const firstName = randomPick(firstNames)
      const lastName = randomPick(lastNames)
      const company = randomPick(companies)
      const domain = company.toLowerCase().replace(/\s+/g, '') + '.com'
      const id = `contact_${uuidv4().slice(0, 8)}`
      
      run(
        `INSERT INTO contacts (id, name, company, title, emails, phones, location, source, notes, last_contact_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          `${firstName} ${lastName}`,
          company,
          randomPick(titles),
          JSON.stringify([`${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`]),
          JSON.stringify([`+90 5${randomInt(30, 59)} ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`]),
          randomPick(locations),
          randomPick(sources),
          randomPick(noteTemplates),
          randomPastDate(30),
          randomPastDate(180),
          randomPastDate(7)
        ]
      )
      contactIds.push(id)
      stats.contacts++

      // Add random tags to contact
      const numTags = randomInt(0, 3)
      const shuffledTags = [...tagIds].sort(() => Math.random() - 0.5).slice(0, numTags)
      for (const tagId of shuffledTags) {
        run(
          'INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)',
          [id, tagId]
        )
      }
    }

    // Seed Interactions (200 interactions)
    console.log('Seeding 200 interactions...')
    const interactionTypes = ['note', 'call', 'meeting', 'email']
    for (let i = 0; i < 200; i++) {
      const type = randomPick(interactionTypes)
      const contactId = randomPick(contactIds)
      
      let body = ''
      switch (type) {
        case 'note': body = randomPick(noteTemplates); break
        case 'meeting': body = randomPick(meetingNotes); break
        case 'call': body = randomPick(callNotes); break
        case 'email': body = `Subject: Follow-up\n\n${randomPick(noteTemplates)}`; break
      }
      
      run(
        `INSERT INTO interactions (id, contact_id, type, body, occurred_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `interaction_${uuidv4().slice(0, 8)}`,
          contactId,
          type,
          body,
          randomPastDate(90),
          randomPastDate(90)
        ]
      )
      stats.interactions++
    }

    // Seed Follow-ups (40 follow-ups)
    console.log('Seeding 40 follow-ups...')
    const followupStatuses = ['open', 'open', 'open', 'done', 'done', 'snoozed']
    for (let i = 0; i < 40; i++) {
      const contactId = randomPick(contactIds)
      const status = randomPick(followupStatuses)
      
      let dueAt: string
      if (status === 'done') {
        dueAt = randomPastDate(30)
      } else if (Math.random() > 0.7) {
        dueAt = randomPastDate(14) // Overdue
      } else {
        dueAt = randomFutureDate(14)
      }
      
      run(
        `INSERT INTO followups (id, contact_id, due_at, reason, status, created_at, done_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `followup_${uuidv4().slice(0, 8)}`,
          contactId,
          dueAt,
          randomPick(followUpReasons),
          status,
          randomPastDate(60),
          status === 'done' ? randomPastDate(7) : null
        ]
      )
      stats.followups++
    }

    // Seed Deals (25 deals)
    console.log('Seeding 25 deals...')
    const salesStages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
    const currencies = ['USD', 'EUR', 'TRY']
    const probabilities: Record<string, number> = {
      'lead': 10, 'qualified': 25, 'proposal': 50, 'negotiation': 75, 'closed_won': 100, 'closed_lost': 0
    }
    
    for (let i = 0; i < 25; i++) {
      const contactId = randomPick(contactIds)
      const stage = randomPick(salesStages)
      const isClosed = stage.startsWith('closed')
      const isWon = stage === 'closed_won'
      
      // Get contact company for deal name
      const contact = query<{ company: string }>('SELECT company FROM contacts WHERE id = ?', [contactId])
      const company = contact[0]?.company || 'Company'
      
      run(
        `INSERT INTO deals (id, pipeline_id, contact_id, name, value, currency, stage, probability, expected_close, notes, created_at, updated_at, closed_at, won)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `deal_${uuidv4().slice(0, 8)}`,
          'pipeline_default',
          contactId,
          `${randomPick(dealNames)} - ${company}`,
          randomInt(5, 500) * 1000,
          randomPick(currencies),
          stage,
          probabilities[stage] || 50,
          randomFutureDate(90),
          randomPick(noteTemplates),
          randomPastDate(120),
          randomPastDate(7),
          isClosed ? randomPastDate(30) : null,
          isClosed ? (isWon ? 1 : 0) : null
        ]
      )
      stats.deals++
    }

    // Get deal IDs for tasks
    const dealRows = query<{ id: string }>('SELECT id FROM deals LIMIT 25')
    const dealIds = dealRows.map(d => d.id)

    // Seed Tasks (35 tasks)
    console.log('Seeding 35 tasks...')
    const priorities = ['low', 'medium', 'medium', 'high', 'urgent']
    const taskStatuses = ['open', 'open', 'open', 'done', 'cancelled']
    
    for (let i = 0; i < 35; i++) {
      const contactId = Math.random() > 0.3 ? randomPick(contactIds) : null
      const dealId = Math.random() > 0.5 && dealIds.length > 0 ? randomPick(dealIds) : null
      const status = randomPick(taskStatuses)
      const priority = randomPick(priorities)
      
      let dueAt: string | null
      if (status === 'done' || status === 'cancelled') {
        dueAt = randomPastDate(14)
      } else if (Math.random() > 0.8) {
        dueAt = randomPastDate(7) // Overdue
      } else {
        dueAt = randomFutureDate(14)
      }
      
      run(
        `INSERT INTO tasks (id, contact_id, deal_id, title, description, due_at, priority, status, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `task_${uuidv4().slice(0, 8)}`,
          contactId,
          dealId,
          randomPick(taskTitles),
          Math.random() > 0.5 ? randomPick(noteTemplates) : null,
          dueAt,
          priority,
          status,
          randomPastDate(30),
          status === 'done' ? randomPastDate(3) : null
        ]
      )
      stats.tasks++
    }

    // Seed Automation Rules (5 rules)
    console.log('Seeding 5 automation rules...')
    const automations = [
      {
        name: 'Tag VIP → Create Welcome Task',
        trigger_type: 'tag_added',
        trigger_config: JSON.stringify({ tag_name: 'VIP' }),
        action_type: 'create_task',
        action_config: JSON.stringify({ title: 'Send welcome package to VIP contact', priority: 'high' }),
        enabled: 1
      },
      {
        name: 'New Contact → Add Prospect Tag',
        trigger_type: 'contact_created',
        trigger_config: JSON.stringify({}),
        action_type: 'add_tag',
        action_config: JSON.stringify({ tag_name: 'Prospect' }),
        enabled: 1
      },
      {
        name: 'Deal Won → Notify Team',
        trigger_type: 'deal_stage_changed',
        trigger_config: JSON.stringify({ to_stage: 'closed_won' }),
        action_type: 'send_notification',
        action_config: JSON.stringify({ title: 'Deal Won!', message: 'A new deal has been closed successfully.' }),
        enabled: 1
      },
      {
        name: 'Hot Lead → Move to Qualified',
        trigger_type: 'tag_added',
        trigger_config: JSON.stringify({ tag_name: 'Hot Lead' }),
        action_type: 'move_deal_stage',
        action_config: JSON.stringify({ stage: 'qualified' }),
        enabled: 0
      },
      {
        name: 'Follow-up Done → Update Last Contact',
        trigger_type: 'followup_done',
        trigger_config: JSON.stringify({}),
        action_type: 'update_field',
        action_config: JSON.stringify({ field: 'last_contact_at', value: 'now' }),
        enabled: 1
      }
    ]
    
    for (const rule of automations) {
      run(
        `INSERT INTO automation_rules (id, name, trigger_type, trigger_config, action_type, action_config, enabled, run_count, last_run_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `rule_${uuidv4().slice(0, 8)}`,
          rule.name,
          rule.trigger_type,
          rule.trigger_config,
          rule.action_type,
          rule.action_config,
          rule.enabled,
          randomInt(5, 50),
          randomPastDate(7),
          randomPastDate(60)
        ]
      )
      stats.automations++
    }

    // Seed Email Templates (5 templates)
    console.log('Seeding 5 email templates...')
    const templates = [
      {
        name: 'Initial Outreach',
        subject: 'Introduction to VaultCRM - {{company}}',
        body: 'Hi {{name}},\n\nI wanted to reach out to introduce VaultCRM...',
        variables: JSON.stringify(['name', 'company'])
      },
      {
        name: 'Follow-up After Demo',
        subject: 'Great chatting with you, {{name}}!',
        body: 'Hi {{name}},\n\nThank you for taking the time to see our demo...',
        variables: JSON.stringify(['name', 'company'])
      },
      {
        name: 'Contract Reminder',
        subject: 'Reminder: Contract Review - {{company}}',
        body: 'Hi {{name}},\n\nI wanted to follow up on the contract...',
        variables: JSON.stringify(['name', 'company'])
      },
      {
        name: 'Renewal Notice',
        subject: 'Your VaultCRM subscription renewal',
        body: 'Hi {{name}},\n\nYour subscription is coming up for renewal...',
        variables: JSON.stringify(['name', 'company', 'renewal_date'])
      },
      {
        name: 'Welcome Email',
        subject: 'Welcome to VaultCRM, {{name}}!',
        body: 'Hi {{name}},\n\nWelcome to VaultCRM! We are thrilled to have {{company}} join...',
        variables: JSON.stringify(['name', 'company'])
      }
    ]
    
    for (const template of templates) {
      run(
        `INSERT INTO email_templates (id, name, subject, body, variables, usage_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `template_${uuidv4().slice(0, 8)}`,
          template.name,
          template.subject,
          template.body,
          template.variables,
          randomInt(5, 30),
          randomPastDate(90),
          randomPastDate(7)
        ]
      )
      stats.templates++
    }

    console.log('Mock data seeding completed!')
    console.log('Stats:', stats)
    
    return { success: true, stats }
  } catch (error) {
    console.error('Error seeding mock data:', error)
    throw error
  }
}
