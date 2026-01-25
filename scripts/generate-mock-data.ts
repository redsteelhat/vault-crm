/**
 * VaultCRM Mock Data Generator
 * 
 * Generates comprehensive mock data to test all platform features:
 * - Contacts with various fields, tags, and sources
 * - Interactions (notes, calls, meetings, emails)
 * - Follow-ups (open, done, overdue, snoozed)
 * - Tags with colors
 * - Pipelines with stages
 * - Deals in various stages
 * - Tasks with priorities and statuses
 * - Automation rules
 * - Email templates
 * - Sequences
 */

import { v4 as uuidv4 } from 'uuid'

// Helper functions
const randomDate = (start: Date, end: Date): string => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString()
}

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
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica',
  'Hans', 'Klaus', 'Wolfgang', 'Stefan', 'Thomas', 'Andreas', 'Peter', 'Michael',
  'Marie', 'Sophie', 'Emma', 'Léa', 'Chloé', 'Camille', 'Inès', 'Manon'
]

const lastNames = [
  'Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk',
  'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Koç',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris',
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand'
]

const companies = [
  'TechCorp', 'InnoSoft', 'DataDrive', 'CloudBase', 'AI Solutions', 'CyberSec Inc',
  'FinTech Pro', 'HealthTech', 'EduLearn', 'RetailMax', 'LogiTrans', 'MediaHub',
  'Türk Telekom', 'Anadolu Sigorta', 'Yapı Kredi', 'Garanti BBVA', 'İş Bankası',
  'Koç Holding', 'Sabancı Holding', 'Arçelik', 'Vestel', 'THY', 'Turkcell',
  'Microsoft Turkey', 'Google Turkey', 'Amazon Web Services', 'Salesforce',
  'SAP', 'Oracle', 'IBM', 'Accenture', 'Deloitte', 'McKinsey', 'BCG', 'Bain'
]

const titles = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'VP of Sales', 'VP of Engineering',
  'Director of Marketing', 'Director of Operations', 'Product Manager',
  'Senior Developer', 'Software Engineer', 'Data Scientist', 'UX Designer',
  'Sales Manager', 'Account Executive', 'Business Development Manager',
  'HR Director', 'Finance Manager', 'Legal Counsel', 'Consultant', 'Analyst',
  'Founder', 'Co-Founder', 'Managing Director', 'Partner', 'Principal'
]

const locations = [
  'Istanbul, Turkey', 'Ankara, Turkey', 'Izmir, Turkey', 'Bursa, Turkey',
  'San Francisco, CA', 'New York, NY', 'Los Angeles, CA', 'Chicago, IL',
  'London, UK', 'Berlin, Germany', 'Paris, France', 'Amsterdam, Netherlands',
  'Dubai, UAE', 'Singapore', 'Tokyo, Japan', 'Sydney, Australia'
]

const sources = [
  'LinkedIn', 'Website', 'Referral', 'Conference', 'Cold Outreach',
  'Trade Show', 'Webinar', 'Partner', 'Organic', 'Advertisement'
]

const emailDomains = [
  'gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
  'company.com', 'enterprise.io', 'business.co', 'corp.net'
]

const tagPool = [
  { name: 'VIP', color: '#f59e0b' },
  { name: 'Investor', color: '#10b981' },
  { name: 'Hot Lead', color: '#ef4444' },
  { name: 'Partner', color: '#8b5cf6' },
  { name: 'Customer', color: '#3b82f6' },
  { name: 'Prospect', color: '#6366f1' },
  { name: 'Friend', color: '#ec4899' },
  { name: 'Community', color: '#14b8a6' },
  { name: 'Enterprise', color: '#f97316' },
  { name: 'Startup', color: '#84cc16' },
  { name: 'Decision Maker', color: '#a855f7' },
  { name: 'Influencer', color: '#06b6d4' }
]

