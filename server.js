const express = require('express')
var bodyParser = require("body-parser");
var cors = require('cors');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var PeerServer = require('peer').PeerServer;
const { OAuth2Client } = require('google-auth-library');

const credentials = {
    "clientId": "YOUR_OAUTH_CLIENTID"
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
        console.log('user disconnected' + data);
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
        peerId: req.body.peerId,
        initPeerId: req.body.initPeerId,
        socketId: req.body.socketId
    })

    io.emit('chat-members', [...users.values()]);

    console.log(users);

    return res.send({
        success: true
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
    let socId = users.get(req.body.userId).socketId;
    io.to(socId).emit('chat-request', payload['sub']);

    console.log(users);

    return res.send({
        success: true
    });
});

http.listen(4200, function () {
    console.log('listening on *:3000');
});

var pserver = PeerServer({
    port: 9000,
    path: '/peerjs'
});