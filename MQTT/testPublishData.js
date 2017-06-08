const mqtt = require('mqtt');
const client = mqtt.connect("mqtt://test.mosquitto.org:1883");

client.on('connect', function () {
    console.log("Client connected");
    client.publish('tq3xxj\\bathroom\\fan', 'cacanar');
    console.log('publish at bathroom fan');
    client.end();
});

client.on('message', function (topic, message) {
    console.log(topic, message.toString());
});