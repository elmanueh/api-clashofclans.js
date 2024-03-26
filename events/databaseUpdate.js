import * as ClashofClansAPI from '../../src/services/clashofclansAPI.js';
import * as Database from '../../src/services/database.js';
import { writeConsoleANDLog } from '../write.js';
import { DatabaseError, SQLITE_CONSTRAINT_FOREIGNKEY, SQLITE_CONSTRAINT_UNIQUE } from '../errorCreate.js';

async function getPlayersClanData(clan) {
  try {
    let playersClan = await ClashofClansAPI.getClanPlayers(clan);
    playersClan = playersClan.map((player) => ClashofClansAPI.getPlayer(player.tag));
    return await Promise.all(playersClan);
  } catch (error) {
    await writeConsoleANDLog(error);
    await new Promise((resolve) => setTimeout(resolve, 2 * 60_000));
    return await getPlayersClanData(clan);
  }
}

async function playersClanUpdate(db, playersClan, playersDatabase) {
  try {
    await Database.runCommand(db, 'BEGIN');
    for (const playerClan of playersClan) {
      const lootCapitalT = playerClan.achievements.filter((achievement) => achievement.name === 'Aggressive Capitalism')[0];
      const addCapitalT = playerClan.achievements.filter((achievement) => achievement.name === 'Most Valuable Clanmate')[0];
      const clanGamesT = playerClan.achievements.filter((achievement) => achievement.name === 'Games Champion')[0];
      let playerDatabase = playersDatabase.filter((player) => player.tag === playerClan.tag);
      try {
        await Database.runCommand(db, `INSERT INTO PlayerClanData (clan, player, role) VALUES ('${playerClan.clan.tag}', '${playerClan.tag}', '${playerClan.role}')`);
      } catch (error) {
        if (error instanceof DatabaseError) {
          if (error.code === SQLITE_CONSTRAINT_FOREIGNKEY) {
            // player dont exists
            await Database.runCommand(
              db,
              ` INSERT INTO PlayerData (tag, name, townHall, warPreference, lootCapitalT, addCapitalT, clanGamesT)
                                                VALUES ('${playerClan.tag}', '${playerClan.name}', '${playerClan.townHallLevel}', '${playerClan.warPreference}',
                                                        '${lootCapitalT.value}', '${addCapitalT.value}', '${clanGamesT.value}')`
            );
            await Database.runCommand(db, `INSERT INTO PlayerClanData (clan, player, role) VALUES ('${playerClan.clan.tag}', '${playerClan.tag}', '${playerClan.role}')`);
            continue;
          }

          if (error.code === SQLITE_CONSTRAINT_UNIQUE) {
            // player exists
            if (playerClan.role !== playerDatabase.role) {
              await Database.runCommand(db, `UPDATE PlayerClanData SET role = '${playerClan.role}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`);
            }
          }
        }
      }

      playerDatabase = await Database.getSingleRow(db, `SELECT * FROM PlayerData WHERE tag = '${playerClan.tag}'`);
      if (playerDatabase.name !== playerClan.name) {
        // name changed
        await Database.runCommand(db, `UPDATE PlayerData SET name = '${playerClan.name}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.townHall !== playerClan.townHallLevel) {
        // townHallLevel changed
        await Database.runCommand(db, `UPDATE PlayerData SET townHall = '${playerClan.townHallLevel}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.warPreference !== playerClan.warPreference) {
        // warPreference changed
        await Database.runCommand(db, `UPDATE PlayerData SET warPreference = '${playerClan.warPreference}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.lootCapitalT !== lootCapitalT.value) {
        // lootCapitalT changed
        const lootCapitalNew = lootCapitalT.value - playerDatabase.lootCapitalT;
        const lootCapitalOld = await Database.getSingleRow(db, `SELECT * FROM PlayerClanData WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`);
        await Database.runCommand(
          db,
          `UPDATE PlayerClanData SET lootCapital = '${lootCapitalNew + lootCapitalOld.lootCapital}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`
        );
        await Database.runCommand(db, `UPDATE PlayerData SET lootCapitalT = '${lootCapitalT.value}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.addCapitalT !== addCapitalT.value) {
        // addCapitalT changed
        const addCapitalNew = addCapitalT.value - playerDatabase.addCapitalT;
        const addCapitalOld = await Database.getSingleRow(db, `SELECT * FROM PlayerClanData WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`);
        await Database.runCommand(
          db,
          `UPDATE PlayerClanData SET addCapital = '${addCapitalNew + addCapitalOld.addCapital}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`
        );
        await Database.runCommand(db, `UPDATE PlayerData SET addCapitalT = '${addCapitalT.value}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.clanGamesT !== clanGamesT.value) {
        // clanGamesT changed
        const clanGamesNew = clanGamesT.value - playerDatabase.clanGamesT;
        const clanGamesOld = await Database.getSingleRow(db, `SELECT * FROM PlayerClanData WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`);
        await Database.runCommand(
          db,
          `UPDATE PlayerClanData SET clanGames = '${clanGamesNew + clanGamesOld.clanGames}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`
        );
        await Database.runCommand(db, `UPDATE PlayerData SET clanGamesT = '${clanGamesT.value}' WHERE tag = '${playerClan.tag}'`);
      }
    }
    await Database.runCommand(db, 'COMMIT');
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
  }
}

async function otherPlayersUpdate(db, playersClan, playersDatabase) {
  try {
    await Database.runCommand(db, 'BEGIN');
    let playersExternalDatabase = playersDatabase.filter((player) => !playersClan.map((player) => player.tag).includes(player.player));
    for (const playerExternalDatabase of playersExternalDatabase) {
      if (playerExternalDatabase.role === 'not_member') continue;
      await Database.runCommand(db, `UPDATE PlayerClanData SET role = 'not_member' WHERE clan = '${playerExternalDatabase.clan}' AND player = '${playerExternalDatabase.player}'`);
    }
    await Database.runCommand(db, 'COMMIT');
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
  }
}

export async function databaseUpdate() {
  try {
    setInterval(async () => {
      const db = await Database.openConnection();
      console.log('actualizado');
      let connections = await Database.getMultipleRow(db, `SELECT * FROM GuildConnections`);
      for (const connection of connections) {
        console.log(connection.clan);
        let playersDatabase = await Database.getMultipleRow(db, `SELECT * FROM PlayerClanData WHERE clan = '${connection.clan}'`);
        let playersClan = await getPlayersClanData(connection.clan);

        await playersClanUpdate(db, playersClan, playersDatabase);
        await otherPlayersUpdate(db, playersClan, playersDatabase);

        const date = new Date().toISOString().replace(/[-:]/g, '');
        await Database.runCommand(db, `UPDATE ClanData SET lastUpdate = '${date}' WHERE tag = '${connection.clan}'`);
      }
      await Database.closeConnection(db);
    }, 2 * 60_000);
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}
