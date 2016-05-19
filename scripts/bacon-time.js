var moment = require('moment');
var format = require('format-number');

module.exports = {
    timeToBacon: function() {
        var endDate = moment('2016-08-08 17:30:00');
        var from = moment(Date.now());
        var formatter = format();
        
        return {
            days: endDate.diff(from, 'days'),
            hours: formatter(endDate.diff(from, 'minutes')),
            seconds: formatter(endDate.diff(from, 'seconds'))
        }
    },
    timeToBaconBar: function() {
        
    }
};