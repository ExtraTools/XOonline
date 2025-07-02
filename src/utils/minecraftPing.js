import net from 'net';
import dns from 'dns/promises';

// Minecraft server ping protocol implementation
export async function pingMinecraftServer(host, port = 25565, timeout = 5000) {
    try {
        // Resolve hostname to IP if needed
        let address = host;
        try {
            const addresses = await dns.resolve4(host);
            if (addresses.length > 0) {
                address = addresses[0];
            }
        } catch (error) {
            // If DNS resolution fails, try using the host as-is
        }
        
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            let dataBuffer = Buffer.alloc(0);
            let pingStart = Date.now();
            
            client.setTimeout(timeout);
            
            client.on('connect', () => {
                // Send handshake packet
                const handshakePacket = createHandshakePacket(host, port);
                client.write(handshakePacket);
                
                // Send status request packet
                const statusPacket = Buffer.from([0x01, 0x00]);
                client.write(statusPacket);
            });
            
            client.on('data', (data) => {
                dataBuffer = Buffer.concat([dataBuffer, data]);
                
                // Try to parse the response
                try {
                    const response = parseServerResponse(dataBuffer);
                    if (response) {
                        const latency = Date.now() - pingStart;
                        client.destroy();
                        
                        resolve({
                            online: true,
                            players: response.players,
                            version: response.version,
                            description: response.description,
                            favicon: response.favicon,
                            latency
                        });
                    }
                } catch (error) {
                    // Continue receiving data
                }
            });
            
            client.on('timeout', () => {
                client.destroy();
                reject(new Error('Connection timeout'));
            });
            
            client.on('error', (error) => {
                client.destroy();
                reject(error);
            });
            
            client.connect(port, address);
        });
        
    } catch (error) {
        throw new Error(`Failed to ping server: ${error.message}`);
    }
}

// Create handshake packet for Minecraft protocol
function createHandshakePacket(host, port) {
    const protocolVersion = 760; // Minecraft 1.19.2 protocol
    const nextState = 1; // Status request
    
    const hostBuffer = Buffer.from(host, 'utf8');
    const packet = Buffer.alloc(1024);
    let offset = 0;
    
    // Packet ID (0x00 for handshake)
    packet.writeUInt8(0x00, offset++);
    
    // Protocol version (VarInt)
    offset += writeVarInt(packet, offset, protocolVersion);
    
    // Server address (String)
    offset += writeVarInt(packet, offset, hostBuffer.length);
    hostBuffer.copy(packet, offset);
    offset += hostBuffer.length;
    
    // Server port (Unsigned Short)
    packet.writeUInt16BE(port, offset);
    offset += 2;
    
    // Next state (VarInt)
    offset += writeVarInt(packet, offset, nextState);
    
    // Create final packet with length prefix
    const finalPacket = Buffer.alloc(offset + 5);
    const packetLength = offset;
    const lengthSize = writeVarInt(finalPacket, 0, packetLength);
    packet.copy(finalPacket, lengthSize, 0, offset);
    
    return finalPacket.slice(0, lengthSize + offset);
}

// Parse server response
function parseServerResponse(buffer) {
    try {
        let offset = 0;
        
        // Read packet length
        const { value: length, size: lengthSize } = readVarInt(buffer, offset);
        offset += lengthSize;
        
        if (buffer.length < offset + length) {
            return null; // Not enough data yet
        }
        
        // Read packet ID
        const { value: packetId, size: idSize } = readVarInt(buffer, offset);
        offset += idSize;
        
        if (packetId !== 0x00) {
            throw new Error('Invalid packet ID');
        }
        
        // Read JSON string length
        const { value: jsonLength, size: jsonLengthSize } = readVarInt(buffer, offset);
        offset += jsonLengthSize;
        
        // Read JSON string
        const jsonString = buffer.toString('utf8', offset, offset + jsonLength);
        const serverInfo = JSON.parse(jsonString);
        
        // Parse description (can be string or object)
        let description = '';
        if (typeof serverInfo.description === 'string') {
            description = serverInfo.description;
        } else if (serverInfo.description && serverInfo.description.text) {
            description = serverInfo.description.text;
        } else if (serverInfo.description && serverInfo.description.extra) {
            description = serverInfo.description.extra.map(e => e.text || '').join('');
        }
        
        return {
            version: {
                name: serverInfo.version.name,
                protocol: serverInfo.version.protocol
            },
            players: {
                max: serverInfo.players.max,
                online: serverInfo.players.online,
                sample: serverInfo.players.sample || []
            },
            description: description,
            favicon: serverInfo.favicon || null
        };
        
    } catch (error) {
        return null;
    }
}

// Write VarInt (Minecraft protocol)
function writeVarInt(buffer, offset, value) {
    let bytesWritten = 0;
    
    do {
        let temp = value & 0x7F;
        value >>>= 7;
        
        if (value !== 0) {
            temp |= 0x80;
        }
        
        buffer.writeUInt8(temp, offset + bytesWritten);
        bytesWritten++;
    } while (value !== 0);
    
    return bytesWritten;
}

// Read VarInt (Minecraft protocol)
function readVarInt(buffer, offset) {
    let value = 0;
    let size = 0;
    let byte;
    
    do {
        if (offset + size >= buffer.length) {
            throw new Error('VarInt too big');
        }
        
        byte = buffer.readUInt8(offset + size);
        value |= (byte & 0x7F) << (7 * size);
        size++;
        
        if (size > 5) {
            throw new Error('VarInt too big');
        }
    } while ((byte & 0x80) !== 0);
    
    return { value, size };
}

// Legacy ping for older servers
export async function legacyPing(host, port = 25565, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let pingStart = Date.now();
        
        client.setTimeout(timeout);
        
        client.on('connect', () => {
            // Send legacy ping packet
            client.write(Buffer.from([0xFE, 0x01]));
        });
        
        client.on('data', (data) => {
            const latency = Date.now() - pingStart;
            client.destroy();
            
            // Parse legacy response
            if (data[0] === 0xFF) {
                const responseString = data.toString('utf16le', 3);
                const parts = responseString.split('\0');
                
                if (parts.length >= 6) {
                    resolve({
                        online: true,
                        version: {
                            name: parts[2],
                            protocol: parseInt(parts[1])
                        },
                        players: {
                            online: parseInt(parts[4]),
                            max: parseInt(parts[5])
                        },
                        description: parts[3],
                        latency
                    });
                }
            }
            
            reject(new Error('Invalid legacy response'));
        });
        
        client.on('timeout', () => {
            client.destroy();
            reject(new Error('Connection timeout'));
        });
        
        client.on('error', (error) => {
            client.destroy();
            reject(error);
        });
        
        client.connect(port, host);
    });
}