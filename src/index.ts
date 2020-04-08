import { Server } from "./server";

const server = new Server();

server.listen(port => {
  console.log(`Server is listening on https://teste-webrtc.herokuapp.com:${port}`);
});
