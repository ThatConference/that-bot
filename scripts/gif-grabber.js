var http = require('http');
var Q = require('q');

module.exports = {
    getRandomGif: function(term) {
        var responseData = '';
        var deferred = Q.defer();
        
        var options = {
            host: 'api.giphy.com',
            path: '/v1/gifs/random?api_key=dc6zaTOxFJmzC&rating=pg&tag=' + term,       
            port: 80,
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            }
        };
        
        var req = http.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                deferred.resolve(responseData);
            })    
        });
        
        req.on('error', (e) => {
            deferred.reject(new Error("problem with request: " + e.message));
        });
        
        req.end();
        return deferred.promise; 
    }
};