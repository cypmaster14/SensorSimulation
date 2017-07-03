/**
 * Created by Ciprian on 3/29/2017.
 */
'use strict';

angular.module('myApp')
    .controller('mainController', mainController)
    .directive('addThingModal', addThingModal)
    .directive('userIdentificationModal', userIdentificationModal);

function userIdentificationModal() {
    return {
        templateUrl: 'userIdentificationModal.html'
    }
}

function addThingModal() {
    return {
        templateUrl: 'addThingModal.html'
    }
}

mainController.$inject = ['$scope', 'indexServices'];


function mainController($scope, indexServices) {

    console.log("Main controller Username:", $scope.userName);
    initialize();
    $scope.showWarning = false;
    $scope.otherOptions = [];
    $scope.devices = [];
    $scope.showSaveIcon = false;


    $scope.enterUsername = function(userName) {
        if (userName !== undefined && userName !== "") {
            console.log(userName);
            $('#waitingModal').modal('open');
            indexServices.getUsersThings(userName, function(err, things) {
                if (err) {
                    //Trebuie sa modific aici, sa pun un sweetAlert cu oops error
                    return;
                }
                console.log("User's things.", things);
                $('#modal1').modal('close');
                if (things != undefined) {
                    for (let thing of things) {
                        $scope.devices.push(thing);
                    }
                }
                $('#waitingModal').modal('close');
                $scope.userName = userName;
                console.log($scope.devices);
            });


        }
        else {
            $scope.showWarning = true;
        }

    };

    $scope.editDashboard = function() {
        $scope.showSaveIcon = !$scope.showSaveIcon;
    };

    $scope.removeThing = function(topic) {
        console.log("Remove:", topic);
        indexServices.removeThing($scope.userName, topic, function(err, response) {
            if (err) {
                console.log("Failed to remove thing");
                Materialize.toast("Failed to remove thing", 3000, "rounded");
                return;
            }

            $scope.devices = $scope.devices.filter(function(device) {
                return device.topic !== topic;
            });
            Materialize.toast("Thing was removed", 3000, "rounded");
        });
    };

    $scope.showModalAddThing = function() {
        const thingGeneratedIdLength = indexServices.getRandomInt(5, 10);
        $scope.topicThing = indexServices.generateRandomSequence(thingGeneratedIdLength) + "/";
        $('#modalThing').modal('open');
    };

    $scope.addOtherOption = function() {
        $scope.otherOptions.push({
            id: "option" + ($scope.otherOptions.length + 1),
            value: ""
        });
    };

    $scope.removeOption = function() {
        $scope.otherOptions.splice(-1, 1);
    };

    $scope.submitNewValue = function(topic) {
        console.log(`I want to update the value with topic:${topic}`);
        const modifiedDevice = getDeviceByTopic(topic);
        console.log(modifiedDevice.value);
        let newValue;
        switch (modifiedDevice.outputType) {
            case "Boolean":
                newValue = modifiedDevice.value === 'On' ? "Off" : "On";
                break;
            case "Number":
                newValue = document.getElementById(topic).value;
                break;
            case "String":
                newValue = modifiedDevice.value;
                break;
            case "Percentage":
                newValue = document.getElementById(topic).value;
                break;
            default:

        }

        console.log(`NewValue:${newValue}`);
        updateValueOfThing(topic, newValue, modifiedDevice.outputType, function(err) {
            if (err) {
                Materialize.toast("Failed to update thing",3000,"rounded");
                return;
            }
            modifiedDevice.value = newValue;
            Materialize.toast("Value was modified",3000,"rounded");
        });

    };

    $scope.sensorValueChanged = function(topic) {
        console.log(`I want to update the value with topic:${topic}`);
        const newValue = document.getElementById(topic).value;
        console.log("New newValue:", newValue);
        for (let device of $scope.devices) {
            if (device.topic === topic) {
                console.log(`OldValue:${device.value} NewValue:${newValue}`);
                updateValueOfThing(topic, newValue, device.outputType, function(err) {
                    if (err) {
                        alert("Failed to update thing");
                        return;
                    }
                    device.value = newValue;
                    console.log("Value was modified");
                    alert("Value was modified");
                });
            }
        }
    };

    $scope.addThing = function() {
        console.log($scope.typeOfThing);
        if ($scope.nameThing !== undefined && $scope.typeOfThing.length !== 0 && $scope.outputTypeThing !== null) {
            const newThing = {
                userName: $scope.userName,
                topic: $scope.topicThing,
                name: $scope.nameThing,
                thingType: $scope.typeOfThing,
                outputType: $scope.outputTypeThing,
                value: getValueOfNewThing()
            };

            switch ($scope.outputTypeThing) {
                case "Number":
                    newThing.minimumValue = $scope.minValueNumber;
                    newThing.maximamValue = $scope.maxValueNumber;
                    break;
                case "String":
                    newThing.options = [$scope.valueString];
                    for (let options of $scope.otherOptions) {
                        newThing.options.push(options.value);
                    }
                    break;
                case "Percentage":
                    newThing.minimumValue = 0;
                    newThing.maximamValue = 100;
                    break;
                case "Boolean":
                    newThing.options = ['On', 'Off'];
                    break;
            }

            if (newThing.value === undefined) {
                console.log("Complete all fields");
                return;
            }


            console.log("New Thing", newThing);
            indexServices.addThing(newThing, function(err, response) {
                $("#modalThing").modal('close');
                if (err) {
                    console.log("Some error occurred");
                    console.log(err);
                    if (err.status === 400 || err.status === 409) {
                        Materialize.toast(err.data.message, 3000, 'rounded');
                    }
                    return;
                }
                console.log('[Next]', response);
                $scope.devices.push(newThing);
                Materialize.toast("Thing was added", 3000, 'rounded');
            });
        }

    };

    function getValueOfNewThing() {
        switch ($scope.outputTypeThing) {
            case "Number":
                return $scope.valueNumber;
            case "String":
                return $scope.valueString;
            case "Boolean":
                return $scope.valueBoolean;
            case "Percentage":
                return $scope.valuePercentage;
        }
    }

    function updateValueOfThing(topic, newValue, outputType, next) {
        const data = {
            message: newValue,
            outputType: outputType
        };
        console.log(data);

        indexServices.sensorValueModified(topic, data, function(err) {
            if (err) {
                console.log(err);
                console.log("Failed to update the value of a thing");
                next(err);
                return;
            }
            next(null);
        });

    }

    function getDeviceByTopic(topic) {
        for (let device of $scope.devices) {
            if (device.topic === topic) {
                return device;
            }
        }
    }

    function initialize() {

        angular.element(document).ready(function() {
            $('#modal1').modal({
                dismissible: false, // Modal cannot be dismissed by clicking outside of the modal
                opacity: .5, // Opacity of modal background
                inDuration: 300, // Transition in duration
                outDuration: 200
            });

            $('#waitingModal').modal({
                dismissible: false, // Modal cannot be dismissed by clicking outside of the modal
                opacity: .5, // Opacity of modal background
                inDuration: 300, // Transition in duration
                outDuration: 200
            });

            $('#modalThing').modal({
                dismissible: true, // Modal cannot be dismissed by clicking outside of the modal
                opacity: .5, // Opacity of modal background
                inDuration: 300, // Transition in duration
                outDuration: 200,
                complete: function() {
                    console.log("Inchid modal");
                    $("#typeOfThing").val("None");
                    $("#outputTypeThing").val("None");
                    $("select").material_select();
                    $(this).find('form').trigger('reset');
                    $scope.outputTypeThing = undefined;
                }
            });

            $('#modalThig').on('close', function() {
                console.log("Inchid");
            });

            $('#modal1').modal('open');
            console.log("On ready");
            $("select").material_select();
        });

    }

}
