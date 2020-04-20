const sleep = m => new Promise(r => setTimeout(r, m));
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const room = urlParams.get('room');

if (queryString == "" || room == "") {
    window.open("404.html","_self")
}

let isAlreadyCalling = false;
let getCalled = false;
let localStream;
let isRecording = false;
let isUsingCamera = false;

const existingCalls = [];

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection();

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
        localStream = stream;
        localVideo.srcObject = stream;
    }

    isUsingCamera = true;
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
}, (err) => {
    console.log("Câmera: " + err);
    document.getElementById("local-video-nao-disponivel").style.display = "block";
    
    navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
        const localVideo = document.getElementById("local-video");
        if (localVideo) {
            localStream = stream;
            localVideo.srcObject = stream;
        }
        
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    
    }, (err) => {
        console.error("Microfone: " + err);
        document.getElementById("div-video").style.display = "none";
        document.getElementById("div-erro-input").style.display = "block";
    });
});

function unselectUsersFromList() {
    const alreadySelectedUser = document.querySelectorAll(
        ".active-user.active-user--selected"
    );

    alreadySelectedUser.forEach(el => {
        el.setAttribute("class", "active-user");
    });
}

function createUserItemContainer(socketId) {
    const userContainerEl = document.createElement("div");

    const usernameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");
    userContainerEl.setAttribute("id", socketId);
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener("click", () => {
        unselectUsersFromList();
        userContainerEl.setAttribute("class", "active-user active-user--selected");
        const talkingWithInfo = document.getElementById("talking-with-info");
        talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
        callUser(socketId);
    });

    return userContainerEl;
}

async function callUser(socketId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
        offer,
        to: socketId
    });
}

function updateUserList(socketIds) {
    const activeUserContainer = document.getElementById("active-user-container");

    socketIds.forEach(socketId => {
        const alreadyExistingUser = document.getElementById(socketId);
        if (!alreadyExistingUser) {
            const userContainerEl = createUserItemContainer(socketId);

            activeUserContainer.appendChild(userContainerEl);
        }
    });
}

//const socket = io.connect("http://192.168.1.59:3000"); //Local
const socket = io.connect("http://54.232.229.218:3000"); //Procução

socket.on("connect", function () {
    socket.emit("update-user-map", {
        socketId: socket.id,
        userType: usuario,
        roomId: room
    });
});

socket.on("decrypt", async data => {
    console.log("decrypt");
    console.log(data.info);
})

socket.on("make-call", async data => {
    console.log("call");
    await sleep(3000);
    callUser(data.socketId);
});

socket.on("update-user-list", ({ users }) => {
    updateUserList(users);
});

socket.on("remove-user", ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
        elToRemove.remove();
    }
});

socket.on("call-made", async data => {
    // if (getCalled) {
    //   const confirmed = confirm(
    //     `User "Socket: ${data.socket}" wants to call you. Do accept this call?`
    //   );

    //   if (!confirmed) {
    //     socket.emit("reject-call", {
    //       from: data.socket
    //     });

    //     return;
    //   }
    // }

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    socket.emit("make-answer", {
        answer,
        to: data.socket,
        camera: isUsingCamera
    });
    getCalled = true;

    // let recorder = RecordRTC(localStram, {
    //   type: 'video'
    // });
    // recorder.startRecording();

    // //await sleep(1200000);
    // await sleep(10000);

    // recorder.stopRecording(function () {
    //   let blob = recorder.getBlob();
    //   invokeSaveAsDialog(blob);
    // });
});

socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    );

    if (!isAlreadyCalling) {
         callUser(data.socket);
         isAlreadyCalling = true;
    }

    if (!data.camera) {
        document.getElementById("remote-video-nao-disponivel").style.display = "block";
    }
});

socket.on("call-rejected", data => {
    alert(`User: "Socket: ${data.socket}" rejected your call.`);
    unselectUsersFromList();
});

socket.on("message-received", data => {

});

peerConnection.ontrack = function ({ streams: [stream] }) {
    if (usuario == "MEDICO") {
        //recordCall(stream);
    }

    const remoteVideo = document.getElementById("remote-video");
    if (remoteVideo) {
        document.getElementById("aguardando-conexao").style.display = "none";
        remoteVideo.srcObject = stream;
    }
};

// navigator.mediaDevices.getUserMedia(
//   { video: true, audio: true },
//   async stream => {
//     const localVideo = document.getElementById("local-video");
//     if (localVideo) {
//       localVideo.srcObject = stream;
//     }

//     stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
//   },
//   error => {
//     console.warn(error.message);
//   }
// );

async function recordCall(remoteStream) {
    if (!isRecording) {
        isRecording = true;

        const video2Minutes = RecordRTC([localStream, remoteStream], {
            type: 'video',
            disableLogs: false,
        });

        const audio2Minutes = RecordRTC([localStream, remoteStream], {
            type: 'audio',
            disableLogs: false
        });

        const video20Minutes = RecordRTC(streams, {
            type: 'video',
            disableLogs: false,
        });

        const audio20Minutes = RecordRTC(streams, {
            type: 'audio',
            disableLogs: false,
            mimeType: 'audio/wav'
        });
        
        video2Minutes.startRecording();
        audio2Minutes.startRecording();
        
        const sleep = m => new Promise(r => setTimeout(r, m));
        //await sleep(3600000); // 1 hora
        //await sleep(1200000); // 20 minutos
        await sleep(120000); // 2 minutos
        //await sleep(60000); // 1 minuto
        
        video2Minutes.stopRecording(function () {
            let blob = video2Minutes.getBlob();
            console.log("############## VÍDEO DE 2 MINUTOS ##############");
            invokeSaveAsDialog(blob);
        });

        audio2Minutes.stopRecording(function () {
            let blob = audio2Minutes.getBlob();
            console.log("############## AUDIO DE 2 MINUTOS ##############");
            invokeSaveAsDialog(blob);
        });

        //________________________________________________________________________________________________________________________
        video20Minutes.startRecording();
        audio20Minutes.startRecording();
        
        //await sleep(3600000); // 1 hora
        await sleep(1200000); // 20 minutos
        //await sleep(120000); // 2 minutos
        //await sleep(10000); // 10 segundos
        
        video20Minutes.stopRecording(function () {
            let blob = video20Minutes.getBlob();
            console.log("############## VÍDEO DE 20 MINUTOS ##############");
            invokeSaveAsDialog(blob);
        });

        audio20Minutes.stopRecording(function () {
            let blob = audio20Minutes.getBlob();
            console.log("############## AUDIO DE 20 MINUTOS ##############");
            invokeSaveAsDialog(blob);
        });
    }
}