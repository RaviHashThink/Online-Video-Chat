const express = require('express')
var bodyParser = require("body-parser");
var cors = require('cors');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const { OAuth2Client } = require('google-auth-library');

const credentials = {
    "clientId": "289986527913-o00am2r4utm1uib0ob4o7odoinlo2mjo.apps.googleusercontent.com"
}
const client = new OAuth2Client(credentials.clientId);

let users = new Map();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"))

io.on('connection', function (socket) {
    console.log('a user connected');
    console.log(socket);
    socket.on('NewClient', function (msg) {
        console.log('message: ' + msg);
    });
    socket.on('disconnect', function (data) {
        console.log('user disconnected' + JSON.stringify(data));
    });
    io.emit('chat-members', [...users.values()]);
});

app.post('/login', async (req, res) => {

    const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: credentials.clientId
    });

    const payload = ticket.getPayload();
    const userId = payload['sub'];

    users.set(userId, {
        id: payload['sub'],
        name: payload['name'],
        picture: payload['picture'],
        status: "online",
        socketId: req.body.socketId
    })

    io.emit('chat-members', [...users.values()]);

    console.log(users);

    return res.send({
        success: true,
        userId: payload['sub']
    });
});

app.post('/logout', async (req, res) => {

    const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: credentials.clientId
    });

    const payload = ticket.getPayload();
    users.delete(payload['sub'])
    io.emit('chat-members', [...users.values()]);

    return res.send({
        success: true
    });
});

app.post('/chat-request', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: credentials.clientId
    });

    const payload = ticket.getPayload();
    let remoteUser = users.get(req.body.userId);
    //if (remoteUser.status == "online") {
    if (req.body.type == "requesting") {
        io.to(remoteUser.socketId).emit('chat-request', { userId: payload['sub'], peerId: req.body.peerId, sdp: req.body.sdp });
    }
    if (req.body.type == "accepted") {
        io.to(remoteUser.socketId).emit('chat-accepted', { userId: payload['sub'], peerId: req.body.peerId });
    }
    remoteUser.status = "busy";
    io.emit('chat-members', [...users.values()]);
    return res.send({
        success: true
    });
    /*  } else {
          return res.send({
              success: false
          });
      }*/
});

app.post('/end-chat', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: credentials.clientId
    });

    const payload = ticket.getPayload();
    let remoteUser = users.get(req.body.userId);
    remoteUser.status = "online";

    let remote2User = users.get(payload['sub']);
    remoteUser.status = "online";

    let socId = users.get(req.body.userId).socketId;
    io.to(socId).emit('end-chat', { userId: payload['sub'] });

    io.emit('chat-members', [...users.values()]);

    return res.send({
        success: true
    });
});

http.listen(8080, function () {
    console.log('listening on *:3000');
});