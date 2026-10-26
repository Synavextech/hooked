const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function splitSql(sql) {
  const noComments = sql.replace(/--.*$/gm, '');
  const statements = [];
  let current = '';
  let inTrigger = false;
  
  const lines = noComments.split('\n');
  for (let line of lines) {
    current += line + '\n';
    if (line.includes('$$')) {
      inTrigger = !inTrigger;
    }
    if (line.trim().endsWith(';') && !inTrigger) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) {
    statements.push(current.trim());
  }
  return statements.filter(s => s.length > 0);
}

async function runSchema() {
  const sqlPath = path.join(__dirname, 'Database_schema.sql');
  console.log(`Reading schema from ${sqlPath}...`);
  
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = splitSql(sql);
    
    console.log(`Split into ${statements.length} SQL statements. Executing...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`\n[Stmt ${i+1}/${statements.length}] Running: ${stmt.substring(0, 100)}...`);
      await pool.query(stmt);
    }
    console.log('\nDatabase schema executed successfully.');
  } catch (err) {
    console.error('\nError running database schema:', err.message);
    console.error('Error detail:', err);
  } finally {
    await pool.end();
  }
}

runSchema();
