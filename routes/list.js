"use strict";

const mysql = require('mysql2/promise');
const secret = require('../secret').keys;

module.exports.handle = async (event) => {
  if(event.queryStringParameters === undefined
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
  const type = event.queryStringParameters.type

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

  const query = `
  SELECT t1.id AS id, t2.name AS name, t1.uuid AS uuid, t3.name AS banned_by,
    t1.banned_by_uuid AS banned_by_uuid, t1.reason AS reason, t1.time AS time, t1.until as until
    ${type !== 'kicks' ? ', t1.removed_by_name AS removed_by_name, t1.removed_by_uuid AS removed_by_uuid' : ' '}

  FROM ${secret.tables[type]} t1 
  
  JOIN (SELECT name, uuid FROM ${secret.tables.history} WHERE date IN (SELECT max(date) FROM ${secret.tables.history} GROUP BY uuid))
    AS t2 ON (t1.uuid = t2.uuid)
    
  JOIN (SELECT name, uuid FROM ${secret.tables.history} WHERE date IN (SELECT max(date) FROM ${secret.tables.history} GROUP BY uuid))
    AS t3 ON (t1.banned_by_uuid = t3.uuid)
    
  WHERE t1.silent = 0
  GROUP BY t1.id
  ORDER BY t1.time DESC LIMIT ${page*perPage},${perPage};
  `;

  const query_pages = `SELECT COUNT(id) AS count FROM ${secret.tables[type]} WHERE silent = 0;`

  const con = await mysql.createConnection({
    host: secret.sql.host,
    user: secret.sql.user,
    password: secret.sql.pass,
    database: secret.sql.db
  }); 
  const result = await con.query(query);
  const result_pages = await con.query(query_pages);
  con.end();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      {
        result: result[0],
        pragnation: {
          page: page,
          pages: Math.floor(result_pages[0][0].count/perPage)
        },
        success: true,
        // input: event,
      },
      null,
      2
    ),
  };
};
