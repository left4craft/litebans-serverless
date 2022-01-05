"use strict";

const list = require('./routes/list').handle;
const check = require('./routes/check').handle;

module.exports.route = async (event) => {
  if(event.requestContext === undefined
    || event.requestContext.http === undefined
    || event.requestContext.http.path === undefined
    ) return {
      statusCode: 400,
      body: JSON.stringify(
        {
          success: false,
          message: "Missing HTTP Context",          
        },
        null,
        2
      ),
  };
  const path = event.requestContext.http.path.toLowerCase();

  if(path === '/') return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      {
        success: true,
        version: 1.0,
        message: "Litebans API by Captain_Sisko", 
        github: "https://github.com/left4craft/litebans-serverless"       
      },
      null,
      2
    ),
  };

  if (path === '/list') {
    return list(event);
  }

  if (path === '/check') {
    return check(event);
  }

  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      {
        success: false,
        message: "No such route",
        path: path
      },
      null,
      2
    ),
  };

};
