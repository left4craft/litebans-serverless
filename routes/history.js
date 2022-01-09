"use strict";

const mysql = require('mysql2/promise');
const secret = require('../secret').keys;

module.exports.handle = async (event) => {
  if(event.queryStringParameters === undefined
    || event.queryStringParameters.uuid === undefined
    || event.queryStringParameters.page === undefined
    || event.queryStringParameters.perPage === undefined
    || event.queryStringParameters.type === undefined
    || event.queryStringParameters.apiKey !== secret.api.key
    ) return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        {
          success: false,
          message: "Missing Parameters",          
        },
        null,
        2
      ),
  };

  const uuid = event.queryStringParameters.uuid;
  const type = event.queryStringParameters.type

  if(!/^[0-9a-zA-Z-]{36}$/.test(uuid)
    || (type !== 'by' && type !== 'for')
    ) return {
      statusCode: 400,
      body: JSON.stringify(
        {
          success: false,
          message: "Invalid name, UUID, or other options",          
        },
        null,
        2
      ),
  };

  let page = Number(event.queryStringParameters.page);
  let perPage = Number(event.queryStringParameters.perPage);

  if(isNaN(page) || isNaN(perPage))
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          success: false,
          message: "Invalid page numbers",          
        },
        null,
        2
      ),
  };

  // sanity checking inputs
  page = Math.min(9999, page);
  perPage = Math.min(100, perPage);
  page = Math.max(0, page);
  perPage = Math.max(0, perPage);

  // punishments for the input user
  const query_for = `
  (SELECT t1.id AS id, 'bans' AS type, ? AS name, t1.uuid AS uuid, t2.name AS banned_by,
    t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
    t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM ${secret.tables.bans} t1 
  
  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
    
  WHERE t1.silent = 0 AND t1.uuid = ?
  
  GROUP BY t1.id)

  UNION

  (SELECT t1.id AS id, 'mutes' AS type, ? AS name, t1.uuid AS uuid, t2.name AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM ${secret.tables.mutes} t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.uuid = ?
  
  GROUP BY t1.id)

  UNION

  (SELECT t1.id AS id, 'warnings' AS type, ? AS name, t1.uuid AS uuid, t2.name AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM ${secret.tables.warnings} t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.uuid = ?
  
  GROUP BY t1.id)

  UNION

  (SELECT t1.id AS id, 'kicks' AS type, ? AS name, t1.uuid AS uuid, t2.name AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  NULL AS removed_by_name, NULL AS removed_by_uuid

  FROM ${secret.tables.kicks} t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.uuid = ?
  
  GROUP BY t1.id)

  ORDER BY time DESC LIMIT ${page*perPage},${perPage};
  `;

  // punishments by the input user
  const query_by = `
  (SELECT t1.id AS id, 'bans' AS type, t2.name AS name, t1.uuid AS uuid, ? AS banned_by,
    t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
    t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM ${secret.tables.bans} t1 
  
  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.uuid = t2.uuid)
    
  WHERE t1.silent = 0 AND t1.banned_by_uuid = ?
  
  GROUP BY t1.id)

  UNION

  (SELECT t1.id AS id, 'mutes' AS type, t2.name AS name, t1.uuid AS uuid, ? AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM ${secret.tables.mutes} t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.banned_by_uuid = ?
  
  GROUP BY t1.id)

  UNION

  (SELECT t1.id AS id, 'warnings' AS type, t2.name AS name, t1.uuid AS uuid, ? AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM ${secret.tables.warnings} t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.banned_by_uuid = ?
  
  GROUP BY t1.id)

  UNION

  (SELECT t1.id AS id, 'kicks' AS type, t2.name AS name, t1.uuid AS uuid, ? AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  NULL AS removed_by_name, NULL AS removed_by_uuid

  FROM ${secret.tables.kicks} t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.banned_by_uuid = ?
  
  GROUP BY t1.id)

  ORDER BY time DESC LIMIT ${page*perPage},${perPage};
  `;

  const query = type === 'by' ? query_by : query_for;

  const query_name = `SELECT name FROM ${secret.tables.history} WHERE uuid = ?
    ORDER BY date DESC LIMIT 1;`

  const query_count = `SELECT COUNT(id) AS count FROM ?? WHERE silent=0 AND uuid = ?;`

  const con = await mysql.createConnection({
    host: secret.sql.host,
    user: secret.sql.user,
    password: secret.sql.pass,
    database: secret.sql.db
  });
  const result_name = await con.query(query_name, [uuid]);
  const name = result_name[0][0].name;

  // get total rows for pragnation
  let count = 0;
  for(const table of ['bans', 'mutes', 'warnings', 'kicks']) {
    const result_count = await con.query(query_count, [secret.tables[table], uuid]);
    count += Number(result_count[0][0].count);
  }

  const result = await con.query(query, [name, uuid, name, uuid, name, uuid, name, uuid]);
  con.end();
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      {
        result: result[0],
        minecraft: {
          username: name,
          uuid: uuid
        },
        pragnation: {
          page: page,
          pages: Math.floor(count/perPage)
        },
        success: true,
        // input: event,
      },
      null,
      2
    ),
  };
};
