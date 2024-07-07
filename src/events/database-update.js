import * as ClashofClansAPI from '../services/clashofclans.js';
import * as Database from '../services/database.js';

import * as COCAPI from '../../utils/constants.js';
import { MYSQL_CONSTRAINT_FOREIGNKEY } from '../../utils/error-handler.js';
const TIME_DATABASE_UPDATE = 2 * 60_000;

async function getPlayersClanData(clan) {
  let playersClan = await ClashofClansAPI.getClanPlayers(clan);
  playersClan = playersClan.map((player) => ClashofClansAPI.getPlayer(player.tag));
  return await Promise.all(playersClan);
}

async function playersClanUpdate(conn, playersApi, playersClan) {
  for (const playerApi of playersApi) {
    const playerClan = playersClan.filter((playerClan) => playerClan.Player === playerApi.tag)[0];
    if (!playerClan) {
      try {
        await Database.Insert(conn, COCAPI.PLAYERSCLANS, 'Clan, Player', `'${playerApi.clan.tag}', '${playerApi.tag}'`);
      } catch (error) {
        if (error.errno === MYSQL_CONSTRAINT_FOREIGNKEY) {
          await Database.Insert(conn, COCAPI.PLAYERS, 'Tag', `'${playerApi.tag}'`);
          await Database.Insert(conn, COCAPI.PLAYERSCLANS, 'Clan, Player', `'${playerApi.clan.tag}', '${playerApi.tag}'`);
        }
      }
      continue;
    }

    const lootCapitalT = playerApi.achievements.filter((achievement) => achievement.name === 'Aggressive Capitalism')[0];
    const addCapitalT = playerApi.achievements.filter((achievement) => achievement.name === 'Most Valuable Clanmate')[0];
    const clanGamesT = playerApi.achievements.filter((achievement) => achievement.name === 'Games Champion')[0];
    const player = (await Database.Select(conn, COCAPI.PLAYERS, `Tag = '${playerApi.tag}'`))[0];

    if (playerClan.Role !== playerApi.role) {
      await Database.Update(conn, COCAPI.PLAYERSCLANS, `Role = '${playerApi.role}'`, `Clan = '${playerApi.clan.tag}' AND Player = '${playerApi.tag}'`);
    }

    if (player.Name !== playerApi.name) {
      await Database.Update(conn, COCAPI.PLAYERS, `Name = '${playerApi.name}'`, `Tag = '${playerApi.tag}'`);
    }

    if (player.TownHall !== playerApi.townHallLevel) {
      await Database.Update(conn, COCAPI.PLAYERS, `TownHall = '${playerApi.townHallLevel}'`, `Tag = '${playerApi.tag}'`);
    }

    if (player.WarPreference !== playerApi.warPreference) {
      await Database.Update(conn, COCAPI.PLAYERS, `WarPreference = '${playerApi.warPreference}'`, `Tag = '${playerApi.tag}'`);
    }

    if (player.LootCapitalT !== lootCapitalT.value) {
      const lootCapitalNew = lootCapitalT.value - player.LootCapitalT;
      await Database.Update(
        conn,
        COCAPI.PLAYERSCLANS,
        `LootCapital = '${playerClan.LootCapital + lootCapitalNew}'`,
        `Clan = '${playerApi.clan.tag}' AND Player = '${playerApi.tag}'`
      );
      await Database.Update(conn, COCAPI.PLAYERS, `LootCapitalT = '${lootCapitalT.value}'`, `Tag = '${playerApi.tag}'`);
    }

    if (player.AddCapitalT !== addCapitalT.value) {
      const addCapitalNew = addCapitalT.value - player.AddCapitalT;
      await Database.Update(conn, COCAPI.PLAYERSCLANS, `AddCapital = '${playerClan.AddCapital + addCapitalNew}'`, `Clan = '${playerApi.clan.tag}' AND Player = '${playerApi.tag}'`);
      await Database.Update(conn, COCAPI.PLAYERS, `AddCapitalT = '${addCapitalT.value}'`, `Tag = '${playerApi.tag}'`);
    }

    if (player.ClanGamesT !== clanGamesT.value) {
      const clanGamesNew = clanGamesT.value - player.ClanGamesT;
      await Database.Update(conn, COCAPI.PLAYERSCLANS, `ClanGames = '${playerClan.ClanGames + clanGamesNew}'`, `Clan = '${playerApi.clan.tag}' AND Player = '${playerApi.tag}'`);
      await Database.Update(conn, COCAPI.PLAYERS, `ClanGamesT = '${clanGamesT.value}'`, `Tag = '${playerApi.tag}'`);
    }
  }
}

async function otherPlayersUpdate(conn, playersApi, playersClan) {
  const playersClanOut = playersClan.filter((playerClan) => !playersApi.map((playerApi) => playerApi.tag).includes(playerClan.Player));
  for (const playerClanOut of playersClanOut) {
    if (playerClanOut.Role === 'not_member') continue;
    await Database.Update(conn, COCAPI.PLAYERSCLANS, 'Role = "not_member"', `Clan = '${playerClanOut.Clan}' AND Player = '${playerClanOut.Player}'`);
  }
}

function formatDateToMySQL() {
  const date = new Date();
  const pad = (number) => String(number).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function databaseUpdate() {
  setInterval(async () => {
    let conn;
    try {
      conn = await Database.getConnection();
      const clans = await Database.Select(conn, COCAPI.UPDATECLANS);
      for (const clan of clans) {
        const playersClan = await Database.Select(conn, COCAPI.PLAYERSCLANS, `Clan = '${clan.Clan}'`);
        const playersApi = await getPlayersClanData(clan.Clan);

        await playersClanUpdate(conn, playersApi, playersClan);
        await otherPlayersUpdate(conn, playersApi, playersClan);
        await Database.Update(conn, COCAPI.CLANS, `lastUpdate = '${formatDateToMySQL()}'`, `tag = '${clan.Clan}'`);
      }
    } catch (error) {
      console.log(error);
    } finally {
      await Database.releaseConnection(conn);
    }
  }, TIME_DATABASE_UPDATE);
}
