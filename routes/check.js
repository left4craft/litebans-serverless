"use strict";

const mysql = require('mysql2/promise');
const secret = require('../secret').keys;

module.exports.handle = async (event) => {
  if(event.queryStringParameters === undefined
    || event.queryStringParameters.name === undefined
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

  // might be a username or UUID
  let name = event.queryStringParameters.name;
  let column = 'name';

  // if matching uuid regex, check uuid instead of name
  if(/^[0-9a-zA-Z-]{32,36}/.test(name)) {
    column = 'uuid';
    name = dashify(name);
  // if neiher name nor uuid regex match, input is invalid
  } else if (!/^[0-9a-zA-Z_]{1,16}$/.test(name)) {
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          success: false,
          message: "Invalid name or UUID",          
        },
        null,
        2
      ),
    };
  }

  // safe from injection attack because secret is dev-defined
  const query = `SELECT name,uuid FROM ${secret.tables.history} WHERE ?? = ?
                  ORDER BY date DESC LIMIT 1;`

  const con = await mysql.createConnection({
    host: secret.sql.host,
    user: secret.sql.user,
    password: secret.sql.pass,
    database: secret.sql.db
  });  
  const result = await con.query(query, [column, name]);
  con.end();

  if(result[0] && result[0][0] && result[0][0].name && result[0][0].uuid) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        {
          result: result[0][0],
          success: true,
          input: event,
        },
        null,
        2
      ),
    };
  } else {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        {
          success: false,
          message: "Username or UUID not found",          
        },
        null,
        2
      ),
    };
  }

};

function dashify(uuid) {
  if (uuid.length !== 32) return uuid;
  return uuid.slice(0, 8) + '-' + uuid.slice(8, 12) + '-'
   + uuid.slice(12, 16) + '-' + uuid.slice(16, 20) + '-' + uuid.slice(20);
}