const noteTemplates = [
  'Had a great initial call. They are interested in our enterprise solution.',
  'Met at the tech conference. Very enthusiastic about AI features.',
  'Referred by ${referrer}. Looking for CRM solution for their team.',
  'Follow-up from webinar. Asked detailed questions about pricing.',
  'Demo scheduled for next week. Key decision maker is involved.',
  'Contract negotiations in progress. Legal team reviewing.',
  'Pilot program started. 10 users currently testing.',
  'Positive feedback from pilot. Ready to discuss full deployment.',
  'Budget approved for Q2. Waiting for final sign-off.',
  'Closed! Signed 2-year enterprise agreement.',
  'Discussed integration requirements with their tech team.',
  'They need custom reporting features. Checking with product team.',
  'Postponed decision to next quarter due to budget constraints.',
  'Competitor evaluation in progress. Need to differentiate.',
  'Strong champion internally. Helping with internal advocacy.'
]

const meetingNotes = [
  'Product demo - showed core CRM features and reporting capabilities.',
  'Technical deep-dive with engineering team on API integrations.',
  'Quarterly business review - discussed roadmap and expansion.',
  'Negotiation meeting - discussed pricing and contract terms.',
  'Onboarding session - trained 15 team members on platform.',
  'Executive briefing - presented ROI analysis and success metrics.',
  'Integration planning session with IT department.',
  'User feedback session - collected feature requests.'
]

const callNotes = [
  'Quick check-in call. Everything going well with the pilot.',
  'Discussed timeline for implementation. Targeting end of month.',
  'Addressed concerns about data migration. Provided documentation.',
  'Scheduled follow-up demo for additional stakeholders.',
  'Price negotiation call. Offered 15% volume discount.',
  'Technical support call. Resolved API authentication issue.',
  'Renewal discussion. Happy with service, considering upgrade.'
]

const followUpReasons = [
  'Send proposal document',
  'Schedule demo with team',
  'Follow up on contract',
  'Check pilot progress',
  'Send case study',
  'Quarterly check-in',
  'Renewal discussion',
  'Upsell opportunity',
  'Reference request',
  'Partnership discussion',
  'Technical review',
  'Budget planning'
]

const dealNames = [
  'Enterprise CRM Implementation',
  'Cloud Migration Project',
  'Annual Software License',
  'Professional Services Package',
  'Custom Integration Development',
  'Training & Onboarding',
  'Support & Maintenance',
  'Consulting Engagement',
  'Pilot Program',
  'Expansion Deal',
  'Renewal Agreement',
  'Add-on Modules'
]

const taskTitles = [
  'Prepare proposal for ${company}',
  'Schedule demo call',
  'Send contract to legal',
  'Follow up on quote',
  'Create presentation deck',
  'Research competitor offerings',
  'Update CRM records',
  'Prepare quarterly report',
  'Review contract terms',
  'Set up customer onboarding',
  'Conduct reference check',
  'Finalize pricing model',
  'Coordinate with product team',
  'Arrange executive meeting',
  'Complete security questionnaire'
]

// Generate functions
interface GeneratedData {
  tags: any[]
  contacts: any[]
  interactions: any[]
  followups: any[]
  pipelines: any[]
  deals: any[]
  tasks: any[]
  automations: any[]
  templates: any[]
  sequences: any[]
}

