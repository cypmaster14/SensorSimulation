/**
 * Created by Ciprian on 3/29/2017.
 */

angular.module('myApp')
    .service('indexServices', indexServices);

indexServices.$inject = ['$http', '$httpParamSerializer'];


function indexServices($http, $httpParamSerializer) {

    const URL_THINGS = "https://bachelor-cypmaster14.c9users.io/things";
    const CONFIG = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    this.addThing = function (data, next) {
        $http.post(URL_THINGS, data, CONFIG)
            .then(function (response) {
                console.log("Success");
                next(null, response);
            }, function (response) {
                console.log("Failure");
                next(response, null);
            });

    };

    this.generateRandomSequence = function (length) {
        return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
    };

    this.getRandomInt = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };


    this.getUsersThings = function (email, next) {

        const queryString = $httpParamSerializer({
            'email': email
        });
        $http.get(URL_THINGS + "?" + queryString, CONFIG)
            .then(function (response) {
                console.log("Success.I got the things of the user");
                next(null, response.data.message.things);
            }, function (response) {
                console.log("Failed", response);
                next(response, null);
            });
    };

    this.sensorValueModified = function (topic, data, next) {
        const URL_UPDATE_VALUE = `${URL_THINGS}/${encodeURIComponent(topic)}`;
        $http.put(URL_UPDATE_VALUE, data, CONFIG)
            .then(function (response) {
                console.log("Success");
                next(null);
            }, function (response) {
                next(response);
            });
    };

}