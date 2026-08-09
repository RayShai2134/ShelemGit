/* Run once (locally or as a one-off) to create/update tables: node src/db/migrate.js */
var fs = require('fs');
var path = require('path');
var pool = require('./pool.js');

var sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

pool.query(sql).then(function(){
  console.log('Migration applied successfully.');
  return pool.end();
}).catch(function(e){
  console.error('Migration failed:', e.message);
  process.exit(1);
});
