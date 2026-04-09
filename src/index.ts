import { GameRoomDO } from './GameRoomDO';

export { GameRoomDO };

interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (url.pathname === '/ws') {
      return handleWebSocket(request, env);
    }

    // For all other requests, try to serve from assets first
    // If not found in assets, the assets fetcher will handle it
    return env.ASSETS.fetch(request);
  }
};

async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const roomName = url.searchParams.get('roomName');

  // If no roomName, we need to create one from the first connection
  // For simplicity, we'll use a default room name or expect the client to provide one
  if (!roomName) {
    // Generate a random room name for initial connection
    // The client will need to create/join a room after connecting
    const defaultRoom = 'lobby_' + Date.now();
    const id = env.GAME_ROOM.idFromName(defaultRoom);
    const stub = env.GAME_ROOM.get(id);
    return stub.fetch(request);
  }

  // Get the Durable Object for this room
  const id = env.GAME_ROOM.idFromName(roomName);
  const stub = env.GAME_ROOM.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(request);
}