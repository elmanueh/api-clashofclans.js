import * as ClashofClansAPI from '../services/clashofclans.js';
import * as Database from '../services/database.js';
import { writeConsoleANDLog } from '../../utils/write.js';
import { DatabaseError, SQLITE_CONSTRAINT_FOREIGNKEY, SQLITE_CONSTRAINT_UNIQUE, MYSQL_CONSTRAINT_FOREIGNKEY, MYSQL_CONSTRAINT_UNIQUE } from '../../utils/error-handler.js';

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

async function playersClanUpdate(connection, playersClan, playersDatabase) {
  try {
    for (const playerClan of playersClan) {
      const lootCapitalT = playerClan.achievements.filter((achievement) => achievement.name === 'Aggressive Capitalism')[0];
      const addCapitalT = playerClan.achievements.filter((achievement) => achievement.name === 'Most Valuable Clanmate')[0];
      const clanGamesT = playerClan.achievements.filter((achievement) => achievement.name === 'Games Champion')[0];
      let playerDatabase = playersDatabase.filter((player) => player.tag === playerClan.tag);
      try {
        await Database.executeQuery(connection, `INSERT INTO PlayersClans (clan, player, role) VALUES ('${playerClan.clan.tag}', '${playerClan.tag}', '${playerClan.role}')`);
      } catch (error) {
        if (error.errno === MYSQL_CONSTRAINT_FOREIGNKEY) {
          // player dont exists
          await Database.executeQuery(
            connection,
            ` INSERT INTO Players (tag, name, townHall, warPreference, lootCapitalT, addCapitalT, clanGamesT)
                                                VALUES ('${playerClan.tag}', '${playerClan.name}', '${playerClan.townHallLevel}', '${playerClan.warPreference}',
                                                        '${lootCapitalT.value}', '${addCapitalT.value}', '${clanGamesT.value}')`
          );
          await Database.executeQuery(connection, `INSERT INTO PlayersClans (clan, player, role) VALUES ('${playerClan.clan.tag}', '${playerClan.tag}', '${playerClan.role}')`);
          continue;
        }
        if (error.errno === MYSQL_CONSTRAINT_UNIQUE) {
          // player exists
          if (playerClan.role !== playerDatabase.role) {
            await Database.executeQuery(connection, `UPDATE PlayersClans SET role = '${playerClan.role}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`);
          }
        }
      }

      playerDatabase = await Database.executeQuery(connection, `SELECT * FROM Players WHERE tag = '${playerClan.tag}'`);
      playerDatabase = playerDatabase[0];
      if (playerDatabase.name !== playerClan.name) {
        // name changed
        await Database.executeQuery(connection, `UPDATE Players SET name = '${playerClan.name}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.townHall !== playerClan.townHallLevel) {
        // townHallLevel changed
        await Database.executeQuery(connection, `UPDATE Players SET townHall = '${playerClan.townHallLevel}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.warPreference !== playerClan.warPreference) {
        // warPreference changed
        await Database.executeQuery(connection, `UPDATE Players SET warPreference = '${playerClan.warPreference}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.LootCapitalT !== lootCapitalT.value) {
        // lootCapitalT changed
        const lootCapitalNew = lootCapitalT.value - playerDatabase.LootCapitalT;
        const lootCapitalOld = (await Database.executeQuery(connection, `SELECT * FROM PlayersClans WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`))[0];
        await Database.executeQuery(
          connection,
          `UPDATE PlayersClans SET lootCapital = '${lootCapitalNew + lootCapitalOld.LootCapital}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`
        );
        await Database.executeQuery(connection, `UPDATE Players SET lootCapitalT = '${lootCapitalT.value}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.AddCapitalT !== addCapitalT.value) {
        // addCapitalT changed
        const addCapitalNew = addCapitalT.value - playerDatabase.AddCapitalT;
        const addCapitalOld = (await Database.executeQuery(connection, `SELECT * FROM PlayersClans WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`))[0];
        await Database.executeQuery(
          connection,
          `UPDATE PlayersClans SET addCapital = '${addCapitalNew + addCapitalOld.AddCapital}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`
        );
        await Database.executeQuery(connection, `UPDATE Players SET addCapitalT = '${addCapitalT.value}' WHERE tag = '${playerClan.tag}'`);
      }

      if (playerDatabase.ClanGamesT !== clanGamesT.value) {
        // clanGamesT changed
        const clanGamesNew = clanGamesT.value - playerDatabase.ClanGamesT;
        const clanGamesOld = (await Database.executeQuery(connection, `SELECT * FROM PlayersClans WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`))[0];
        await Database.executeQuery(
          connection,
          `UPDATE PlayersClans SET clanGames = '${clanGamesNew + clanGamesOld.ClanGames}' WHERE clan = '${playerClan.clan.tag}' AND player = '${playerClan.tag}'`
        );
        await Database.executeQuery(connection, `UPDATE Players SET clanGamesT = '${clanGamesT.value}' WHERE tag = '${playerClan.tag}'`);
      }
    }
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.rollbackTransaction(connection);
  }
}

async function otherPlayersUpdate(connection, playersClan, playersDatabase) {
  try {
    let playersExternalDatabase = playersDatabase.filter((player) => !playersClan.map((player) => player.tag).includes(player.player));
    for (const playerExternalDatabase of playersExternalDatabase) {
      if (playerExternalDatabase.role === 'not_member') continue;
      await Database.executeQuery(
        connection,
        `UPDATE PlayersClans SET role = 'not_member' WHERE clan = '${playerExternalDatabase.clan}' AND player = '${playerExternalDatabase.player}'`
      );
    }
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.rollbackTransaction(connection);
  }
}

function formatDateToMySQL() {
  const date = new Date();
  const pad = (number) => (number < 10 ? '0' + number : number);

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Los meses son 0-indexados
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function databaseUpdate() {
  try {
    setInterval(async () => {
      const connection = await Database.beginTransaction();
      let updateClans = await Database.executeQuery(connection, 'SELECT * FROM UpdateClans');
      for (const clan of updateClans) {
        let playersDatabase = await Database.executeQuery(connection, `SELECT * FROM PlayersClans WHERE clan = '${clan.Clan}'`);
        let playersClan = await getPlayersClanData(clan.Clan);

        await playersClanUpdate(connection, playersClan, playersDatabase);
        await otherPlayersUpdate(connection, playersClan, playersDatabase);

        try {
          await Database.executeQuery(connection, `UPDATE Clans SET lastUpdate = '${formatDateToMySQL()}' WHERE tag = '${clan.Clan}'`);
        } catch (error) {
          console.log(error);
        }
      }
      await Database.commitTransaction(connection);
    }, 1 * 20_000);
  } catch (error) {
    await writeConsoleANDLog(error);
  }
}
