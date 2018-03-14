const STAN = require('node-nats-streaming');
const Hapi = require('hapi');
const Nes = require('nes');
const Path = require('path');
const config = require('./config');

// NATS
// const uri = 'nats://nats-streaming-node-1:4222'; // inside HoneyC
const uri = 'http://localhost:4223';  // from Outside HoneyC
const stan = STAN.connect('test-cluster', 'test-websocket-server', uri);
const opts = stan.subscriptionOptions().setStartWithLastReceived();

const server = new Hapi.Server( {port : 9876} );

const start = async () => {
  await server.register(Nes);
  await server.subscription('/api/notification/{id}');
  await server.start();
  await console.log('Start Websocket Server');
}

  const notifications = {};

  server.route([
  {
    method: '*',
    path: '/{params*}',
    config: {
      handler: (request, reply) => {
        return "Hello Honeycomb Services";
      }
    }
  },
  {
    method: 'POST',
    path: '/api/notification/{id*}',
    config: {
      description: 'Message handler',
      handler: (request, h) => {
        console.log(request.params);
        const reqId = request.params.id ? request.params.id : 'public';
        const message = { message: request.payload.message, user: request.auth.credentials };
        notifications[reqId] ? notifications[reqId].messages.push(message) : notifications[reqId] = {messages: [message]};
        // publish to WS (websocket)
        console.log(reqId);
        server.publish(`/api/notification/${reqId}`, message);
        
        // Publish to NATS
            // Publisher 
            stan.publish(reqId, message, function(err, guid) {
              if(err) {
                console.log('publish failed: ' + err);
              } else {
                console.log('published message with guid: ' + guid);
              }
            });
        //

        return message;
      },
    }
  },
  {
    method: 'GET',
    path: '/api/notification/{id}', //'/api/notification/{id*}',
    config: {
      description: 'Get ws message history',
      handler: (request, h) => {
        const reqId = request.params.id ? request.params.id : 'public';
        const msgHistory = notifications[reqId] ? notifications[reqId].messages : [{message: 'Kraken Notifications HQ'}];
        console.log(msgHistory);

      // NATS GET ALL MESSAGES since last retrival
        var subscription = stan.subscribe(reqId, opts);
        subscription.on('message', function (msg) {
          console.log('Received a message [' + msg.getSequence() + '] ' + msg.getData());
          server.publish(`/api/notification/${reqId}`, msg.getSequence() + ': ' + msg.getData());
        });
      //


        return msgHistory;
      },
    }
  },
  {
    method: 'GET',
    path: '/logout',
    config: {
      handler: (request, h) => {
        return {logged: 'out'};
      }
    }
  }]);

  start();
  
process.on('SIGINT', () => {
  console.log('\nShutting down WS service...');
  server.stop({timeout: 4000}, (err) => {
    if (err) {
      console.log(`There was an error shutting down the service: ${err}`);
    } else {
      console.log('Service shutdown successfully.');
    }
    process.exit(0);
  })
})

