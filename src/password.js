const csv = require('csv-parser')
const fs = require('fs')
const AWS = require("aws-sdk");
const Env = require("../resources/env.json");

AWS.config.getCredentials(function(err) {
    if (err) console.log(err.stack);
    else {
      console.log("Access key:", AWS.config.credentials.accessKeyId)
      console.log("Secret access key:", AWS.config.credentials.secretAccessKey)
    }
  });
AWS.config.update({region: 'us-east-1'});

const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider()

const filecontent = [];

fs.createReadStream('./resources/current_users.csv')
  .pipe(csv())
  .on('data', (data) => filecontent.push(data[Object.keys(data)[0]]))
  .on('end', async () => {
    const RateLimiter = require('limiter').RateLimiter;
    var limiter = new RateLimiter(20, 'minute');
    for(const user of filecontent) {
      limiter.removeTokens(1, (err, remainingRequests) => {
        run(user);
      });
    }
  });

async function run(id) {
  console.log(`Changing pass for ${id}`)
  var params = {
    Password: Env.TemporaryPassword,
    Permanent: false,
    // Username: "",
    UserPoolId: Env.UserPoolId
  }
  cognitoidentityserviceprovider.adminSetUserPassword({...params, Username: id}, (err, data) => {
    if (err) {
      console.log(err, err.stack, id);
    } else {
      console.log(`Success changing: ${JSON.stringify(data)}`);
    }
  });
}
