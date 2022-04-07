/*
Primary file for the API
*/

// Dependencies
const { log } = require("console");
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./lib/config");
const fs = require("fs");
const handlers = require("./lib/handlers");
const helpers = require("./lib/helpers");

// var _data = require("./lib/data");

// // TESTING
// // @TODO
// _data.delete("test", "testFile", function (err, data) {
//   console.log("this was the error: ", err, " and this was the data: ", data);
// });

// The server should respond to all requests with a string
// Instantiate the HTTP server
const httpServer = http.createServer(function (req, res) {
  unifiedServer(req, res);
});

// Start the sever, based on the environment defined in the config.js
httpServer.listen(config.httpPort, function () {
  console.log(
    "The server is listening on port " +
      config.httpPort +
      " in " +
      config.envName +
      " mode"
  );
});

// Instantiate the HTTPS server
const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem"),
};
const httpsServer = https.createServer(httpsServerOptions, function (req, res) {
  unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, function () {
  console.log(
    "The server is listening on port " +
      config.httpsPort +
      " in " +
      config.envName +
      " mode"
  );
});

// All the server logic for both the http and https server
var unifiedServer = function (req, res) {
  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path from url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  console.log(parsedUrl);

  // console.log(parsedUrl.query);

  // Get the HTTP Method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload if any
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", function (data) {
    buffer += decoder.write(data);
  });

  req.on("end", function () {
    buffer += decoder.end();

    // Choose the handler this request should go to. If one is not found, choose the not found handler
    // checking if the handler exists, such as sample handler
    const chosenhandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notfound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      // payload: buffer,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    chosenhandler(data, function (statusCode, payload) {
      // Use the status code called by the handler or default to 200
      statusCode = typeof statusCode == "number" ? statusCode : 200;
      // Use the payload called by the handler, or default to an empty object
      payload = typeof payload == "object" ? payload : {};
      // every payload we receive is an object, we need to convert it into a string
      const payloadString = JSON.stringify(payload); // this is the payload  the handler is going to send back to the user

      // Return the response -- instead of sending res.send("hello world"
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log
      console.log("Returning this response: " + statusCode, payloadString);
    });
  });
};

// Define a request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
};
