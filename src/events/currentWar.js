import * as ClashofClansAPI from '../../src/services/clashofclansAPI.js';
import * as Database from '../../src/services/database.js';
import { writeConsoleANDLog } from '../write.js';
const WAR_ENDED = 'warEnded';

async function getWarEnded(db, clan) {
  try {
    let currentWar = await ClashofClansAPI.getClanCurrentWar(clan);
    if (currentWar.state !== WAR_ENDED) return;

    let clanData = await Database.getSingleRow(db, `SELECT * FROM ClanData WHERE tag = '${clan}'`);
    return currentWar.opponent.tag !== clanData.lastWar ? currentWar : null;
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}

async function addNewAttack(db, playerClan, lastAttack) {
  try {
    let playerAttacks = playerClan.warAttacks.split(' ');
    for (let i = 0; i < 4; i++) {
      lastAttack += ` ${playerAttacks[i]}`;
    }
    await Database.runCommand(db, `UPDATE PlayerClanData SET warAttacks = '${lastAttack}' WHERE clan = '${playerClan.clan}' AND player = '${playerClan.player}'`);
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}

async function warPlayersUpdate(db, warEnded) {
  let warPlayers = warEnded.clan.members;
  try {
    for (const warPlayer of warPlayers) {
      let stars = 0;
      if (warPlayer.attacks) for (const attack of warPlayer.attacks) stars += attack.stars;

      let playerClan = await Database.getSingleRow(db, `SELECT * FROM PlayerClanData WHERE clan = '${warEnded.clan.tag}' AND player = '${warPlayer.tag}'`);
      let lastAttack = warPlayer.attacks ? `${warPlayer.attacks.length}[${stars}]` : '0[0]';
      await addNewAttack(db, playerClan, lastAttack);
    }
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}

async function otherPlayersUpdate(db, warEnded) {
  try {
    let warPlayers = warEnded.clan.members;
    let playersClan = await Database.getMultipleRow(db, `SELECT * FROM PlayerClanData WHERE clan = '${warEnded.clan.tag}'`);
    let notWarPlayers = playersClan.filter((playerClan) => !warPlayers.map((player) => player.tag).includes(playerClan.player));
    for (const notWarPlayer of notWarPlayers) {
      await addNewAttack(db, notWarPlayer, '-');
    }
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}

export async function currentWar() {
  try {
    setInterval(async () => {
      const db = await Database.openConnection();
      let connections = await Database.getMultipleRow(db, `SELECT * FROM GuildConnections`);
      for (const connection of connections) {
        let warEnded = await getWarEnded(db, connection.clan);
        if (!warEnded) continue;

        await warPlayersUpdate(db, warEnded);
        await otherPlayersUpdate(db, warEnded);

        await Database.runCommand(db, `UPDATE ClanData SET lastWar = '${warEnded.opponent.tag}' WHERE tag = '${connection.clan}'`);
      }
      await Database.closeConnection(db);
    }, 5 * 60_000);
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}
