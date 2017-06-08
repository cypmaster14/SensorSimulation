'use strict';
const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const sanitize = require('mongo-sanitize');
const connection = require("../Connection/connection");
const publisher = require('../MQTT/publisher');
const clientSubscriber = require("../MQTT/topicSubscribeHandler");

router.get("/", function (req, res, next) {

    res.locals.success = false;
    res.locals.statusCode = 500;
    const email = req.query.email;
    if (email === undefined) {
        //That means that it mai contains query string regarding the topic ?topic=....
        next();
        return;
    }

    console.log("Query string contains email:", email);
    User.findById(email, {
        things: 1,
        _id: 0
    }, function (err, document) {
        if (err) {
            res.locals.message = "Failed to retrieve user's things";
            console.log(err);
            next();
            return;
        }

        res.locals.statusCode = 200;
        res.locals.success = true;
        res.locals.message = document !== null ? document : [];
        next();
    });
});

router.use(function (req, res, next) {
    if (req.method !== "GET") {
        next();
        return;
    }
    if (res.locals.message !== undefined) {
        //Thins means that a got a response from previous function
        next();
        return;
    }

    console.log("Verifica daca exista topic ca si query string");
    const topic = req.query.topic;
    if (topic === undefined) {
        res.locals.statusCode = 400;
        res.locals.message = "Bad request";
        next();
        return;
    }

    console.log("Query strings contains topic:", topic);
    User.aggregate([{
            $match: {
                'things.topic': topic
            }
        },
        {
            $project: {
                things: {
                    $filter: {
                        input: '$things',
                        as: 'thing',
                        cond: {
                            $eq: ['$$thing.topic', topic]
                        }
                    }
                },
                _id: 0
            }
        }
    ], function (err, document) {
        if (err) {
            console.log(err);
            console.log(`Failed to extract the info about topic:${topic} from DB`);
            res.locals.message = "Failed to retrieve the info about topic:${topic}";
            next();
            return;
        }

        if (document.length === 0) {
            res.locals.statusCode = 404;
            res.locals.message = "Topic doesn't exists";
            next();
            return;
        }

        res.locals.statusCode = 200;
        res.locals.success = true;
        delete document[0].things[0]['_id'];
        console.log("Data:", document[0].things[0]);
        res.locals.message = document[0].things[0];
        next();
    });
});

router.post('/', function (req, res, next) {
    const newThing = sanitizeData(req.body);
    const email = newThing.userName;
    delete newThing.userName;
    res.locals.success = false;
    res.locals.statusCode = 500;

    console.log("New thing", newThing);

    User.findByIdAndUpdate(email, {
            $push: {
                'things': newThing
            }
        }, {
            safe: true,
            upsert: true
        },
        function (err, document) {
            if (err) {
                console.log(err);
                res.locals.message = "Failed to add the thing to the user's list of things";
                next();
                return;
            }

            clientSubscriber.subscribe(newThing.topic);
            console.log("New subscription:", newThing.topic);
            console.log(`[${email}]Thing with the topic ${newThing.topic} was added`);
            res.locals.statusCode = 201;
            res.locals.success = true;
            res.locals.message = "Thing was added";
            next();
        }
    );
});

router.put("/", function (req, res, next) {
    const topic = req.body.topic;
    const value = String(req.body.message);
    res.locals.success = false;
    res.locals.statusCode = 500;
    console.log(topic, value);

    if (req.body.publishData !== undefined) {
        console.log("Doar actualizez datele");
        updateTopicValue(topic, value, function (err) {
            if (err) {
                console.log(err);
                res.locals.message = "Failed to update the value from DB";
                next();
                return;
            }
            res.locals.statusCode = 200;
            res.locals.message = "Data was published successfully";
            res.locals.success = true;
            next();
        });
    } else {
        console.log("Actualizez datele si push notification");
        publisher.publishMessage(topic, value, function (err) {
            if (err) {
                console.log(err);
                res.locals.message = "Failed to publish the data";
                next();
                return;
            }
            console.log("Data was published");

            updateTopicValue(topic, value, function (err) {
                if (err) {
                    console.log(err);
                    res.locals.message = "Failed to update the value from DB";
                    next();
                    return;
                }
                res.locals.statusCode = 200;
                res.locals.message = "Data was published successfully";
                res.locals.success = true;
                next();
            });
        });
    }
});

router.patch("/", function (req, res, next) {
    console.log("In patch");
    console.log("[Things Patch]", req.body);
    res.end("OK");
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

router.use(function (req, res) {
    res.writeHead(res.locals.statusCode, {
        'Content-Type': 'application/json'
    });

    const payload = {
        success: res.locals.success,
        message: res.locals.message
    };
    res.end(JSON.stringify(payload));
});

function sanitizeData(data) {
    const sanitizeData = {};
    for (let property of Object.keys(data)) {
        if (data.hasOwnProperty(property)) {
            sanitizeData[property] = sanitize(data[property]);
        }
    }
    return sanitizeData;
}

module.exports = router;