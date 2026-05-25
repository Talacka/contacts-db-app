const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API: Get all people aggregated with their linked contacts
app.get('/api/people', async (req, res) => {
  try {
    const queryText = `
      SELECT 
        p.id AS person_id, 
        p.first_name, 
        p.last_name, 
        p.company, 
        p.avatar_color,
        c.id AS contact_id,
        c.type AS contact_type,
        c.label AS contact_label,
        c.value AS contact_value
      FROM people p
      LEFT JOIN contacts c ON p.id = c.person_id
      ORDER BY p.first_name, p.last_name, c.id;
    `;
    const { rows } = await db.query(queryText);
    
    // Group contacts by person
    const peopleMap = {};
    rows.forEach(row => {
      const pId = row.person_id;
      if (!peopleMap[pId]) {
        peopleMap[pId] = {
          id: pId,
          firstName: row.first_name,
          lastName: row.last_name,
          company: row.company,
          avatarColor: row.avatar_color,
          contacts: []
        };
      }
      if (row.contact_id) {
        peopleMap[pId].contacts.push({
          id: row.contact_id,
          type: row.contact_type,
          label: row.contact_label,
          value: row.contact_value
        });
      }
    });

    res.json(Object.values(peopleMap));
  } catch (err) {
    console.error('Error fetching people:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Add a new person
app.post('/api/people', async (req, res) => {
  const { firstName, lastName, company, avatarColor } = req.body;
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and Last name are required.' });
  }
  
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1', '#14b8a6', '#84cc16'];
  const finalColor = avatarColor || colors[Math.floor(Math.random() * colors.length)];

  try {
    const queryText = `
      INSERT INTO people (first_name, last_name, company, avatar_color)
      VALUES ($1, $2, $3, $4)
      RETURNING id, first_name AS "firstName", last_name AS "lastName", company, avatar_color AS "avatarColor";
    `;
    const { rows } = await db.query(queryText, [firstName, lastName, company || '', finalColor]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding person:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Add a contact detail linked to a person
app.post('/api/people/:id/contacts', async (req, res) => {
  const personId = parseInt(req.params.id, 10);
  const { type, label, value } = req.body;

  if (!type || !label || !value) {
    return res.status(400).json({ error: 'Type, Label, and Value are required.' });
  }

  try {
    const queryText = `
      INSERT INTO contacts (person_id, type, label, value)
      VALUES ($1, $2, $3, $4)
      RETURNING id, person_id AS "personId", type, label, value;
    `;
    const { rows } = await db.query(queryText, [personId, type, label, value]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding contact detail:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Delete a person (will cascade and delete their contacts)
app.delete('/api/people/:id', async (req, res) => {
  const personId = parseInt(req.params.id, 10);
  try {
    await db.query('DELETE FROM people WHERE id = $1', [personId]);
    res.json({ message: 'Person and linked contacts deleted successfully.' });
  } catch (err) {
    console.error('Error deleting person:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Delete a specific contact detail
app.delete('/api/contacts/:id', async (req, res) => {
  const contactId = parseInt(req.params.id, 10);
  try {
    await db.query('DELETE FROM contacts WHERE id = $1', [contactId]);
    res.json({ message: 'Contact detail deleted successfully.' });
  } catch (err) {
    console.error('Error deleting contact detail:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// API: Raw table data inspector (for visualizing actual DB tables)
app.get('/api/inspect/people', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM people ORDER BY id;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inspect/contacts', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM contacts ORDER BY id;');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Reseed database
app.post('/api/db/reseed', (req, res) => {
  console.log('API Request: Reseeding database...');
  exec('node seed.js', (error, stdout, stderr) => {
    if (error) {
      console.error('Reseed script failed:', error.message);
      return res.status(500).json({ error: error.message, stderr });
    }
    res.json({ message: 'Database reseeded successfully!', log: stdout });
  });
});

app.listen(PORT, () => {
  console.log(`Express Server running on port ${PORT}`);
  console.log(`Frontend dashboard available at http://localhost:${PORT}`);
});
