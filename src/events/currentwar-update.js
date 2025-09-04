import * as ClashofClansAPI from '../services/clashofclans.js';
import * as Database from '../services/database.js';

import * as COCAPI from '../../utils/constants.js';
const TIME_CURRENTWAR_UPDATE = 5 * 60_000;
const WAR_ENDED = 'warEnded';

async function getWarEnded(conn, clanTag) {
  const currentWar = await ClashofClansAPI.getClanCurrentWar(clanTag);
  if (!currentWar) return;
  if (currentWar.state !== WAR_ENDED) return;

  const clan = await Database.Select(conn, COCAPI.CLANS, `Tag = '${clanTag}'`);
  return currentWar.opponent.tag !== clan.LastWar ? currentWar : null;
}

async function addNewAttack(conn, playerClan, lastAttack) {
  const playerAttacks = playerClan.WarAttacks.split(' ');
  for (let i = 0; i < 4; i++) lastAttack += ` ${playerAttacks[i]}`;
  await Database.Update(conn, COCAPI.PLAYERSCLANS, `WarAttacks = '${lastAttack}'`, `Clan = '${playerClan.Clan}' AND Player = '${playerClan.Player}'`);
}

async function playersWarUpdate(conn, warEnded) {
  const playersWar = warEnded.clan.members;
  for (const playerWar of playersWar) {
    let stars = 0;
    if (playerWar.attacks) for (const attack of playerWar.attacks) stars += attack.stars;

    const playerClan = (await Database.Select(conn, COCAPI.PLAYERSCLANS, `Clan = '${warEnded.clan.tag}' AND Player = '${playerWar.tag}'`))[0];
    if (!playerClan) continue;
    const lastAttack = playerWar.attacks ? `${playerWar.attacks.length}[${stars}]` : '0[0]';
    await addNewAttack(conn, playerClan, lastAttack);
  }
}

async function otherPlayersUpdate(conn, warEnded) {
  const playersWar = warEnded.clan.members;
  const playersClan = await Database.Select(conn, COCAPI.PLAYERSCLANS, `Clan = '${warEnded.clan.tag}'`);
  const playersClanOut = playersClan.filter((playerClan) => !playersWar.map((playerWar) => playerWar.tag).includes(playerClan.Player));
  for (const playerClanOut of playersClanOut) await addNewAttack(conn, playerClanOut, '-');
}

export async function currentWarUpdate() {
  setInterval(async () => {
    let conn;
    try {
      conn = await Database.getConnection();
      const clans = await Database.Select(conn, COCAPI.UPDATECLANS);
      for (const clan of clans) {
        const warEnded = await getWarEnded(conn, clan.Clan);
        if (!warEnded) continue;

        await playersWarUpdate(conn, warEnded);
        await otherPlayersUpdate(conn, warEnded);
        await Database.Update(conn, COCAPI.CLANS, `LastWar = '${warEnded.opponent.tag}'`, `Tag = '${clan.Clan}'`);
      }
    } catch (error) {
      console.log(error);
    } finally {
      await Database.releaseConnection(conn);
    }
  }, TIME_CURRENTWAR_UPDATE);
}