function generateMockData(): GeneratedData {
  const data: GeneratedData = {
    tags: [],
    contacts: [],
    interactions: [],
    followups: [],
    pipelines: [],
    deals: [],
    tasks: [],
    automations: [],
    templates: [],
    sequences: []
  }

  // Generate Tags
  console.log('Generating tags...')
  data.tags = tagPool.map((tag, index) => ({
    id: `tag_${uuidv4().slice(0, 8)}`,
    name: tag.name,
    color: tag.color,
    created_at: randomPastDate(365)
  }))

  // Generate Contacts (50 contacts)
  console.log('Generating 50 contacts...')
  for (let i = 0; i < 50; i++) {
    const firstName = randomPick(firstNames)
    const lastName = randomPick(lastNames)
    const company = randomPick(companies)
    const domain = company.toLowerCase().replace(/\s+/g, '') + '.com'
    
    const contact = {
      id: `contact_${uuidv4().slice(0, 8)}`,
      name: `${firstName} ${lastName}`,
      company: company,
      title: randomPick(titles),
      emails: JSON.stringify([`${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`]),
      phones: JSON.stringify([`+90 5${randomInt(30, 59)} ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`]),
      location: randomPick(locations),
      source: randomPick(sources),
      notes: randomPick(noteTemplates).replace('${referrer}', randomPick(firstNames)),
      last_contact_at: randomPastDate(30),
      created_at: randomPastDate(180),
      updated_at: randomPastDate(7),
      deleted_at: null,
      // For linking
      _tagIds: data.tags.filter(() => Math.random() > 0.7).slice(0, randomInt(1, 3)).map(t => t.id)
    }
    
    data.contacts.push(contact)
  }

  // Generate Interactions (200 interactions)
  console.log('Generating 200 interactions...')
  const interactionTypes = ['note', 'call', 'meeting', 'email']
  
  for (let i = 0; i < 200; i++) {
    const type = randomPick(interactionTypes)
    const contact = randomPick(data.contacts)
    
    let body = ''
    switch (type) {
      case 'note':
        body = randomPick(noteTemplates).replace('${referrer}', randomPick(firstNames))
        break
      case 'meeting':
        body = randomPick(meetingNotes)
        break
      case 'call':
        body = randomPick(callNotes)
        break
      case 'email':
        body = `Subject: ${randomPick(['Follow-up', 'Meeting Request', 'Proposal', 'Question', 'Update'])}\n\n${randomPick(noteTemplates)}`
        break
    }
    
    data.interactions.push({
      id: `interaction_${uuidv4().slice(0, 8)}`,
      contact_id: contact.id,
      type,
      body,
      occurred_at: randomPastDate(90),
      created_at: randomPastDate(90),
      deleted_at: null
    })
  }

  // Generate Follow-ups (40 follow-ups)
  console.log('Generating 40 follow-ups...')
  const followupStatuses = ['open', 'open', 'open', 'done', 'done', 'snoozed']
  
  for (let i = 0; i < 40; i++) {
    const contact = randomPick(data.contacts)
    const status = randomPick(followupStatuses)
    
    let dueAt: string
    if (status === 'done') {
      dueAt = randomPastDate(30)
    } else if (Math.random() > 0.7) {
      // Overdue
      dueAt = randomPastDate(14)
    } else {
      // Future
      dueAt = randomFutureDate(14)
    }
    
    data.followups.push({
      id: `followup_${uuidv4().slice(0, 8)}`,
      contact_id: contact.id,
      due_at: dueAt,
      reason: randomPick(followUpReasons),
      status,
      created_at: randomPastDate(60),
      done_at: status === 'done' ? randomPastDate(7) : null,
      deleted_at: null
    })
  }

  // Pipeline is created by migration, but we can add another one
  console.log('Generating additional pipeline...')
  data.pipelines.push({
    id: `pipeline_${uuidv4().slice(0, 8)}`,
    name: 'Partner Pipeline',
    stages: JSON.stringify([
      { id: 'initial_contact', name: 'Initial Contact', color: '#6366f1', order: 0 },
      { id: 'evaluation', name: 'Evaluation', color: '#8b5cf6', order: 1 },
      { id: 'agreement', name: 'Agreement', color: '#f59e0b', order: 2 },
      { id: 'integration', name: 'Integration', color: '#10b981', order: 3 },
      { id: 'active', name: 'Active Partner', color: '#3b82f6', order: 4 }
    ]),
    is_default: 0,
    created_at: randomPastDate(60)
  })

  // Generate Deals (25 deals)
  console.log('Generating 25 deals...')
  const salesStages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  const currencies = ['USD', 'EUR', 'TRY', 'GBP']
  
  for (let i = 0; i < 25; i++) {
    const contact = randomPick(data.contacts)
    const stage = randomPick(salesStages)
    const isClosed = stage.startsWith('closed')
    const isWon = stage === 'closed_won'
    
    const probabilities: Record<string, number> = {
      'lead': 10,
      'qualified': 25,
      'proposal': 50,
      'negotiation': 75,
      'closed_won': 100,
      'closed_lost': 0
    }
    
    data.deals.push({
      id: `deal_${uuidv4().slice(0, 8)}`,
      pipeline_id: 'pipeline_default',
      contact_id: contact.id,
      name: randomPick(dealNames) + ` - ${contact.company}`,
      value: randomInt(5, 500) * 1000,
      currency: randomPick(currencies),
      stage,
      probability: probabilities[stage] || 50,
      expected_close: randomFutureDate(90),
      notes: randomPick(noteTemplates),
      created_at: randomPastDate(120),
      updated_at: randomPastDate(7),
      closed_at: isClosed ? randomPastDate(30) : null,
      won: isClosed ? (isWon ? 1 : 0) : null,
      deleted_at: null
    })
  }

  // Generate Tasks (35 tasks)
  console.log('Generating 35 tasks...')
  const priorities = ['low', 'medium', 'medium', 'high', 'urgent']
  const taskStatuses = ['open', 'open', 'open', 'done', 'cancelled']
  
  for (let i = 0; i < 35; i++) {
    const contact = Math.random() > 0.3 ? randomPick(data.contacts) : null
    const deal = Math.random() > 0.5 ? randomPick(data.deals) : null
    const status = randomPick(taskStatuses)
    const priority = randomPick(priorities)
    
    let dueAt: string | null
    if (status === 'done' || status === 'cancelled') {
      dueAt = randomPastDate(14)
    } else if (Math.random() > 0.8) {
      // Overdue
      dueAt = randomPastDate(7)
    } else {
      dueAt = randomFutureDate(14)
    }
    
    const company = contact?.company || randomPick(companies)
    
    data.tasks.push({
      id: `task_${uuidv4().slice(0, 8)}`,
      contact_id: contact?.id || null,
      deal_id: deal?.id || null,
      title: randomPick(taskTitles).replace('${company}', company),
      description: Math.random() > 0.5 ? randomPick(noteTemplates) : null,
      due_at: dueAt,
      priority,
      status,
      created_at: randomPastDate(30),
      completed_at: status === 'done' ? randomPastDate(3) : null,
      deleted_at: null
    })
  }

  // Generate Automation Rules (5 rules)
  console.log('Generating 5 automation rules...')
  data.automations = [
    {
      id: `rule_${uuidv4().slice(0, 8)}`,
      name: 'Tag VIP → Create Welcome Task',
      trigger_type: 'tag_added',
      trigger_config: JSON.stringify({ tag_name: 'VIP' }),
      action_type: 'create_task',
      action_config: JSON.stringify({ title: 'Send welcome package to VIP contact', priority: 'high', due_days: 1 }),
      enabled: 1,
      run_count: randomInt(5, 25),
      last_run_at: randomPastDate(7),
      created_at: randomPastDate(60)
    },
    {
      id: `rule_${uuidv4().slice(0, 8)}`,
      name: 'New Contact → Add Prospect Tag',
      trigger_type: 'contact_created',
      trigger_config: JSON.stringify({}),
      action_type: 'add_tag',
      action_config: JSON.stringify({ tag_name: 'Prospect' }),
      enabled: 1,
      run_count: randomInt(20, 50),
      last_run_at: randomPastDate(2),
      created_at: randomPastDate(90)
    },
    {
      id: `rule_${uuidv4().slice(0, 8)}`,
      name: 'Deal Won → Notify Team',
      trigger_type: 'deal_stage_changed',
      trigger_config: JSON.stringify({ to_stage: 'closed_won' }),
      action_type: 'send_notification',
      action_config: JSON.stringify({ title: 'Deal Won!', message: 'A new deal has been closed successfully.' }),
      enabled: 1,
      run_count: randomInt(3, 12),
      last_run_at: randomPastDate(14),
      created_at: randomPastDate(45)
    },
    {
      id: `rule_${uuidv4().slice(0, 8)}`,
      name: 'Hot Lead → Move to Qualified',
      trigger_type: 'tag_added',
      trigger_config: JSON.stringify({ tag_name: 'Hot Lead' }),
      action_type: 'move_deal_stage',
      action_config: JSON.stringify({ stage: 'qualified' }),
      enabled: 0, // Disabled example
      run_count: randomInt(0, 5),
      last_run_at: randomPastDate(30),
      created_at: randomPastDate(30)
    },
    {
      id: `rule_${uuidv4().slice(0, 8)}`,
      name: 'Follow-up Done → Update Last Contact',
      trigger_type: 'followup_done',
      trigger_config: JSON.stringify({}),
      action_type: 'update_field',
      action_config: JSON.stringify({ field: 'last_contact_at', value: 'now' }),
      enabled: 1,
      run_count: randomInt(30, 80),
      last_run_at: randomPastDate(1),
      created_at: randomPastDate(120)
    }
  ]

  // Generate Email Templates (5 templates)
  console.log('Generating 5 email templates...')
  data.templates = [
    {
      id: `template_${uuidv4().slice(0, 8)}`,
      name: 'Initial Outreach',
      subject: 'Introduction to VaultCRM - {{company}}',
      body: `Hi {{name}},\n\nI hope this email finds you well. I wanted to reach out to introduce VaultCRM, a local-first personal CRM that helps professionals manage their relationships effectively.\n\nI noticed that {{company}} is growing rapidly, and I thought our solution might be a great fit for your team.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards`,
      variables: JSON.stringify(['name', 'company']),
      usage_count: randomInt(10, 50),
      created_at: randomPastDate(90),
      updated_at: randomPastDate(7)
    },
    {
      id: `template_${uuidv4().slice(0, 8)}`,
      name: 'Follow-up After Demo',
      subject: 'Great chatting with you, {{name}}!',
      body: `Hi {{name}},\n\nThank you for taking the time to see our demo today. I really enjoyed learning about {{company}}'s goals and discussing how VaultCRM can help.\n\nAs promised, I'm attaching the proposal we discussed. Please let me know if you have any questions.\n\nLooking forward to the next steps!\n\nBest regards`,
      variables: JSON.stringify(['name', 'company']),
      usage_count: randomInt(5, 30),
      created_at: randomPastDate(60),
      updated_at: randomPastDate(14)
    },
    {
      id: `template_${uuidv4().slice(0, 8)}`,
      name: 'Contract Reminder',
      subject: 'Reminder: Contract Review - {{company}}',
      body: `Hi {{name}},\n\nI wanted to follow up on the contract I sent over last week. Have you had a chance to review it with your team?\n\nPlease let me know if you have any questions or if there are any changes needed. We're here to help make this process as smooth as possible.\n\nBest regards`,
      variables: JSON.stringify(['name', 'company']),
      usage_count: randomInt(3, 20),
      created_at: randomPastDate(45),
      updated_at: randomPastDate(21)
    },
    {
      id: `template_${uuidv4().slice(0, 8)}`,
      name: 'Renewal Notice',
      subject: 'Your VaultCRM subscription renewal - {{company}}',
      body: `Hi {{name}},\n\nI hope you've been enjoying VaultCRM! I wanted to reach out as your subscription is coming up for renewal on {{renewal_date}}.\n\nWe've loved having {{company}} as a customer and would love to continue our partnership. I'd be happy to discuss any questions or explore additional features that might benefit your team.\n\nBest regards`,
      variables: JSON.stringify(['name', 'company', 'renewal_date']),
      usage_count: randomInt(2, 15),
      created_at: randomPastDate(30),
      updated_at: randomPastDate(5)
    },
    {
      id: `template_${uuidv4().slice(0, 8)}`,
      name: 'Welcome Email',
      subject: 'Welcome to VaultCRM, {{name}}!',
      body: `Hi {{name}},\n\nWelcome to VaultCRM! We're thrilled to have {{company}} join our community.\n\nHere are some resources to help you get started:\n- Getting Started Guide: [link]\n- Video Tutorials: [link]\n- Support Portal: [link]\n\nIf you need any help, don't hesitate to reach out. We're here to ensure your success!\n\nBest regards`,
      variables: JSON.stringify(['name', 'company']),
      usage_count: randomInt(15, 40),
      created_at: randomPastDate(120),
      updated_at: randomPastDate(30)
    }
  ]

  // Generate Sequences (3 sequences)
  console.log('Generating 3 sequences...')
  data.sequences = [
    {
      id: `sequence_${uuidv4().slice(0, 8)}`,
      name: 'New Lead Nurture',
      steps: JSON.stringify([
        { order: 0, type: 'email', template_id: data.templates[0].id, delay_days: 0 },
        { order: 1, type: 'task', title: 'Research lead background', delay_days: 1 },
        { order: 2, type: 'email', template_id: data.templates[1].id, delay_days: 3 },
        { order: 3, type: 'task', title: 'Follow up call', delay_days: 5 }
      ]),
      active: 1,
      created_at: randomPastDate(60),
      updated_at: randomPastDate(7)
    },
    {
      id: `sequence_${uuidv4().slice(0, 8)}`,
      name: 'Post-Demo Follow-up',
      steps: JSON.stringify([
        { order: 0, type: 'email', template_id: data.templates[1].id, delay_days: 0 },
        { order: 1, type: 'task', title: 'Send proposal', delay_days: 1 },
        { order: 2, type: 'email', template_id: data.templates[2].id, delay_days: 4 },
        { order: 3, type: 'task', title: 'Schedule follow-up call', delay_days: 7 }
      ]),
      active: 1,
      created_at: randomPastDate(45),
      updated_at: randomPastDate(14)
    },
    {
      id: `sequence_${uuidv4().slice(0, 8)}`,
      name: 'Customer Onboarding',
      steps: JSON.stringify([
        { order: 0, type: 'email', template_id: data.templates[4].id, delay_days: 0 },
        { order: 1, type: 'task', title: 'Schedule kickoff call', delay_days: 1 },
        { order: 2, type: 'task', title: 'Send training materials', delay_days: 3 },
        { order: 3, type: 'task', title: 'Check-in call', delay_days: 7 },
        { order: 4, type: 'task', title: '30-day review', delay_days: 30 }
      ]),
      active: 1,
      created_at: randomPastDate(90),
      updated_at: randomPastDate(21)
    }
  ]

  return data
}

