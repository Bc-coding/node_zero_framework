/*
 * Request handlers
 */

// Dependencies

const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");

// Define the handlers
const handlers = {};

/***
 * USERS
 ***/

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
    typeof data.queryStringObject["phone"] == "string" &&
    data.queryStringObject["phone"].trim().length == 10
      ? data.queryStringObject["phone"].trim()
      : false;

  if (phone) {
    // Get the token from the headers
    // Since this is an authenticated request, the client would have included the token in the request's header
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, function (err, data) {
          if (!err && data) {
            // Remove the hashed password from the user object before returning
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid",
        });
      }
    });

    // Lookup the user
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

  //console.log(firstName, lastName, phone, password);

  // Error if the phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Get the token from the headers
      // Since this is an authenticated request, the client would have included the token in the request's header
      const token =
        typeof data.headers.token == "string" ? data.headers.token : false;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
        if (tokenIsValid) {
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
          callback(403, {
            Error: "Missing required token in header, or token is invalid",
          });
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
    typeof data.queryStringObject["phone"] == "string" &&
    data.queryStringObject["phone"].trim().length == 10
      ? data.queryStringObject["phone"].trim()
      : false;

  if (phone) {
    // Get the token from the headers
    // Since this is an authenticated request, the client would have included the token in the request's header
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
      if (tokenIsValid) {
        _data.read("users", phone, function (err, data) {
          if (!err && data) {
            _data.delete("users", phone, function (err, data) {
              if (!err) {
                // callback(200);
                // If the user's checkData has been deleted successfully,
                // Delete each of the checks associated wih the user
                const userChecks =
                  typeof userData.checks == "object" &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];
                const checksToDelete = userChecks.length;
                if (checksToDelete > 0) {
                  const checksDeleted = 0;
                  const deletionErrors = false;
                  // To Loop through the checks
                  userChecks.forEach(function (checkId) {
                    // Delete the check
                    _data.delete("checks", checkId, function (err) {
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted == checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        } else {
                          callback(500, {
                            Error:
                              "Errors encountered while attempting to delete all of the user's check(s). All checks may not have been deleted from the system successfully",
                          });
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: "Could not delete specified the user" });
              }
            });
          } else {
            callback(400, { Error: "Could not find specified user" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

/***
 * TOKENS
 ***/
// Tokens handlers

handlers.tokens = function (data, callback) {
  // This method is going to figure out which method we are requesting, then pass along to sub handlers
  // List out the acceptable methods
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the tokens sub methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function (data, callback) {
  // Check that all required fields are filled out
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

  // console.log(data);

  if (phone && password) {
    // Look up the user who matches the phone number
    _data.read("users", phone, function (err, userData) {
      if (!err && userData) {
        // In order to compare with our stored password, we need to hash the incoming password first
        const hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.password) {
          // If valid, create a new token with a random, Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);

          const expires = Date.now() + 60 * 60 * 1000;

          const tokenObject = {
            phone: phone,
            id: tokenId,
            expires: expires,
          };

          // Store the token
          _data.create("tokens", tokenId, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create the new token" });
            }
          });
        } else {
          callback(400, {
            Error:
              "Password did not match the specified user's stored password",
          });
        }
      } else {
        callback(400, { Error: "Could not find the specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Tokens - get
// Required Id: id
// Optional data: none
handlers._tokens.get = function (data, callback) {
  // check the id is valid
  const tokenId =
    typeof data.queryStringObject["id"] == "string" &&
    data.queryStringObject["id"].trim().length == 20
      ? data.queryStringObject["id"].trim()
      : false;

  if (tokenId) {
    // Look up the token
    _data.read("tokens", tokenId, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;

  if (id && extend) {
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        // Check that the token isn't already expired
        // We only want to let the user to extend if the token still exists
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updated
          _data.update("tokens", id, tokenData, function (err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: "Could not update the token's expiration",
              });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired, and can not be extended",
          });
        }
      } else {
        callback(400, { Error: "Specified token data does not exist." });
      }
    });
  } else {
    callback(400, {
      Error: "Missing required field(s) or field(s) are invalid",
    });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
  // Check that the id is valid

  const id =
    typeof data.queryStringObject["id"] == "string" &&
    data.queryStringObject["id"].trim().length == 20
      ? data.queryStringObject["id"].trim()
      : false;

  if (id) {
    // Look up the token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        _data.delete("tokens", id, function (err, tokenData) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        callback(400, { Error: "Could not find specified token" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
  // Lookup the token
  _data.read("tokens", id, function (err, tokenData) {
    if (!err && tokenData) {
      // Check that token is for the given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

/***
 * Checks
 ***/

handlers.checks = function (data, callback) {
  // This method is going to figure out which method we are requesting, then pass along to sub handlers
  // List out the acceptable methods
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the checks sub methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none

handlers._checks.post = function (data, callback) {
  console.log(data);
  // Validate inputs
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["http", "https"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  //console.log(protocol, url, method, successCodes, timeoutSeconds);

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Check that the user has provided token in the headers, we dont want anonymous user create checks
    const token =
      typeof data.headers.token == "string" ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read("tokens", token, function (err, tokenData) {
      if ((!err, tokenData)) {
        const userPhone = tokenData.phone;
        // Lookup the user data
        _data.read("users", userPhone, function (err, userData) {
          if (!err && userData) {
            // if there is userData, we need to validate which checks the user has already had
            const userChecks =
              typeof userData.checks == "object" &&
              userData.checks instanceof Array
                ? userData.checks
                : [];
            // Verify that the user has less than the number of max-checks per user
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const checkId = helpers.createRandomString(20);

              // Create the check object, and include the user's phone because the phone number is the unique identifier
              // no SQL way to store data and reference - like mongoDB
              const checkObject = {
                id: checkId,
                userPhone: userPhone,
                protocol: protocol,
                url: url,
                method: method,
                successCodes: successCodes,
                timeoutSeconds: timeoutSeconds,
              };

              // Store the object
              _data.create("checks", checkId, checkObject, function (err) {
                if (!err) {
                  // now the check has been created, before we respond to the user, we need to update the user's object with this new checkId
                  // Add the checkId to user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update("users", userPhone, userData, function (err) {
                    if (!err) {
                      // Return the data abouth the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: "Could not update the user with the new check",
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not create the new check" });
                }
              });
            } else {
              callback(400, {
                Error:
                  "The user already has the maximum number of checks " +
                  config.maxChecks,
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: "Missing required inputs or inputs are invalid" });
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function (data, callback) {
  // Check the phone number provided is valid
  // we can also check by key and value inside queryStringObject

  const checkId =
    typeof data.queryStringObject["id"] == "string" &&
    data.queryStringObject["id"].trim().length == 20
      ? data.queryStringObject["id"].trim()
      : false;

  if (checkId) {
    // First, we need to figure out which user created this check
    // Look up the check
    _data.read("checks", checkId, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from the headers
        // Since this is an authenticated request, the client would have included the token in the request's header
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;

        // Verify that the given token is valid and belongs to the user who creates the check
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone, // Verify that the phone belongs to the user who creates the check
          function (tokenIsValid) {
            if (tokenIsValid) {
              // Return the check data
              callback(200, checkData);
            } else {
              callback(403);
            }
          }
        );
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = function (data, callback) {
  // Check for the required field
  const id =
    typeof data.payload.id == "string" && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  // check for optional fields
  const protocol =
    typeof data.payload.protocol == "string" &&
    ["http", "https"].indexOf(data.payload.protocol) > -1
      ? data.payload.protocol
      : false;

  const url =
    typeof data.payload.url == "string" && data.payload.url.trim().length > 0
      ? data.payload.url.trim()
      : false;

  const method =
    typeof data.payload.method == "string" &&
    ["post", "get", "put", "delete"].indexOf(data.payload.method) > -1
      ? data.payload.method
      : false;

  const successCodes =
    typeof data.payload.successCodes == "object" &&
    data.payload.successCodes instanceof Array &&
    data.payload.successCodes.length > 0
      ? data.payload.successCodes
      : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds == "number" &&
    data.payload.timeoutSeconds % 1 === 0 &&
    data.payload.timeoutSeconds >= 1 &&
    data.payload.timeoutSeconds <= 5
      ? data.payload.timeoutSeconds
      : false;

  // Check to make sure if the id is valid
  if (id) {
    // Check to make sure one or more fields has been sent
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the check
      _data.read("checks", id, function (err, checkData) {
        if (!err && checkData) {
          // Get the token from the headers
          // Since this is an authenticated request, the client would have included the token in the request's header
          const token =
            typeof data.headers.token == "string" ? data.headers.token : false;

          console.log(token);

          // Verify that the given token is valid and belongs to the user who creates the check
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone, // Verify that the phone belongs to the user who creates the check
            function (tokenIsValid) {
              if (tokenIsValid) {
                // Update the check where necessary
                if (protocol) {
                  checkData.protocol = protocol;
                }
                if (url) {
                  checkData.url = url;
                }
                if (method) {
                  checkData.method = method;
                }
                if (successCodes) {
                  checkData.successCodes = successCodes;
                }
                if (timeoutSeconds) {
                  checkData.timeoutSeconds = timeoutSeconds;
                }
                // Store the update
                _data.update("checks", id, checkData, function (err) {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { Error: "Could not update the check" });
                  }
                });
              } else {
                callback(403);
              }
            }
          );
        } else {
          callback(400, { Error: "CheckId did not exist." });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing the required fields" });
  }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function (data, callback) {
  // check the id is valid
  const id =
    typeof data.queryStringObject["id"] == "string" &&
    data.queryStringObject["id"].trim().length == 20
      ? data.queryStringObject["id"].trim()
      : false;

  if (id) {
    // Lookup the check they want to delete
    // If the check id exist, then we check their token if it is still valid
    _data.read("checks", id, function (err, checkData) {
      if (!err && checkData) {
        // Get the token from the headers
        // Since this is an authenticated request, the client would have included the token in the request's header
        const token =
          typeof data.headers.token == "string" ? data.headers.token : false;

        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          function (tokenIsValid) {
            if (tokenIsValid) {
              // Delete the check data
              _data.delete("checks", id, function (err) {
                if (!err) {
                  // Lookup the user
                  _data.read(
                    "users",
                    checkData.userPhone,
                    function (err, userData) {
                      if (!err && userData) {
                        // Lookup the check in the userCheck, which check the user wants to delete
                        // We need to validate which checks the user has already had
                        // REmove the delete check from their list of checks
                        // Check the position of check in the array

                        const userChecks =
                          typeof userData.checks == "object" &&
                          userData.checks instanceof Array
                            ? userData.checks
                            : [];

                        const checkPosition = userChecks.indexOf(id);

                        if (checkPosition > -1) {
                          // Remove the check
                          userChecks.splice(checkPosition, 1);
                          // Re-save the data
                          _data.update(
                            "users",
                            checkData.userPhone,
                            userData,
                            function (err) {
                              if (!err) {
                                callback(200);
                              } else {
                                callback(500, {
                                  Error:
                                    "Could not update the new data in the user's object",
                                });
                              }
                            }
                          );
                        } else {
                          callback(500, {
                            Error: "Could not find the check in user's object",
                          });
                        }
                      } else {
                        callback(500, {
                          Error:
                            "Could not find the user who created the check, so could not remove the check from the list of checks on the user object",
                        });
                      }
                    }
                  );
                } else {
                  callback(500, {
                    Error: "Could not delete the specified check data",
                  });
                }
              });
            } else {
              callback(403, {
                Error: "Missing required token in header, or token is invalid",
              });
            }
          }
        );
      } else {
        callback(400, { Error: " The specified check id does not exist" });
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
