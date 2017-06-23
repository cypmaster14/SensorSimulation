'use strict';
const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const sanitize = require('mongo-sanitize');
const connection = require("../Connection/connection");
const publisher = require('../MQTT/publisher');
const clientSubscriber = require("../MQTT/connector");
const outputTypeSupported = ['Boolean', 'Number', 'String', 'Percentage'];
const async = require("async");


/**
 * GET /things
 * Function that retrieves all the things that are registered at a specific email
 */
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
    }, function(err, document) {
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

router.use(function(req, res, next) {
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
    User.find({
        "things.topic": topic
    }, {
        _id: 0,
        things: {
            $elemMatch: {
                topic: topic
            }
        }
    }, function(err, document) {
        if (err) {
            console.log(err);
            console.log(`Failed to extract the info about topic:${topic} from DB`);
            res.locals.message = "Failed to retrieve the info about topic:${topic}";
            next();
            return;
        }
        if (document === null || document.length === 0) {
            res.locals.statusCode = 404;
            res.locals.message = "Topic doesn't exists";
            next();
            return;
        }

        res.locals.statusCode = 200;
        res.locals.success = true;
        console.log("Data:", document[0].things[0]);
        res.locals.message = document[0].things[0];
        next();
    });
});

/**
 * POST /things
 * Function that is used to add a thing to the system
 */
router.post('/', function (req, res, next) {
    const newThing = sanitizeData(req.body);
    const email = newThing.userName;
    delete newThing.userName;
    res.locals.success = false;
    res.locals.statusCode = 500;

    const validation = validateNewThingInput(newThing);
    if (!validation.isValid) {
        res.locals.statusCode = 400;
        res.locals.message = validation.message;
        next();
        return;
    }

    console.log("New thing", newThing);

    async.series([
        function (taskCallback) {
            //Check if the new thing's topic is already used
            User.find({
                "things.topic": newThing.topic

            }, {
                things: {
                    $elemMatch: {
                        topic: newThing.topic
                    }
                }
            }, function(err, documents) {
                if (err) {
                    console.log("Failed to check if already exists thing with topic:", newThing.topic);
                    res.locals.message = "Some error occured";
                    taskCallback(err);
                    return;
                }
                console.log(documents);
                if (documents.length === 0) {
                    //Topic-ul nu este folosit
                    taskCallback(null);
                }
                else {
                    console.log("Topic-ul este deja folosit");
                    res.locals.statusCode = 409;
                    res.locals.message = "Topic is already used";
                    taskCallback(new Error("Topic is already used"));
                }
            });
        },
        function (taskCallback) {
            //Add the new thing to the user's list of things
            User.findByIdAndUpdate(email, {
                    $push: {
                        'things': newThing
                    }
                }, {
                    safe: true,
                    upsert: true
                },
                function(err, document) {
                    if (err) {
                        console.log(err);
                        res.locals.message = "Failed to add the thing to the user's list of things";
                        taskCallback(err);
                        return;
                    }
                    taskCallback(null);
                });
        }
    ], function(err, results) {
        if (err) {
            console.log(err);
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
    });
});

/**
 *  PUT /things
 *  Function that is used to update the value of a thing(topic)
 */
router.put("/:topic", function (req, res, next) {
    const topic = req.params.topic;
    const value = String(req.body.message);
    res.locals.success = false;
    res.locals.statusCode = 500;
    console.log(topic, value);
    if(!topic || !value){
        res.locals.statusCode=400;
        res.locals.success=false;
        res.locals.message="Topic or value field wasn't provided";
        next();
        return;
    }

    if (req.body.publishData !== undefined) {
        console.log("Doar actualizez datele");
        updateTopicValue(topic, value, function(err) {
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
    }
    else {
        console.log("Actualizez datele si push notification");
        publisher.publishMessageToGateway(topic, value, function(err) {
            if (err) {
                console.log(err);
                res.locals.message = "Failed to publish the data";
                next();
                return;
            }
            console.log("Data was published");

            updateTopicValue(topic, value, function(err) {
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

/**
 * Function that is used to intermediate the communication between platform and devices
 * Published the message using MQTT
 */
router.patch("/", function (req, res, next) {
    console.log("[Things Patch]", req.body);
    const topic = req.body.topic;
    const newValue = req.body.value;
    publisher.publishMessageToDevice(topic, newValue, err => {
        res.locals.statusCode = 200;
        res.locals.success = true;
        res.locals.message = "Message was sent to device";
        next();
    });
});


/**
 * Function that is used to send the response to client
 */
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

/**
 * Function that is used to sanitize the date received from clients
 * @param {JSON} data 
 */
function sanitizeData(data) {
    const sanitizeData = {};
    for (let property of Object.keys(data)) {
        if (data.hasOwnProperty(property)) {
            sanitizeData[property] = sanitize(data[property]);
        }
    }
    return sanitizeData;
}


/**
 * Function that validates the information regarding a new thing
 * @param {JSON} newThing 
 */
function validateNewThingInput(newThing){
    if(outputTypeSupported.indexOf(newThing.outputType)==-1){
        return {
            isValid:false,
            message:"Output type not supported"
        };
    }
    if(newThing.outputType==='Number' || newThing.outputType==='Percentage'){
        if(!(newThing.minimumValue<=newThing.value && newThing.value<=newThing.maximamValue)){
            return {
                isValid:false,
                message:"The values of the thing are not good"
            };
        }
    }
    return {
        isValid:true
    };
}

/**
 * Function that is used to update the value of a thing
 * I update the thing's value from DB
 * @param {String} topic 
 * @param {Number} value 
 * @param {function} next 
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

module.exports = router;