// Generate SQL insert statements
function generateSQL(data: GeneratedData): string {
  let sql = '-- VaultCRM Mock Data\n-- Generated: ' + new Date().toISOString() + '\n\n'

  // Tags
  sql += '-- Tags\n'
  for (const tag of data.tags) {
    sql += `INSERT OR REPLACE INTO tags (id, name, color, created_at) VALUES ('${tag.id}', '${tag.name.replace(/'/g, "''")}', '${tag.color}', '${tag.created_at}');\n`
  }
  sql += '\n'

  // Contacts
  sql += '-- Contacts\n'
  for (const contact of data.contacts) {
    sql += `INSERT OR REPLACE INTO contacts (id, name, company, title, emails, phones, location, source, notes, last_contact_at, created_at, updated_at, deleted_at) VALUES ('${contact.id}', '${contact.name.replace(/'/g, "''")}', '${(contact.company || '').replace(/'/g, "''")}', '${(contact.title || '').replace(/'/g, "''")}', '${contact.emails}', '${contact.phones}', '${(contact.location || '').replace(/'/g, "''")}', '${(contact.source || '').replace(/'/g, "''")}', '${(contact.notes || '').replace(/'/g, "''")}', '${contact.last_contact_at}', '${contact.created_at}', '${contact.updated_at}', NULL);\n`
  }
  sql += '\n'

  // Contact Tags
  sql += '-- Contact Tags\n'
  for (const contact of data.contacts) {
    for (const tagId of contact._tagIds || []) {
      sql += `INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES ('${contact.id}', '${tagId}');\n`
    }
  }
  sql += '\n'

  // Interactions
  sql += '-- Interactions\n'
  for (const interaction of data.interactions) {
    sql += `INSERT OR REPLACE INTO interactions (id, contact_id, type, body, occurred_at, created_at, deleted_at) VALUES ('${interaction.id}', '${interaction.contact_id}', '${interaction.type}', '${interaction.body.replace(/'/g, "''")}', '${interaction.occurred_at}', '${interaction.created_at}', NULL);\n`
  }
  sql += '\n'

  // Follow-ups
  sql += '-- Follow-ups\n'
  for (const followup of data.followups) {
    sql += `INSERT OR REPLACE INTO followups (id, contact_id, due_at, reason, status, created_at, done_at, deleted_at) VALUES ('${followup.id}', '${followup.contact_id}', '${followup.due_at}', '${(followup.reason || '').replace(/'/g, "''")}', '${followup.status}', '${followup.created_at}', ${followup.done_at ? `'${followup.done_at}'` : 'NULL'}, NULL);\n`
  }
  sql += '\n'

  // Pipelines
  sql += '-- Additional Pipelines\n'
  for (const pipeline of data.pipelines) {
    sql += `INSERT OR REPLACE INTO pipelines (id, name, stages, is_default, created_at) VALUES ('${pipeline.id}', '${pipeline.name.replace(/'/g, "''")}', '${pipeline.stages}', ${pipeline.is_default}, '${pipeline.created_at}');\n`
  }
  sql += '\n'

  // Deals
  sql += '-- Deals\n'
  for (const deal of data.deals) {
    sql += `INSERT OR REPLACE INTO deals (id, pipeline_id, contact_id, name, value, currency, stage, probability, expected_close, notes, created_at, updated_at, closed_at, won, deleted_at) VALUES ('${deal.id}', '${deal.pipeline_id}', '${deal.contact_id}', '${deal.name.replace(/'/g, "''")}', ${deal.value}, '${deal.currency}', '${deal.stage}', ${deal.probability}, '${deal.expected_close}', '${(deal.notes || '').replace(/'/g, "''")}', '${deal.created_at}', '${deal.updated_at}', ${deal.closed_at ? `'${deal.closed_at}'` : 'NULL'}, ${deal.won !== null ? deal.won : 'NULL'}, NULL);\n`
  }
  sql += '\n'

  // Tasks
  sql += '-- Tasks\n'
  for (const task of data.tasks) {
    sql += `INSERT OR REPLACE INTO tasks (id, contact_id, deal_id, title, description, due_at, priority, status, created_at, completed_at, deleted_at) VALUES ('${task.id}', ${task.contact_id ? `'${task.contact_id}'` : 'NULL'}, ${task.deal_id ? `'${task.deal_id}'` : 'NULL'}, '${task.title.replace(/'/g, "''")}', ${task.description ? `'${task.description.replace(/'/g, "''")}'` : 'NULL'}, ${task.due_at ? `'${task.due_at}'` : 'NULL'}, '${task.priority}', '${task.status}', '${task.created_at}', ${task.completed_at ? `'${task.completed_at}'` : 'NULL'}, NULL);\n`
  }
  sql += '\n'

  // Automations
  sql += '-- Automation Rules\n'
  for (const rule of data.automations) {
    sql += `INSERT OR REPLACE INTO automation_rules (id, name, trigger_type, trigger_config, action_type, action_config, enabled, run_count, last_run_at, created_at) VALUES ('${rule.id}', '${rule.name.replace(/'/g, "''")}', '${rule.trigger_type}', '${rule.trigger_config}', '${rule.action_type}', '${rule.action_config}', ${rule.enabled}, ${rule.run_count}, '${rule.last_run_at}', '${rule.created_at}');\n`
  }
  sql += '\n'

  // Templates
  sql += '-- Email Templates\n'
  for (const template of data.templates) {
    sql += `INSERT OR REPLACE INTO email_templates (id, name, subject, body, variables, usage_count, created_at, updated_at) VALUES ('${template.id}', '${template.name.replace(/'/g, "''")}', '${template.subject.replace(/'/g, "''")}', '${template.body.replace(/'/g, "''")}', '${template.variables}', ${template.usage_count}, '${template.created_at}', '${template.updated_at}');\n`
  }
  sql += '\n'

  // Sequences
  sql += '-- Sequences\n'
  for (const sequence of data.sequences) {
    sql += `INSERT OR REPLACE INTO sequences (id, name, steps, active, created_at, updated_at) VALUES ('${sequence.id}', '${sequence.name.replace(/'/g, "''")}', '${sequence.steps}', ${sequence.active}, '${sequence.created_at}', '${sequence.updated_at}');\n`
  }
  sql += '\n'

  return sql
}

// Main execution
console.log('=== VaultCRM Mock Data Generator ===\n')

const mockData = generateMockData()
const sql = generateSQL(mockData)

console.log('\n=== Summary ===')
console.log(`Tags: ${mockData.tags.length}`)
console.log(`Contacts: ${mockData.contacts.length}`)
console.log(`Interactions: ${mockData.interactions.length}`)
console.log(`Follow-ups: ${mockData.followups.length}`)
console.log(`Pipelines: ${mockData.pipelines.length} (+ default)`)
console.log(`Deals: ${mockData.deals.length}`)
console.log(`Tasks: ${mockData.tasks.length}`)
console.log(`Automations: ${mockData.automations.length}`)
console.log(`Email Templates: ${mockData.templates.length}`)
console.log(`Sequences: ${mockData.sequences.length}`)

// Output SQL
console.log('\n=== SQL Output ===\n')
console.log(sql)

// Also write to file
import { writeFileSync } from 'fs'
import { join } from 'path'

const outputPath = join(__dirname, 'mock-data.sql')
writeFileSync(outputPath, sql, 'utf-8')
console.log(`\nSQL file written to: ${outputPath}`)

export { generateMockData, generateSQL }
