var http = require('http');
var https = require('https');
var querystring = require('querystring');

var allContactTypes = ['direct_message', 'direct_mention', 'mention'];

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit/lib/Botkit.js');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true,
    //logLevel: 2
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

controller.hears('cognitive test', ['ambient'], function(bot, message) {
   bot.reply(message, 'on it, boss');

   var responseData;
   var postData = querystring.stringify({
       'language' : 'en',
       'analyzerIds' : ['08ea174b-bfdb-4e64-987e-602f85da7f72'],
       'text' : 'Hi, Tom! How are you today?'
   });

   var options = {
       host: 'api.projectoxford.ai',

       method: 'POST',
       headers: {
           'Content-Type': 'application/json',
           'Cache-Control': 'no-cache',
            'Ocp-Apim-Subscription-Key': '02829fac842a458d9fa90242754c6721', //replace with process.env.MSCSToken
       }
   };

   var req = https.request(options, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
          responseData += chunk;
      });
      res.on('end', () => {
        bot.reply(message, responseData);
      })
   });

   req.on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
   });

   req.write(postData);
   req.end();
});

controller.hears(['that conference'], ['ambient'], function(bot, message) {
    bot.startConversation(message, function(err, convo) {
        if (!err) {
            var stop = {
                pattern: ['stop', 'no', 'OMG'],
                callback: function(response, convo) {
                    convo.say('well, you asked...');
                    convo.stop();
                }
            };

            var what = {
                pattern: ['what?', 'ummm...'],
                callback: function(response, convo) {
                    convo.repeat();
                    convo.next();
                }
            };

            convo.ask('which conference?', [
                {
                    pattern: ['that conference'],
                    callback: function(response, convo) {
                        convo.ask('this conference?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    convo.ask('yes conference?', [
                                        {
                                            pattern: 'no',
                                            callback: function(response, convo) {
                                                convo.say("well now I'm confused");
                                                convo.stop();
                                            }
                                        },
                                        stop,
                                        what
                                    ]);
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no, that conference',
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            },
                            stop,
                            what
                        ]);
                        convo.next();
                    }
                },
                stop,
                what
            ]);

            convo.on('end', function(convo) {
                if (convo.status == 'completed') {
                    bot.reply(message, 'OK! That Conference');
                } else {
                    // this happens if the conversation ended prematurely for some reason
                    bot.reply(message, 'yes, That Conference!');
                }
            });
        }
    });
});

controller.hears(['hello', 'hi', 'yo'], allContactTypes, function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
    });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention', function(bot, message) {

    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Your name is ' + user.name);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('I do not know your name yet!');
                    convo.ask('What should I call you?', function(response, convo) {
                        convo.ask('You want me to call you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'nickname'}); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                });
                            });



                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});

controller.hears(['about (.*)', 'tell me about (.*)', 'speaker (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var speakerName = message.match[1];
    bot.reply(message, 'OK! Let me look up: ' + speakerName );

    var options = {
        host: 'www.thatconference.com',
        port: 443,
        path: '/api3/Speakers/GetSpeakers?year=2016',
        method: 'GET'
    };

    var responseData = '';

    https.request(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            responseData += chunk;
        });

        res.on('end', () => {
            var found = false;
            var speakers = JSON.parse(responseData);
            for (var speaker of speakers) {

                // how can we make the response nicer.
                if (speaker.FirstName.toUpperCase() == speakerName.toUpperCase() || speaker.LastName.toUpperCase() == speakerName.toUpperCase() ){
                    found = true;
                    var reply_with_attachments = {
                        'username': speaker.FirstName + ' ' + speaker.LastName,
                        'text': speaker.WebSite,
                        'attachments': [
                        {
                            'fallback': speaker.Biography,
                            'title': speaker.Title + ' ' + speaker.Company,
                            'text': speaker.Biography,
                            'color': '#7CD197'
                        }
                        ],
                        'icon_url': 'http://thatconference.com' + speaker.HeadShot
                        }

                    bot.reply(message, reply_with_attachments);
                }
            }

            if ( !found ) {
              console.log('res end');
              bot.reply(message, "Well I can't seem to find " +  speakerName + ". Is that their full name?");
              found = false;
            }

        })

    }).end();
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
    'direct_message,direct_mention,mention', function(bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':robot_face: I am a bot named <@' + bot.identity.name +
             '>. I have been running for ' + uptime + ' on ' + hostname + '.');

});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}

/*
controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});
*/
