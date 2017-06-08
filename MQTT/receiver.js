const client = require('connector');
const User = require('../Models/User');


client.on('message', function (topic, message) {
    updateTopicValue(topic, value, function (err) {
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