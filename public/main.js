var Peer = require('simple-peer');
var peer;
var initPeer;

var isInitPeer = false;

var socket = io();

var localPeerId;
var localInitPeerId;
var remotePeerId;
var localStream;
var remoteStream;
var id_token;
var users = [];

const destvideo = document.getElementById('destvideo')
const currentvideo = document.getElementById('currentvideo')

function connectPeer(userId) {
    var rmtPeerUser = users.filter(function (item) {
        return item.id == userId;
    })
    if (rmtPeerUser && rmtPeerUser.length > 0) {
        remotePeerId = rmtPeerUser[0].peerId;
        peer.signal(JSON.parse(remotePeerId));
        document.getElementById("chatPane").style.display = "block";
        document.getElementById("userListPane").style.display = "none";
        var auth2 = gapi.auth2.getAuthInstance();
        $.post("http://localhost:4200/chat-request", { idToken: id_token, userId: rmtPeerUser[0].id },
            function (returnedData) {
                if (returnedData.success) {
                    console.log("Sent....")
                } else {
                    alert(returnedData.error.message)
                }
            }).fail(function (response) {
                alert('Error: ' + JSON.parse(response.responseText).error.message);
            });
    }
}

function sendMsg(msg) {
    if (isInitPeer) {
        initPeer.send(msg)
    } else {
        peer.send(msg)
    }

}

socket.on('chat-members', function (usersList) {
    const myNode = document.getElementById("userListPane");
    myNode.innerHTML = '';
    users = usersList;
    usersList.forEach(usr => {
        myNode.innerHTML += '<div class="col"><div class="card mt-4" style = "width: 18rem;"><img class="card-img-top" src ="' + usr.picture + '" alt = "Card image cap" ><div class="card-body"><h5 class="card-title">' + usr.name + ' <span class="dot-green"></span></h5><label>Status : Online</label><label>Online Since : Online</label></div><div class="card-body"><button type="button" class="btn btn-success btn-lg btn-block" onClick="setDestUserId(\'' + usr.id + '\')">Chat</button></div ></div ></div >';
    });
});

socket.on('chat-request', function (userId) {
    console.log("request user id : " + userId)
    var rmtPeerUser = users.filter(function (item) {
        return item.id == userId;
    })
    if (rmtPeerUser && rmtPeerUser.length > 0) {
        alert(rmtPeerUser[0].name + " wants to chat with you.")
        initPeer.signal(JSON.parse(rmtPeerUser[0].initPeerId));
        isInitPeer = true;
        document.getElementById("chatPane").style.display = "block";
        document.getElementById("userListPane").style.display = "none";
    }
});

function onInitLoad() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function (stream) {
            thisPeerStream = stream;
            currentvideo.srcObject = stream;
            currentvideo.play()
            localStream = stream;
            peer = new Peer({ initiator: false, trickle: false, stream: stream });
            peer.on('signal', function (data) {
                console.log(data)
                localPeerId = data;
            })
            peer.on('data', function (data) {
                $('#messages').append($('<li>').text(JSON.stringify(data)));
            })

            peer.on('connect', () => {
                console.log('CONNECT INIT')
            })
            peer.on('stream', function (stream) {
                destvideo.srcObject = stream;
                destvideo.play();
            })

            initPeer = new Peer({ initiator: true, trickle: false, stream: stream });
            initPeer.on('signal', function (data) {
                console.log(data)
                localInitPeerId = data;
                // document.getElementById("signinBtn").style.display = "block";
                //$('#banner').append('<div class="g-signin2 mr-3" data-onsuccess="onSignIn" id="signinBtn"></div>')
            })
            initPeer.on('data', function (data) {
                $('#messages').append($('<li>').text(JSON.stringify(data)));
            })

            initPeer.on('connect', () => {
                console.log('CONNECT')
            })
            initPeer.on('stream', function (stream) {
                destvideo.srcObject = stream;
                destvideo.play();
            })

        }).catch(err => console.log(err))
}



var interval = setInterval(checkIdTokenCookie, 3000);

function checkIdTokenCookie() {
    var ckies = getCookie("id_token")
    if (ckies) {
        id_token = ckies;
        clearInterval(interval);
        delete_cookie("id_token")
        $.post("http://localhost:4200/login", { idToken: id_token, peerId: JSON.stringify(localPeerId), initPeerId: JSON.stringify(localInitPeerId), socketId: socket.id },
            function (returnedData) {
                if (returnedData.success) {
                    console.log(returnedData);
                    document.getElementById("signinBtn").style.display = "none";
                    document.getElementById("signoutBtn").style.display = "block";
                } else {
                    alert(returnedData.error.message)
                }
            }).fail(function (response) {
                alert('Error: ' + JSON.parse(response.responseText).error.message);
            });
    }
}

var delete_cookie = function (name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

var interval2 = setInterval(checkDestUserCookie, 3000);

function checkDestUserCookie() {
    var ckies = getCookie("destUserId")
    if (ckies) {
        clearInterval(interval2);
        connectPeer(ckies);
        delete_cookie("destUserId")
    }
}


function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    $.post("http://localhost:4200/logout", { idToken: id_token },
        function (returnedData) {
            if (returnedData.success) {
                auth2.signOut().then(function () {
                    document.getElementById("signinBtn").style.display = "block";
                    document.getElementById("signoutBtn").style.display = "none";
                });
            } else {
                alert(returnedData.error.message)
            }
        }).fail(function (response) {
            alert('Error: ' + JSON.parse(response.responseText).error.message);
        });
}

document.getElementById("signoutBtn").style.display = "none";
document.getElementById("chatPane").style.display = "none";
document.getElementById("sendMsg").addEventListener("click", sendMsg, false);
document.getElementById("signoutBtn").addEventListener("click", signOut, false);

onInitLoad();