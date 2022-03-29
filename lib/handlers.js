/*
 * Request handlers
 */

// Dependencies

// Define the handlers
const handlers = {};

// User handler
handlers.users = function (data, callback) {
  // This method is going to figure out which method we are requesting, then pass along to sub handlers
  // List out the acceptable methods
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users sub methods
handlers._users = {};

// Create Users - post
handlers._users.post = function (data, callback) {};

// Create Users - get
handlers._users.get = function (data, callback) {};

// Create Users - put
handlers._users.put = function (data, callback) {};

// Create Users - delete
handlers._users.delete = function (data, callback) {};

// Ping handler
handlers.ping = function (data, callback) {
  callback(200);
};

// Not found handler
handlers.notfound = function (data, callback) {
  callback(404);
};

// Export handlers
module.exports = handlers;
