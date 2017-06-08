/**
 * Created by Ciprian on 4/9/2017.
 */
const client = require("./connector");

module.exports = {
    publishMessage: function (topic, message, callback) {
        console.log("[Publisher] Publish data:", topic, message);
        const data = {
            topic: topic,
            message: message
        };
        client.publish("thingModifyValue", JSON.stringify(data));
        callback(null);
    }
};