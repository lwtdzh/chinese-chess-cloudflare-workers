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

  // If roomName is provided, route to that specific room's Durable Object
  // If no roomName, use a shared "lobby" Durable Object
  // The lobby DO will handle room creation and routing

  const targetRoom = roomName || 'lobby_main';
  const id = env.GAME_ROOM.idFromName(targetRoom);
  const stub = env.GAME_ROOM.get(id);

  // Forward the request to the Durable Object
  return stub.fetch(request);
}