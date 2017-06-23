/**
 * Created by Ciprian on 4/9/2017.
 */
const client = require("./connector");
const TOPIC_THING_MODIFY_VALUE = "thingModifyValue";

module.exports = {
    publishMessageToGateway: function(topic, message, callback) {
        console.log("[Publisher] Publish data:", topic, message);
        const data = {
            topic: topic,
            message: message
        };
        // client.publish("thingModifyValue", JSON.stringify(data));
        // callback(null);
        client.publish(TOPIC_THING_MODIFY_VALUE, JSON.stringify(data));
        callback(null);
    },

    publishMessageToDevice: function(topic, message, callback) {
        console.log("Send message to device", topic, message);
        client.publish(topic, message);
        console.log("Message was sent");
        callback(null);
    }
};
