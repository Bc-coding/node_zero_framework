/*
 * Request handlers
 */

// Dependencies
const _data = require("./data");
const helpers = require("./helpers");

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
// Required data: firstName, lastName, password, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
  // Check that all required fields are filled out
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false; // trim to get rid of white space

  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false; // trim to get rid of white space

  // phone - we want the value to be string not integer
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 10
      ? data.payload.password.trim()
      : false;

  const tosAgreement =
    typeof data.payload.tosAgreement == "boolean" &&
    data.payload.tosAgreement == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // make sure the user does not already exist
    // open folder and read the file to check it the user exists
    _data.read("users", phone, function (err, data) {
      // if the error comes back good news
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          const userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            password: hashedPassword,
            tosAgreement: true,
          };

          // Store the user
          _data.create("users", phone, userObject, function (err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: "Could not create the new user" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash the user's password!" });
        }
      } else {
        // User already exists
        callback(400, {
          Error: " A user with that phone number already exists",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Create Users - get
// Required data: phone
// Optional data: none
// @TODO only let an authenticated users access their object.
handlers._users.get = function (data, callback) {
  // Check the phone number provided is valid
  // we can also check by key and value inside queryStringObject
  // const phone =
  //   typeof data.queryStringObject.phone == "string" &&
  //   data.queryStringObject.trim().length == 10
  //     ? data.queryStringObject.trim()
  //     : false;

  // console.log(typeof data.queryStringObject);

  const phone =
    typeof data.queryStringObject["/phone"] == "string" &&
    data.queryStringObject["/phone"].trim().length == 10
      ? data.queryStringObject["/phone"].trim()
      : false;

  // console.log(data.queryStringObject["/phone"]);

  if (phone) {
    _data.read("users", phone, function (err, data) {
      // the "data" here is the data we read from _data.read
      if (!err && data) {
        // remove the user's hashed password from the user object before returning it to the requester
        delete data.hashedPassword;
        callback(200, data);
      } else {
        callback(404, { Error: "User not found" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Create Users - put
// Required data: phone
// Optional data: firstName, lastName, password ( at least one must ve specified)
// @TODO Only let an authenticated user update their own object. Don't let them update any
handlers._users.put = function (data, callback) {
  // Check for the required field
  const phone =
    typeof data.payload.phone == "string" &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;

  // Check for optional fields
  const firstName =
    typeof data.payload.firstName == "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false; // trim to get rid of white space

  const lastName =
    typeof data.payload.lastName == "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false; // trim to get rid of white space

  const password =
    typeof data.payload.password == "string" &&
    data.payload.password.trim().length > 10
      ? data.payload.password.trim()
      : false;

  console.log(firstName, lastName, phone, password);

  // Error if the phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Look up the user
      _data.read("users", phone, function (err, userData) {
        if (!err && userData) {
          // no error and there is userData, update the fields necessary
          if (firstName) {
            userData.firstName = firstName;
          }

          if (lastName) {
            userData.lastName = lastName;
          }

          if (password) {
            userData.hashedPassword = helpers.hash(password);
          }

          // Store the new updates
          _data.update("users", phone, userData, function (err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: "Could not update the user" }); // 500 because there is nothing wrong with the user'data
            }
          });
        } else {
          callback(400, { Error: "The specified user does not exist" });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Create Users - delete
// Required field: phone
// @TODO Only let an authenticated user delete their object.
// @TODO cleanup (delete) any other data files associated with this user

handlers._users.delete = function (data, callback) {
  // check the phone number is valid
  const phone =
    typeof data.queryStringObject["/phone"] == "string" &&
    data.queryStringObject["/phone"].trim().length == 10
      ? data.queryStringObject["/phone"].trim()
      : false;

  if (phone) {
    _data.read("users", phone, function (err, data) {
      if (!err && data) {
        _data.delete("users", phone, function (err, data) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete specified the user" });
          }
        });
      } else {
        callback(400, { Error: "Could not find specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

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
