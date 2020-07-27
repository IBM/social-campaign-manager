
var buildDescribeTestMessage = function(classname, functionname, message) {
    return 'Class: ' + classname + ',\nFunction: ' + functionname + '.\n' + message + '.\n';
};

var buildTestMessage = function(message) {
    return 'Test: ' + message;
};

module.exports = {
    buildDescribeTestMessage,
    buildTestMessage
};
