var https = require('https');
var Q = require('q');

module.exports = {
    analyzeText: function(message) {
        var responseData = '';
        var deferred = Q.defer();
        
        var postData = JSON.stringify({
            'language' : 'en',
            'analyzerIds' : ['08ea174b-bfdb-4e64-987e-602f85da7f72'],
            'text' : message.text 
        });

        var options = {
            host: 'api.projectoxford.ai',
            path: '/linguistics/v1.0/analyze',       
            port: 443,
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Content-Length': postData.length,
                'Cache-Control': 'no-cache',
                'Ocp-Apim-Subscription-Key': process.env.MSCSToken,
            }
        };
        
        var req = https.request(options, (res) => {
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
        
        req.write(postData);
        req.end();
        
        return deferred.promise; 
    }
};