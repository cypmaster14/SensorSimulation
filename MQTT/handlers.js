const request = require('request-promise');
const User = require("../Models/User");
const URL_THINGS = "https://opid-server-cypmaster14.c9users.io/api/SS/things";


/**
 * Function that sends the newly arrived MQTT message to OPID
 * @param {String} topic 
 * @param {String} message 
 * @param {function(err)} callback 
 */
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

/**
 * Function that updates the value of the topic
 * @param {String} topic 
 * @param {String} value 
 * @param {function(err)} next 
 */
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

module.exports = {
    handleUserModifyValue: function (topic, message) {
        console.log("[Device RECEIVER] Message received:", topic, message);

    },
    handleThingModifyValue: function (topic, message) {
        updateTopicValue(topic, message, function (err) {
            if (err) {
                console.log("Failed to update the value of topic");
                console.log(err);
                return;
            }
            console.log("Thing was updated");

            forwardMessageToOPID(topic, message, function (err, result) {
                if (err) {
                    console.log("Failed to forward the message to OPID");
                    console.log(err);
                }
            });
        });
    }
};