const TOPIC_THING_MODIFY_VALUE = "thingModifyValue";
const messageHandler = require("./handlers");

// Gateway method, receives messages from devices and forwards them to OPID
// Receive messages FROM Gateway and update thing's value
module.exports = function(topic, message) {
    console.log("Message received",topic);
    message = message.toString();
    switch (topic) {
        case TOPIC_THING_MODIFY_VALUE:
            message=JSON.parse(message);
            messageHandler.handleThingModifyValue(message.topic, message.message);
            break;
        default:
            messageHandler.handleUserModifyValue(topic, message);
    }
};
