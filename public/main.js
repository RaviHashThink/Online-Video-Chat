var Peer = require('simple-peer');
var peer;
var socket = io();

var id_token;
var localStream;
const remotevideo = document.getElementById('remotevideo')
const localvideo = document.getElementById('localvideo')
var remoteUserId = "";
var remoteUser = "";
var localUserId = "";
var connectionEstablished = false;
var chatrequestSent = false;
var chatrequestaccept = false;
var chatUsers;

function connectPeer(userId) {
    if (!chatrequestSent) {
        chatrequestSent = true;
        if (localUserId != remoteUserId) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(function (stream) {
                    localvideo.srcObject = stream;
                    localvideo.play()
                    localStream = stream;
                    remoteUserId = userId;
                    for (var i = 0; i < chatUsers.length; i++) {
                        if (chatUsers[i].id == remoteUserId) {
                            remoteUser = chatUsers[i];
                        }
                    }
                    peer = new Peer({
                        initiator: true, stream: stream, trickle: true,
                    });
                    peer.on('signal', function (data) {
                        console.log("ON SIGNAL")
                        $.post("/chat-request", { idToken: id_token, userId: userId, peerId: JSON.stringify(data), type: "requesting" },
                            function (returnedData) {
                                if (returnedData.success) {
                                    console.log("Chat request sent to " + userId)
                                    document.getElementById("chatPane").style.display = "block";
                                    document.getElementById("userListPane").style.display = "none";
                                } else {
                                    alert(returnedData.error.message)
                                }
                            }).fail(function (response) {
                                alert('Error: ' + JSON.parse(response.responseText).error.message);
                            });
                    })

                    peer.on('data', function (data) {
                        console.log("ON DATA")
                        $('#messages').append('<li class="list-group-item"><img src="' + remoteUser.picture + '" class="rounded-circle" width="40px" alt="Cinque Terre"> ' + (new TextDecoder("utf-8").decode(data)) + '</li>');
                    })

                    peer.on('connect', () => {
                        console.log('ON CONNECT')
                        connectionEstablished = true;
                        peer.addStream(localStream);
                    })

                    peer.on('stream', function (stream) {
                        console.log("ON STREAM")
                        remotevideo.srcObject = stream;
                        remotevideo.play();
                    })

                    peer.on('close', function () {
                        console.log("ON CLOSE");
                        if (connectionEstablished) {
                            endChat();
                        }
                    })
                }).catch(function (err) {
                    alert("You must accept the video permission to chat")
                })
        } else {
            alert("You can not chat with yourself")
        }
    }
}

function sendMsg() {
    var msg = document.getElementById('m').value;
    if (connectionEstablished) {
        if (msg.length) {
            peer.send(msg);
            document.getElementById('m').value = "";
            $('#messages').append('<li class="list-group-item text-right">You: ' + msg + '</li>');
        } else {
            alert("Type something")
        }

    } else {
        alert("Please wait connection establishing...")
    }
}

socket.on('chat-members', function (usersList) {
    const myNode = document.getElementById("userListPane");
    myNode.innerHTML = '';
    chatUsers = usersList;
    usersList.forEach(usr => {
        myNode.innerHTML += '<div class="col"><div class="card mt-4" style = "width: 18rem;"><img class="card-img-top" src ="' + usr.picture + '" alt = "Card image cap" ><div class="card-body"><h5 class="card-title">' + usr.name + ' <span class="' + (usr.status == 'online' ? 'dot-green' : 'dot-red') + '"></span></h5><label>Status : Online</label><label>Online Since : Online</label></div><div class="card-body"><button type="button" class="btn btn-success btn-lg btn-block" onClick="setDestUserId(\'' + usr.id + '\')">Chat</button></div ></div ></div >';
    });
});

