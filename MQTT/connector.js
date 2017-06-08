'use strict';
const awsIOT = require('aws-iot-device-sdk');
const User = require("../Models/User");
const credentials = require("./config");

const client = awsIOT.device(credentials);
client.on('connect', function () {
    console.log("Connected to AWS IOT");
    //Know I have to retrieve all the topics from DB and subscribe to each topic
    User.find({}, {
        'things.topic': 1,
        '_id': 0
    }, function (err, res) {
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

client.on('message', function (topic, message) {
    message=message.toString();
    console.log("[RECEIVER] Message received:",topic,message);
    updateTopicValue(topic, message, function (err) {
        if (err) {
            console.log("Failed to update the value of topic");
            console.log(err);
            return;
        }
        console.log("Thing was updated");
    });
});

function updateTopicValue(topic, value, next) {
    User.update({
        'things.topic': topic
    }, {
        $set: {
            'things.$.value': value
        }
    }, {
        multi: true
    }, function (err, document) {
        if (err) {
            next(err);
        } else {
            next(null);
        }
    });
}

module.exports = client;