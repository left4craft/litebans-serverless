"use strict";

const mysql = require('mysql2/promise');
const secret = require('../secret').keys;

module.exports.handle = async (event) => {
  // if(event.headers.authorization !== secret.api.key) return {
  //   statusCode: 403,
  //   body: JSON.stringify(
  //     {
  //       success: false,
  //       message: "Access Denied",
  //     },
  //     null,
  //     2
  //   ),
  // };
  if(event.queryStringParameters === undefined
    || event.queryStringParameters.name === undefined
    || event.queryStringParameters.uuid === undefined
    || event.queryStringParameters.page === undefined
    || event.queryStringParameters.perPage === undefined
    || event.queryStringParameters.type === undefined
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

  const name = event.queryStringParameters.name;
  const uuid = event.queryStringParameters.uuid;
  const type = event.queryStringParameters.type

  if(!/^[0-9a-zA-Z-]{36}/.test(uuid)
    || !/^[0-9a-zA-Z_]{1,16}$/.test(name)
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

  const con = await mysql.createConnection({
    host: secret.sql.host,
    user: secret.sql.user,
    password: secret.sql.pass,
    database: secret.sql.db
  });  

  // punishments for the input user
  const query_for = `
  (SELECT t1.id AS id, 'ban' AS type, 'Captain_Sisko' AS name, t1.uuid AS uuid, t2.name AS banned_by,
    t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
    t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM litebans_bans t1 
  
  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
    
  WHERE t1.silent = 0 AND t1.uuid = '804c7ee5-db51-4e58-a011-475f00df6828')

  UNION

  (SELECT t1.id AS id, 'mute' AS type, 'Captain_Sisko' AS name, t1.uuid AS uuid, t2.name AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM litebans_mutes t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.uuid = '804c7ee5-db51-4e58-a011-475f00df6828')

  UNION

  (SELECT t1.id AS id, 'warning' AS type, 'Captain_Sisko' AS name, t1.uuid AS uuid, t2.name AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid

  FROM litebans_warnings t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.uuid = '804c7ee5-db51-4e58-a011-475f00df6828')

  UNION

  (SELECT t1.id AS id, 'kick' AS type, 'Captain_Sisko' AS name, t1.uuid AS uuid, t2.name AS banned_by,
  t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
  NULL AS removed_by_name, NULL AS removed_by_uuid

  FROM litebans_kicks t1 

  JOIN (SELECT name, uuid FROM litebans_history WHERE date IN (SELECT max(date) FROM litebans_history GROUP BY uuid))
    AS t2 ON (t1.banned_by_uuid = t2.uuid)
  
  WHERE t1.silent = 0 AND t1.uuid = '804c7ee5-db51-4e58-a011-475f00df6828')

  ORDER BY time DESC LIMIT 0,10;
  `;

  // punishments by the input user

  const con = await mysql.createConnection({
    host: secret.sql.host,
    user: secret.sql.user,
    password: secret.sql.pass,
    database: secret.sql.db
  });  
  const result = await con.query(query);
  con.end();
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      {
        result: result[0],
        success: true,
        input: event,
      },
      null,
      2
    ),
  };
};
