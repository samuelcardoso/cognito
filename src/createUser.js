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

fs.createReadStream('./resources/new_users.csv')
  .pipe(csv({
    mapHeaders: ({ header, index }) => header.replace(/\s/g, '').toLowerCase()
  }))
  .on('data', (data) => filecontent.push(data))
  .on('end', async () => {
    const RateLimiter = require('limiter').RateLimiter;
    var limiter = new RateLimiter(20, 'minute');
    for(const user of filecontent) {
      limiter.removeTokens(1, (err, remainingRequests) => {
        run(user);
      });
    }
  });

async function run(user) {
  console.log(`Creating user for ${JSON.stringify(user)}`)
  // const nome = user['celulardousuário'];
  const celular = '+' + user['celulardousuário'];
  const email = user['e-maildousuário'];
  if(email.indexOf('@') <= 0) {
    return;
  }
  var params = {
    UserPoolId: Env.UserPoolId, /* required */
    Username: email, /* required */
    // ClientMetadata: {
    //   '<StringType>': 'STRING_VALUE',
    //   /* '<StringType>': ... */
    // },
    DesiredDeliveryMediums: [
      'EMAIL'
    ],
    // ForceAliasCreation: true || false,
    // MessageAction: RESEND | SUPPRESS,
    Password: Env.TemporaryPassword,
    UserAttributes: [
      {
        Name: 'phone_number', /* required */
        Value: celular
      },
      {
        Name: 'email', /* required */
        Value: email
      },
    ],
    // ValidationData: [
    //   {
    //     Name: 'STRING_VALUE', /* required */
    //     Value: 'STRING_VALUE'
    //   },
    // ]
  };
  console.log({
    celular: celular,
    email: email
  });
  cognitoidentityserviceprovider.adminCreateUser(params, (err, data) => {
    if (err) {
      console.log(err);
      // console.log(err, err.stack);
    } else {
      console.log(`Success changing: ${JSON.stringify(data)}`);
    }
  });
}
