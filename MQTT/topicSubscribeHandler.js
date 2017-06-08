'use strict';
const User = require("../Models/User");
const request = require('request-promise');
const URL_TOPIC_PUBLISHED = "http://localhost:1414/SS/things";
const client = require("./connector");

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
    //Once i received a notification from publisher that a message was published , I have to sent
    //to the main server that a value was updated and he has to send a notification to all the client
    //that subscribed at that topic
    // The DB is updated after the message was publish successfully
    console.log("[Message Published]", topic, message.toString());
    const options = {
        method: 'POST',
        uri: URL_TOPIC_PUBLISHED,
        body: {
            topic: topic,
            message: message.toString()
        },
        json: true
    };

    // request(options)
    //     .then(function (parsedBody) {
    //         console.log("Modify was sent successfully and the users were notified");
    //     })
    //     .catch(function (err) {
    //         console.log(err);
    //     });
});

const aux = (event, context, callback) => {
    console.log("A thing modified value");
    event = JSON.parse(event.toString());
    console.log(`Topic:${event.topic}\nMessage:${event.message}`);
    const options = {
        method: "PATCH",
        uri: "https://aws-lambda-trigger-cypmaster14.c9users.io/",
        body: {
            topic: event.topic,
            message: event.message
        }
    };

    request(options).then((response) => {
        console.log("Successfully made the request");
        callback(null, `Notify that ${event.topic} has new value:${event.message}`);
    }).catch(err => {
        callback(err, null);
    });
};

module.exports = client;