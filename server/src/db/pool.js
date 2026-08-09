var { Pool } = require('pg');

if(!process.env.DATABASE_URL){
  console.warn('[db] DATABASE_URL not set — accounts/friends features will fail until it is configured.');
}

// The Neon connection string already carries sslmode=require, which
// pg-connection-string parses on its own — no separate ssl option needed.
var pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
