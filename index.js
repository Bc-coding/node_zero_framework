/*
Primary file for the API
*/

// Dependencies
const http = require("http");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;

// The server should responde to all requests with a string
const server = http.createServer(function (req, res) {
  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path from url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  console.log(parsedUrl.query);

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
      payload: buffer,
    };

    // Route the request to the handler specified in the router
    chosenhandler(data, function (statusCode, payload) {
      // Use the status code called by the handler or default to 200
      statusCode = typeof statusCode == "number" ? statusCode : 200;
      // Use the payload called by the handler, or default to an empty object
      payload = typeof payload == "object" ? payload : {};
      // every payload we receive is an object, we need to convert it into a string
      const payloadString = JSON.stringify(payload); // this is the payload  the handler is going to send back to the user
      // Return the response -- instead of sending res.send("hello world")
      res.writeHead(statusCode);
      res.end(payloadString);
      console.log("Returing this response: " + statusCode, payloadString);
    });

    // Send the response
    // res.end("hello world!\n");
    // console.log("Request received with this payload", buffer);
  });

  // Log the request path
  //   console.log(
  //     "request received on path: " +
  //       trimmedPath +
  //       " with method: " +
  //       method +
  //       ", and with these query string parameters "
  //   );
  //console.log("Request received with these headers", headers);
});

// Start the server, and have it listen on port 5000
server.listen(8000, function () {
  console.log("The server is listening on port 8000");
});

// Define the handlers
const handlers = {};

// sample handler
handlers.sample = function (data, callback) {
  // Callback a http status code, and a payload object
  callback(406, { name: "sample handler" });
};

// Not found handler
handlers.notfound = function (data, callback) {
  callback(404);
};

// Define a request router
const router = {
  sample: handlers.sample,
};
