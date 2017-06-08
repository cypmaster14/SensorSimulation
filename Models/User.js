const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const Users = new Schema({
    _id: {
        type: String,
        required: true
    },
    things: [{
        topic: {
            type: String,
            require: true
        },
        name: {
            type: String,
            required: true
        },
        thingType: {
            type: [String],
            required: true
        },
        outputType: {
            type: String,
            required: true
        }
    }]
}, {
    strict: false
});

module.exports = mongoose.model('Users', Users, "users");