import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import path from "path";
import * as fs from 'fs';

export class Server {
    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;

    private activeSockets: string[] = [];

    private socketId: string = '';

    private readonly DEFAULT_PORT = 3000;

    private mapPaciente = new Map();
    private mapMedico = new Map();

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = socketIO(this.httpServer);

        this.configureApp();
        this.configureRoutes();
        this.handleSocketConnection();
    }

    private configureApp(): void {
        this.app.use(express.static(path.join(__dirname, "../public")));
    }

    private configureRoutes(): void {
        this.app.get("/pteleconsulta", async (req, res) => {
            fs.readFile('public/index.html', (err, html) => {
                res.send(html.toString().replace("USUARIO_LOGADO", 'PACIENTE'));
            });
        });

        this.app.get("/mteleconsulta", async (req, res) => {
            fs.readFile('public/index.html', (err, html) => {
                res.send(html.toString().replace("USUARIO_LOGADO", 'MEDICO'));
            });
        });

        this.app.get('*', function (req, res) {
            fs.readFile('public/404.html', (err, html) => {
                res.send(html.toString());
            });
        });
    }

    private handleSocketConnection(): void {
        this.io.on("connection", socket => {
            if (this.socketId == '') {
                this.socketId = socket.id;
            }

            // socket.on("connect-room", (data: any) => {
            //   console.log(socket.id);
            //   console.log(this.mapRooms);
            //   if (!this.mapRooms.get(data.room_id)) {
            //     this.mapRooms.set(data.room_id, socket.id);
            //   } else {
            //     socket.broadcast.emit("update-user-list", {
            //       socket: [socket.id]
            //     });
            //     socket.to(this.mapRooms.get(data.room_id)).emit("make-call", {
            //       socket: socket.id
            //     });
            //   }
            // });

            // const existingSocket = this.activeSockets.find(
            //   existingSocket => existingSocket === socket.id
            // );

            // if (!existingSocket) {
            //   this.activeSockets.push(socket.id);

            //   socket.emit("update-user-list", {
            //     users: this.activeSockets.filter(
            //       existingSocket => existingSocket !== socket.id
            //     )
            //   });

            socket.broadcast.emit("update-user-list", {
                users: [socket.id]
            });
            // }

            socket.on("update-user-map", data => {
                const bytes = AES.decrypt(data.roomId.replace(/·/g, "+").replace(/s1L2a3S4h/gm, "/"), "telemedicinaMedPlus");
                const originalText = bytes.toString(Utf8);

                socket.emit('decrypt', {
                    info: originalText
                });

                console.log("SALA: " + data.roomId);
                if (data.userType == "MEDICO") {

                    this.mapMedico.set(data.roomId, data.socketId);

                    //buscar se paciente já está on-line
                    //se tiver conecta
                    console.log("medico: " + data.socketId);
                    console.log("paciente: " + this.mapPaciente.get(data.roomId));

                    if (this.mapPaciente.get(data.roomId)) {
                        socket.to(this.mapPaciente.get(data.roomId)).emit("make-call", {
                            socketId: data.socketId
                        });
                    }
                    // ------>  
                    //se não, adiciona médico na lista de espera
                } else {

                    this.mapPaciente.set(data.roomId, data.socketId);

                    //buscar se médico já está on-line
                    //se tiver conecta
                    console.log("paciente: " + data.socketId);
                    console.log("medico: " + this.mapMedico.get(data.roomId));
                    
                    if (this.mapMedico.get(data.roomId)) {
                        socket.to(this.mapMedico.get(data.roomId)).emit("make-call", {
                            socketId: data.socketId
                        });
                    }
                    // ------> 
                    //se não, adiciona paciente na lista de espera
                }
            });

            socket.on("call-user", (data: any) => {
                socket.to(data.to).emit("call-made", {
                    offer: data.offer,
                    socket: socket.id
                });
            });

            socket.on("make-answer", data => {
                socket.to(data.to).emit("answer-made", {
                    socket: socket.id,
                    answer: data.answer,
                    camera: data.camera
                });
            });

            socket.on("reject-call", data => {
                socket.to(data.from).emit("call-rejected", {
                    socket: socket.id
                });
            });

            socket.on("disconnect", () => {
                this.activeSockets = this.activeSockets.filter(
                    existingSocket => existingSocket !== socket.id
                );
                socket.broadcast.emit("remove-user", {
                    socketId: socket.id
                });
            });
        });
    }

    public listen(callback: (port: number) => void): void {
        this.httpServer.listen(this.DEFAULT_PORT, () => {
            callback(this.DEFAULT_PORT);
        });
    }
}
