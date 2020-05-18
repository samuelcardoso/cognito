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

async function listUsers(page) {
  var params = {
    UserPoolId: Env.UserPoolId,
    AttributesToGet: [
      'email'
    ],
    // Filter: 'STRING_VALUE',
    // Limit: '60',
    PaginationToken: page
  };
  return new Promise((resolve, reject) => {
    cognitoidentityserviceprovider.listUsers(params, (err, data) => {
      if (err) {
        console.log(err, err.stack);
        return reject(err);
      } else {
        const users = data['Users'].map(user => {
          return {
            username: user['Username'],
            email: user['Attributes'][0]['Value'],
          }
        })
        return resolve({
          list: users,
          page: data['PaginationToken']
        });
      }
    });
  });
}

(async () => {
  const users = await listUsers();
  while(users.page) {
    const tempUsers = await listUsers(users.page);
    users.list = users.list.concat(tempUsers.list);
    users.page = tempUsers.page;
  }
  // console.log(users.list);
  for(const user of users.list) {
    console.log(user);
  }
})();

