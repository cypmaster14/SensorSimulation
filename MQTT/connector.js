const awsIOT = require('aws-iot-device-sdk');
const credentials = require("./config");

const client = awsIOT.device(credentials);
module.exports = client;