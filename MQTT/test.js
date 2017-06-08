var mqtt = require('mqtt');
var client = mqtt.connect("mqtt://test.mosquitto.org:1883");

client.on('connect', function () {
    client.subscribe('tq3xxj\\bathroom\\fan');
    console.log("Connected to bathroom fan:tq3xxj\\bathroom\\fan");
});

client.on('message', function (topic, message) {
    // message is Buffer 
    console.log(message.toString());
    client.end();
});