const { pool } = require('./db');

async function seed() {
  const RETRIES = 15;
  const DELAY = 2000; // 2 seconds
  let client;

  console.log('Starting database seeding...');

  for (let i = 0; i < RETRIES; i++) {
    try {
      console.log(`Connecting to database (attempt ${i + 1}/${RETRIES})...`);
      client = await pool.connect();
      break; // connection successful
    } catch (err) {
      console.warn(`Connection failed: ${err.message}`);
      if (i < RETRIES - 1) {
        console.log(`Waiting ${DELAY / 1000} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, DELAY));
      } else {
        console.error('Could not connect to database after maximum retries. Exiting.');
        process.exit(1);
      }
    }
  }

  try {
    console.log('Connected successfully to PostgreSQL database.');
    
    // Create schema
    console.log('Creating tables...');
    await client.query(`
      DROP TABLE IF EXISTS contacts;
      DROP TABLE IF EXISTS people;
      
      CREATE TABLE people (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        company VARCHAR(150),
        avatar_color VARCHAR(50) DEFAULT '#6366f1'
      );
      
      CREATE TABLE contacts (
        id SERIAL PRIMARY KEY,
        person_id INT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        label VARCHAR(50) NOT NULL,
        value VARCHAR(255) NOT NULL
      );
    `);
    console.log('Schema created successfully.');

    // Seed People
    const peopleData = [
      { first_name: 'Sarah', last_name: 'Jenkins', company: 'TechNova Solutions', avatar_color: '#3b82f6' },
      { first_name: 'Marcus', last_name: 'Chen', company: 'Quantum Labs', avatar_color: '#8b5cf6' },
      { first_name: 'Elena', last_name: 'Rostova', company: 'Apex Design Studio', avatar_color: '#ec4899' },
      { first_name: 'David', last_name: 'Kim', company: 'Horizon Capital', avatar_color: '#10b981' },
      { first_name: 'Chloe', last_name: 'Dubois', company: 'Bloom Botanicals', avatar_color: '#f59e0b' },
      { first_name: 'Jamal', last_name: 'Washington', company: 'Vanguard Cyber Security', avatar_color: '#ef4444' },
      { first_name: 'Priya', last_name: 'Patel', company: 'BioSphere Medical', avatar_color: '#06b6d4' },
      { first_name: 'Alex', last_name: 'Mercer', company: 'Freelance Software Developer', avatar_color: '#6366f1' },
      { first_name: 'Sofia', last_name: 'Bianchi', company: 'La Trattoria Group', avatar_color: '#14b8a6' },
      { first_name: 'Liam', last_name: 'O\'Connor', company: 'Emerald Ventures', avatar_color: '#84cc16' }
    ];

    console.log('Seeding people...');
    const personIds = [];
    for (const p of peopleData) {
      const res = await client.query(
        'INSERT INTO people (first_name, last_name, company, avatar_color) VALUES ($1, $2, $3, $4) RETURNING id',
        [p.first_name, p.last_name, p.company, p.avatar_color]
      );
      personIds.push(res.rows[0].id);
    }
    console.log(`Successfully seeded ${personIds.length} people.`);

    // Seed Contacts linked to people
    const contactsData = [
      // Sarah Jenkins (id = personIds[0])
      { person_idx: 0, type: 'Email', label: 'Work', value: 'sarah.j@technova.com' },
      { person_idx: 0, type: 'Phone', label: 'Mobile', value: '+1 (555) 019-2834' },
      { person_idx: 0, type: 'Social', label: 'LinkedIn', value: 'linkedin.com/in/sarah-jenkins' },
      
      // Marcus Chen (id = personIds[1])
      { person_idx: 1, type: 'Phone', label: 'Mobile', value: '+1 (555) 024-5891' },
      { person_idx: 1, type: 'Email', label: 'Personal', value: 'marcus.chen@gmail.com' },
      
      // Elena Rostova (id = personIds[2])
      { person_idx: 2, type: 'Email', label: 'Work', value: 'elena@apexdesign.co' },
      { person_idx: 2, type: 'Social', label: 'Twitter', value: 'twitter.com/elenarostova' },
      { person_idx: 2, type: 'Address', label: 'Home', value: '452 Pine St, San Francisco, CA' },
      
      // David Kim (id = personIds[3])
      { person_idx: 3, type: 'Phone', label: 'Work', value: '+1 (555) 038-1928' },
      { person_idx: 3, type: 'Email', label: 'Work', value: 'dkim@horizon.com' },
      
      // Chloe Dubois (id = personIds[4])
      { person_idx: 4, type: 'Phone', label: 'Mobile', value: '+33 6 5554 2981' },
      { person_idx: 4, type: 'Email', label: 'Personal', value: 'chloe.dubois@bloom.fr' },
      
      // Jamal Washington (id = personIds[5])
      { person_idx: 5, type: 'Email', label: 'Work', value: 'j.washington@vanguard.io' },
      { person_idx: 5, type: 'Phone', label: 'Mobile', value: '+1 (555) 047-9201' },
      
      // Priya Patel (id = personIds[6])
      { person_idx: 6, type: 'Email', label: 'Work', value: 'priya.p@biosphere.org' },
      { person_idx: 6, type: 'Phone', label: 'Work', value: '+1 (555) 091-8273' },
      { person_idx: 6, type: 'Address', label: 'Office', value: '100 Innovation Way, Boston, MA' },
      
      // Alex Mercer (id = personIds[7])
      { person_idx: 7, type: 'Email', label: 'Personal', value: 'alex.mercer@gmail.com' },
      { person_idx: 7, type: 'Social', label: 'GitHub', value: 'github.com/amercer' },
      
      // Sofia Bianchi (id = personIds[8])
      { person_idx: 8, type: 'Phone', label: 'Home', value: '+39 02 555 9382' },
      { person_idx: 8, type: 'Address', label: 'Home', value: 'Via Roma 12, Milano, Italy' },
      
      // Liam O'Connor (id = personIds[9])
      { person_idx: 9, type: 'Phone', label: 'Mobile', value: '+353 87 555 4920' },
      { person_idx: 9, type: 'Email', label: 'Personal', value: 'liam.oconnor@ventures.ie' }
    ];

    console.log('Seeding contact details...');
    for (const c of contactsData) {
      const realPersonId = personIds[c.person_idx];
      await client.query(
        'INSERT INTO contacts (person_id, type, label, value) VALUES ($1, $2, $3, $4)',
        [realPersonId, c.type, c.label, c.value]
      );
    }
    console.log(`Successfully seeded ${contactsData.length} contact entries.`);

    client.release();
    console.log('Database seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err.message);
    if (client) client.release();
    process.exit(1);
  }
}

seed();
