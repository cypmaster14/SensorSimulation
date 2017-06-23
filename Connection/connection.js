const mongoose = require('mongoose');
const config = require("../Config/config");
const options = {
    server: {
        poolSize: 10
    }
};
mongoose.Promise = global.Promise;
mongoose.connect(config.mongoUrl);
mongoose.connection.on('connected', function() {
    console.log('Mongoose default connection open to ' + config.mongoUrl);
});

// If the connection throws an error
mongoose.connection.on('error', function(err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function() {
    console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection 
process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});
