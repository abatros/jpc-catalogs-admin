const massive = require('massive');
const monitor = require('pg-monitor');

// var db; do-not declare => global-context
//var pfolder_id, afolder_id, root_folder_id;

const conn__ = {
  host: process.env.DB_HOST || 'ultimheat.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'openacs-cms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || process.env.PGPASSWORD,
  pg_monitor: true
};

exports.connect = async function (conn) {
  conn = Object.assign(conn__, conn)
  if (!conn.password) throw 'Missing password';

  db = await massive(conn);
  if (!db) throw 'Unable to connect.'
  if (conn.pg_monitor) {
    monitor.attach(db.driverConfig);
    console.log(`pg-monitor attached-Ok.`);
  }

  return {db};
}

//connect(); // immediately. so other modules using this will have correct value {db}
//exports.db = db;

exports.close_connection = async () =>{
  await db.pgp.end();
}

/*
module.exports = function(conn){
  return {
    db: connect(conn),
    close_connection
  }
}
*/
