const request = require('request-promise');
const User = require("../Models/User");
const URL_THINGS = "https://opid-server-cypmaster14.c9users.io/api/SS/things";

function forwardMessageToOPID(topic, message, callback) {
    console.log("A thing modified value");
    console.log(`Topic:${topic}\nMessage:${message}`);
    const options = {
        method: "POST",
        uri: URL_THINGS,
        body: {
            topic: topic,
            message: message
        },
        json: true
    };
    request(options)
        .then(response => {
            console.log("Successfully made the request");
            callback(null, `Notify that ${topic} has new value:${message}`);
        }).catch(err => {
            callback(err, null);
        });
}

function updateTopicValue(topic, value, next) {
    User.update({
        'things.topic': topic
    }, {
        $set: {
            'things.$.value': value
        }
    }, {
        multi: true
    }, function(err, document) {
        if (err) {
            next(err);
        }
        else {
            next(null);
        }
    });
}

module.exports = {
    handleUserModifyValue: function(topic, message) {
        console.log("[RECEIVER] Message received:", topic, message);
        updateTopicValue(topic, message, function(err) {
            if (err) {
                console.log("Failed to update the value of topic");
                console.log(err);
                return;
            }
            console.log("Thing was updated");
        });

    },
    handleThingModifyValue: function(topic, message) {
        forwardMessageToOPID(topic, message, function(err, result) {
            if (err) {
                console.log("Failed to forward the message to OPID");
                console.log(err);
            }
        });
    }
};
