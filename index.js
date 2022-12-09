const mainServerUrl = "https://busy-teal-whale.cyclic.app";

import createBareServer from "@tomphttp/bare-server-node";
import express from "express";
import { createServer } from "node:http";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { Server } from "socket.io"; 
import fetch from 'node-fetch';
import webIconScraper from 'web-icon-scraper';
import getTitleAtUrl from 'get-title-at-url';

const bare = createBareServer("/bare/");
const app = express();

app.use(express.static("./public"));
app.use("/uv/", express.static(uvPath));

const server = createServer();
const io = new Server(server);

io.on("connection", (socket) => {
  var body = {};
  socket.on("login", async (data) => {
    const response = await fetch(mainServerUrl + '/verify', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
    const reply = await response.text();
    socket.emit("loginReply", reply);
    if (reply.startsWith("valid")) body = data;
  });
  socket.on("signup", async (data) => {
    fetch(mainServerUrl + '/signup', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
  });
  socket.on("getfavicon", async data => {
    try {
      if (data.startsWith("http"))
        webIconScraper({
          url: data.split("/")[0] + "//" + data.split("/")[2],
          sort: 'des',
          limit: 1,
          checkStatus: true,
          followRedirectsCount: 10
        }).then(output => {
          socket.emit("favicon", [data, output["icons"][0]["link"]]);
        });
      } catch {}
  });
  socket.on("getwebdata", async data => {
    try {
      if (data.startsWith("http"))
        webIconScraper({
          url: data,
          sort: 'des',
          limit: 1,
          checkStatus: true,
          followRedirectsCount: 10
        }).then(async output => {
          const { title } = await getTitleAtUrl(data);
          socket.emit("webdata", [output["icons"][0]["link"], title]);
        });
      } catch {}
  });
  socket.on("bookmarks", async (data) => {
    const response = await fetch(mainServerUrl + '/getbookmarks', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
    const reply = await response.text();
    socket.emit("bookmarks", reply.split(" "));
  });
  socket.on("checkbookmark", async (data) => {
    const response = await fetch(mainServerUrl + '/getbookmarked', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
    const reply = await response.text();
    socket.emit("bookmarked", reply);
  })
  socket.on("bookmark", (data) => {
    fetch(mainServerUrl + '/bookmark', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
    setTimeout(async () => {
      const response = await fetch(mainServerUrl + '/getbookmarks', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
      const reply = await response.text();
    socket.emit("bookmarks", reply.split(" "));
    }, 250);
  });
  socket.on("admingetusers", async (data) => {
    const response = await fetch(mainServerUrl + '/admin/getusers', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
    const reply = await response.text();
    socket.emit("adminusers", reply.split(" "));
  });
  socket.on("admingetpass", async (data) => {
    const response = await fetch(mainServerUrl + '/admin/getpass', {method: 'POST', body: JSON.stringify(data), headers: {'Content-Type': 'application/json'}});
    const reply = await response.text();
    socket.emit("adminuserpass", [data["user"], reply]);
  });
  socket.on("admin", (data) => {
    fetch(mainServerUrl + '/admin/' + data[0], {method: 'POST', body: JSON.stringify(data[1]), headers: {'Content-Type': 'application/json'}});
  })
  socket.on("disconnect", () => {
    if (Object.keys(body).length != 0) fetch(mainServerUrl + '/disconnect', {method: 'POST', body: JSON.stringify(body), headers: {'Content-Type': 'application/json'}});
  })
});

server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else if (!req.url.includes("socket")) {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8000;

server.on("listening", () => {
  const address = server.address();

  console.log(
    `Listening on http://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

setInterval(() => {
  if (new Date().getHours() == 15) io.emit("exit", "poof");
}, 300000);

if (new Date().getHours() < 15 && new Date().getHours() > 7) server.listen(port);
else process.exit(0);