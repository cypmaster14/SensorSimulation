'use strict';
const awsIOT = require('aws-iot-device-sdk');
const User = require("../Models/User");
const credentials = require("./config");
const receiver = require("./receiver");
const TOPIC_THING_MODIFY_VALUE = "thingModifyValue";


const client = awsIOT.device(credentials);
/**
 * Function that is called when the connection to AWS IoT is establish successfully
 */
client.on('connect', function() {
    console.log("Connected to AWS IOT");
    client.subscribe(TOPIC_THING_MODIFY_VALUE);
    console.log(`Subscribe to:${TOPIC_THING_MODIFY_VALUE}`);
    //Know I have to retrieve all the topics from DB and subscribe to each topic
    User.find({}, {
        'things.topic': 1,
        '_id': 0
    }, function(err, res) {
        if (err) {
            console.log("[FAILED] Failed to retrieve the list of MQTT topics to connect to");
            return;
        }
        for (let document of res) {
            // console.log(document.things);
            if (document.things.length > 0) {
                for (let result of document.things) {
                    console.log(`Subscribe to:${result.topic}`);
                    client.subscribe(result.topic);
                }
            }
        }
    });
});

/**
 * Function that is called when a MQTT message arrives for a subscribed token
 */
client.on('message', receiver);

module.exports = client;