socket.on('chat-request', function (peerdata) {
    if (!chatrequestaccept) {
        chatrequestaccept = true;
        for (var i = 0; i < chatUsers.length; i++) {
            if (chatUsers[i].id == peerdata.userId) {
                remoteUser = chatUsers[i];
            }
        }
        console.log("request from user id : " + peerdata.userId)
        alert("You have chat request from " + remoteUser.name)
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(function (stream) {
                localvideo.srcObject = stream;
                localvideo.play()
                localStream = stream;
                remoteUserId = peerdata.userId;
                peer = new Peer({
                    initiator: false, stream: localStream, trickle: true
                });
                peer.on('signal', function (data) {
                    console.log("ON SIGNAL")
                    $.post("/chat-request", {
                        idToken: id_token, userId: peerdata.userId, peerId: JSON.stringify(data), type: "accepted"
                    },
                        function (returnedData) {
                            if (returnedData.success) {
                                console.log("Chat accept sent to " + peerdata.userId)
                                document.getElementById("chatPane").style.display = "block";
                                document.getElementById("userListPane").style.display = "none";
                            } else {
                                alert(returnedData.error.message)
                            }
                        }).fail(function (response) {
                            alert('Error: ' + JSON.parse(response.responseText).error.message);
                        });
                })

                peer.on('data', function (data) {
                    console.log("ON DATA")
                    $('#messages').append('<li class="list-group-item"><img src="' + remoteUser.picture + '" class="rounded-circle" width="40px" alt="Cinque Terre"> ' + (new TextDecoder("utf-8").decode(data)) + '</li>');
                })

                peer.on('connect', () => {
                    console.log('ON CONNECT')
                    connectionEstablished = true;
                    peer.addStream(localStream);
                })

                peer.on('stream', function (stream) {
                    console.log("ON STREAM")
                    remotevideo.srcObject = stream;
                    remotevideo.play();
                })

                peer.on('close', function () {
                    console.log("ON CLOSE");
                    if (connectionEstablished) {
                        endChat();
                    }
                })

                peer.signal(peerdata.peerId)
            }).catch(function (err) {
                alert("You must accept the video permission to chat")
            })
    }
});

socket.on('chat-accepted', function (peerdata) {
    peer.signal(peerdata.peerId);
});

socket.onclose = function (event) {
    alert("You connection has issue. Please refresh page and start again")
};

socket.on('end-chat', function (data) {
    if (data.userId == remoteUserId) {
        console.log("Chat ended with userId : " + remoteUserId)
        document.getElementById("chatPane").style.display = "none";
        document.getElementById("userListPane").style.display = "block";
        localStream.getTracks().forEach(track => track.stop())
        connectionEstablished = false;
        remoteUserId = ""
        peer.destroy()
    }
});

function endChat() {
    $.post("/end-chat", {
        idToken: id_token, userId: remoteUserId,
    },
        function (returnedData) {
            if (returnedData.success) {
                console.log("Chat ended with userId : " + remoteUserId)
                document.getElementById("chatPane").style.display = "none";
                document.getElementById("userListPane").style.display = "block";
                localStream.getTracks().forEach(track => track.stop())
                connectionEstablished = false;
                remoteUserId = ""
                peer.destroy()
            } else {
                alert(returnedData.error.message)
            }
        }).fail(function (response) {
            alert('Error: ' + JSON.parse(response.responseText).error.message);
        });
}

var interval = setInterval(checkIdTokenCookie, 2000);

function checkIdTokenCookie() {
    var ckies = getCookie("id_token")
    if (ckies) {
        id_token = ckies;
        clearInterval(interval);
        delete_cookie("id_token")
        $.post("/login", { idToken: id_token, socketId: socket.id },
            function (returnedData) {
                if (returnedData.success) {
                    localUserId = returnedData.userId;
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

var interval2 = setInterval(checkDestUserCookie, 2000);

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
    $.post("/logout", { idToken: id_token },
        function (returnedData) {
            if (returnedData.success) {
                auth2.signOut().then(function () {
                    document.getElementById("signinBtn").style.display = "block";
                    document.getElementById("signoutBtn").style.display = "none";
                    endChat();
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
document.getElementById("endChat").addEventListener("click", endChat, false);
