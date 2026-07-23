import { createInterface } from "node:readline";
import { WebSocket, WebSocketServer } from "ws";

const port = 6754;
const server = new WebSocketServer({ host: "127.0.0.1", port });

function broadcast(message) {
  let recipients = 0;
  for (const client of server.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      recipients += 1;
    }
  }
  console.log(`Sent to ${recipients} client(s): ${message}`);
}

server.on("listening", () => {
  console.log(`Fake exile-log-api listening on ws://127.0.0.1:${port}`);
  console.log(
    "Commands: area <id> [level], unknown, malformed, disconnect, quit",
  );
});
server.on("connection", () => console.log("Dashboard connected"));
server.on("error", (error) => {
  console.error(`Fake helper error: ${error.message}`);
});

const input = createInterface({
  input: process.stdin,
  output: process.stdout,
});

input.on("line", (line) => {
  const [command, areaId, level = "1"] = line.trim().split(/\s+/);
  switch (command) {
    case "area":
      if (!areaId || !/^\d+$/.test(level)) {
        console.log("Usage: area <area-id> [level]");
        break;
      }
      broadcast(`Generating level ${level} area "${areaId}"`);
      break;
    case "unknown":
      broadcast('Generating level 83 area "SanctumSecretRoom"');
      break;
    case "malformed":
      broadcast("not a recognised helper frame");
      break;
    case "disconnect":
      for (const client of server.clients) {
        client.close();
      }
      console.log("Disconnected all clients; they may reconnect immediately");
      break;
    case "quit":
      input.close();
      break;
    default:
      console.log(
        "Commands: area <id> [level], unknown, malformed, disconnect, quit",
      );
  }
});

input.on("close", () => {
  for (const client of server.clients) {
    client.terminate();
  }
  server.close(() => process.exit(0));
});
