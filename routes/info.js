"use strict";

const mysql = require('mysql2/promise');
const secret = require('../secret').keys;

module.exports.handle = async (event) => {
  if(event.queryStringParameters === undefined
    || event.queryStringParameters.id === undefined
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
  if(event.queryStringParameters.type !== 'bans'
    && event.queryStringParameters.type !== 'mutes'
    && event.queryStringParameters.type !== 'warnings'
    && event.queryStringParameters.type !== 'kicks'
    ) return {
      statusCode: 400,
      body: JSON.stringify(
        {
          success: false,
          message: "Invalid punishment type",          
        },
        null,
        2
      ),
  };
  const type = event.queryStringParameters.type;

  const id = Number(event.queryStringParameters.id);
  if(isNaN(id) || id < 0 || id > 999999)
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          success: false,
          message: "Invalid ban id",          
        },
        null,
        2
      ),
  };

  const con = await mysql.createConnection({
    host: secret.sql.host,
    user: secret.sql.user,
    password: secret.sql.pass,
    database: secret.sql.db
  });  

  const query = `
  SELECT t1.id AS id, t2.name AS name, t1.uuid AS uuid, t3.name AS banned_by,
    t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time,
    t1.server_origin AS server_origin
    ${type !== 'kicks' ? ', t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid, t1.removed_by_reason AS removed_by_reason' : ' '}

  FROM ${secret.tables[type]} t1 
  
  JOIN (SELECT name, uuid FROM ${secret.tables.history} WHERE date IN (SELECT max(date) FROM ${secret.tables.history} GROUP BY uuid))
    AS t2 ON (t1.uuid = t2.uuid)
    
  JOIN (SELECT name, uuid FROM ${secret.tables.history} WHERE date IN (SELECT max(date) FROM ${secret.tables.history} GROUP BY uuid))
    AS t3 ON (t1.banned_by_uuid = t3.uuid)
    
  WHERE t1.id = ? AND t1.silent = 0
  LIMIT 1;
  `;
  const result = await con.query(query, [id]);
  con.end();

  if(!result[0] || result[0].length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify(
        {
          success: false,
          message: "Punishment not found",          
        },
        null,
        2
      ),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      {
        result: result[0][0],
        success: true,
        // input: event,
      },
      null,
      2
    ),
  };
};
