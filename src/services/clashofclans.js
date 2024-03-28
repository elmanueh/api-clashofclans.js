import * as AxiosAdapter from './axios.js';
import { ClashOfClansError, HTTP_404_NOT_FOUND } from '../../utils/error-handler.js';

// Starting module
const LINK_API = 'https://api.clashofclans.com/v1';
const MAX_LIMIT_REQUEST = 30;
let requestCount = 0;
setInterval(() => {
  requestCount = 0;
}, 1000);

// Add a new request to the API
async function requestCountAPI() {
  while (requestCount >= MAX_LIMIT_REQUEST) await new Promise((resolve) => setTimeout(resolve, 1000));
  requestCount++;
}

// Get player info
export async function getPlayer(playerTag) {
  const uri = `${LINK_API}/players/${encodeURIComponent(playerTag)}`;
  try {
    await requestCountAPI();
    const player = await AxiosAdapter.requestApiGet(uri);
    return player;
  } catch (error) {
    error = new ClashOfClansError(error);
    if (error.errno === HTTP_404_NOT_FOUND) return;
    throw error;
  }
}

// Get clan info
export async function getClan(clanTag) {
  const uri = `${LINK_API}/clans/${encodeURIComponent(clanTag)}`;
  try {
    await requestCountAPI();
    const clan = await AxiosAdapter.requestApiGet(uri);
    return clan;
  } catch (error) {
    error = new ClashOfClansError(error);
    if (error.errno === HTTP_404_NOT_FOUND) return;
    throw error;
  }
}

// Verify player account with his token
export async function verifyPlayerToken(playerTag, playerToken) {
  const uri = `${LINK_API}/players/${encodeURIComponent(playerTag)}/verifytoken`;
  const data = { token: `${playerToken}` };
  try {
    await requestCountAPI();
    const tokenInfo = await AxiosAdapter.requestApiPost(uri, data);
    return tokenInfo.status === 'ok' ? true : false;
  } catch (error) {
    throw new ClashOfClansError(error);
  }
}

// Get clan players
export async function getClanPlayers(clan) {
  const uri = `${LINK_API}/clans/${encodeURIComponent(clan)}/members`;
  try {
    await requestCountAPI();
    const players = await AxiosAdapter.requestApiGet(uri);
    return players.items;
  } catch (error) {
    throw new ClashOfClansError(error);
  }
}

// Get currentWar for clan
export async function getClanCurrentWar(clan) {
  const uri = `${LINK_API}/clans/${encodeURIComponent(clan)}/currentwar`;
  try {
    await requestCountAPI();
    const currentWar = await AxiosAdapter.requestApiGet(uri);
    return currentWar;
  } catch (error) {
    throw new ClashOfClansError(error);
  }
}
