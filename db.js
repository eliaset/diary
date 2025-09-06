require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Create database if it doesn't exist
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true
  });

  try {
    console.log('Creating database if not exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    await connection.query(`USE \`${process.env.DB_NAME}\`;`);
    
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_create_diary_entries.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migrations...');
    await connection.query(sql);
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run the setup
setupDatabase().catch(console.error);
