const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const app = express();
const things = require("../Routes/things");
const topicHandler = require("../MQTT/publisher");

app.use(morgan('dev'));
app.use("/bower_components", express.static(path.resolve("./public/bower_components")));
app.use(express.static(path.resolve("./public/app")));
app.use(bodyParser.json());

app.use("/things", things);

module.exports = app;