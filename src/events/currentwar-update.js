import * as ClashofClansAPI from '../services/clashofclans.js';
import * as Database from '../services/database.js';
import { writeConsoleANDLog } from '../../utils/write.js';
const WAR_ENDED = 'warEnded';

async function getWarEnded(db, clan) {
  try {
    let currentWar = await ClashofClansAPI.getClanCurrentWar(clan);
    if (currentWar.state !== WAR_ENDED) return;

    let clanData = await Database.executeQuery(db, `SELECT * FROM Clans WHERE tag = '${clan}'`);
    return currentWar.opponent.tag !== clanData.LastWar ? currentWar : null;
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}

async function addNewAttack(db, playerClan, lastAttack) {
  try {
    let playerAttacks = playerClan.WarAttacks.split(' ');
    for (let i = 0; i < 4; i++) {
      lastAttack += ` ${playerAttacks[i]}`;
    }
    await Database.executeQuery(db, `UPDATE PlayersClans SET warAttacks = '${lastAttack}' WHERE clan = '${playerClan.clan}' AND player = '${playerClan.player}'`);
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

      let playerClan = (await Database.executeQuery(db, `SELECT * FROM PlayersClans WHERE clan = '${warEnded.clan.tag}' AND player = '${warPlayer.tag}'`))[0];
      if (!playerClan) continue;
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
    let playersClan = await Database.executeQuery(db, `SELECT * FROM PlayersClans WHERE clan = '${warEnded.clan.tag}'`);
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
      const connection = await Database.beginTransaction();
      let updateClans = await Database.executeQuery(connection, `SELECT * FROM UpdateClans`);
      for (const clan of updateClans) {
        let warEnded = await getWarEnded(connection, clan.Clan);
        if (!warEnded) continue;

        await warPlayersUpdate(connection, warEnded);
        await otherPlayersUpdate(connection, warEnded);

        await Database.executeQuery(connection, `UPDATE Clans SET lastWar = '${warEnded.opponent.tag}' WHERE tag = '${clan.Clan}'`);
      }
      await Database.commitTransaction(connection);
    }, 1 * 20_000);
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}
