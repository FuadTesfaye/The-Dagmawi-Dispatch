/**
 * Convert a GramJS session string to a Telethon session string.
 * 
 * GramJS save format: '1' + base64( dcId(1) + addrLen(2BE) + addr(N) + port(2BE) + key(256) )
 * Telethon format:    '1' + base64( dcId(1) + ipv4(4)               + port(2BE) + key(256) )
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const gramjsSession = process.env.TELEGRAM_USERBOT_SESSION!;

// Strip the version prefix '1', then decode base64
const payload = Buffer.from(gramjsSession.slice(1), "base64");

let offset = 0;

// DC ID: 1 byte
const dcId = payload.readUInt8(offset);
offset += 1;

// Address length: 2 bytes big-endian
const addrLen = payload.readInt16BE(offset);
offset += 2;

// Address: addrLen bytes as UTF-8 string
const serverAddress = payload.subarray(offset, offset + addrLen).toString("utf-8");
offset += addrLen;

// Port: 2 bytes big-endian
const port = payload.readInt16BE(offset);
offset += 2;

// Auth key: remaining 256 bytes
const authKey = payload.subarray(offset, offset + 256);

console.log("=== GramJS Session Decoded ===");
console.log(`DC ID: ${dcId}`);
console.log(`Server: ${serverAddress}`);
console.log(`Port: ${port}`);
console.log(`Auth Key: ${authKey.length} bytes`);

// --- Build Telethon session string ---
// Telethon: '1' + base64url( dcId(1) + ipv4_packed(4) + port(2BE) + key(256) )
const ipParts = serverAddress.split(".").map(Number);
const ipPacked = Buffer.from(ipParts); // 4 bytes for IPv4

const portBuf = Buffer.alloc(2);
portBuf.writeUInt16BE(port, 0);

const telethonPayload = Buffer.concat([
  Buffer.from([dcId]),  // 1 byte
  ipPacked,              // 4 bytes
  portBuf,               // 2 bytes
  authKey,               // 256 bytes
]);

// Telethon uses base64url (WITH padding)
let b64 = telethonPayload.toString("base64url");
// Add padding
while (b64.length % 4 !== 0) b64 += "=";
const telethonSession = "1" + b64;

console.log(`\n=== Telethon Session String (${telethonSession.length} chars) ===`);
console.log(telethonSession);
