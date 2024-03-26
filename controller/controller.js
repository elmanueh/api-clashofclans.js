import * as ClashofClansAPI from '../services/clashofclansAPI.js';
import * as Database from '../services/database.js';
import * as ControllerStatus from './controller-status.js';
import * as ErrorCreate from '../utils/errorCreate.js';
import { writeConsoleANDLog } from './write.js';

export async function linkAccount(playerTag, playerToken, userId) {
  const db = await Database.openConnection();
  try {
    const playerClan = await ClashofClansAPI.getPlayer(playerTag);
    if (!playerClan) return ControllerStatus.TAG_INCORRECT;

    const tokenVerified = await ClashofClansAPI.verifyPlayerToken(playerTag, playerToken);
    if (!tokenVerified) return ControllerStatus.TOKEN_INCORRECT;

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    try {
      await Database.runCommand(db, `INSERT INTO UserConnections VALUES ('${userId}', '${playerClan.tag}')`);
    } catch (error) {
      switch (error.code) {
        case ErrorCreate.SQLITE_CONSTRAINT_UNIQUE:
          return ControllerStatus.LINK_ACCOUNT_FAIL;
        case ErrorCreate.SQLITE_CONSTRAINT_FOREIGNKEY:
          await Database.runCommand(db, `INSERT INTO PlayerData VALUES ('${playerClan.tag}', '${playerClan.name}', '${playerClan.townHallLevel}', '${playerClan.warPreference}')`);
          await Database.runCommand(db, `INSERT INTO UserConnections VALUES ('${userId}', '${playerClan.tag}')`);
        default:
          throw error;
      }
    }

    await Database.runCommand(db, 'COMMIT');
    return ControllerStatus.LINK_ACCOUNT_OK;
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    throw error;
  } finally {
    await Database.closeConnection(db);
  }
}

export async function untrackClan(clanTag, guildId) {
  const db = await Database.openConnection();
  try {
    const clan = await ClashofClansAPI.getClan(clanTag);
    if (!clan) return ControllerStatus.TAG_INCORRECT;

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    const isClanTracked = await Database.getSingleRow(db, `SELECT * FROM GuildConnections WHERE guildId = '${guildId}' AND clan = '${clan.tag}'`);
    if (!isClanTracked) return ControllerStatus.UNTRACKED_FAIL;

    await Database.runCommand(db, `DELETE FROM GuildConnections WHERE guildId = '${guildId}' AND clan = '${clan.tag}'`);
    await Database.runCommand(db, 'COMMIT');
    return ControllerStatus.UNTRACKED_OK;
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    throw error;
  } finally {
    await Database.closeConnection(db);
  }
}

export async function trackClan(clanTag, guildId) {
  const db = await Database.openConnection();
  try {
    const clan = await ClashofClansAPI.getClan(clanTag);
    if (!clan) return ControllerStatus.TAG_INCORRECT;

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    try {
      await Database.runCommand(db, `INSERT INTO GuildConnections (guildId, clan) VALUES ('${guildId}', '${clan.tag}')`);
    } catch (error) {
      switch (error.code) {
        case ErrorCreate.SQLITE_CONSTRAINT_UNIQUE:
          return ControllerStatus.TRACK_FAIL;
        case ErrorCreate.SQLITE_CONSTRAINT_FOREIGNKEY:
          await Database.runCommand(db, `INSERT INTO ClanData (tag) VALUES ('${clan.tag}')`);
          await Database.runCommand(db, `INSERT INTO GuildConnections (guildId, clan) VALUES ('${guildId}', '${clan.tag}')`);
      }
    }
    await Database.runCommand(db, 'COMMIT');
    return ControllerStatus.TRACK_OK;
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    throw error;
  } finally {
    await Database.closeConnection(db);
  }
}

export async function unlinkAccount(playerTag, userId) {
  const db = await Database.openConnection();
  try {
    const playerClan = await ClashofClansAPI.getPlayer(playerTag);
    if (!playerClan) return ControllerStatus.TAG_INCORRECT;

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    const isUserConnected = await Database.getSingleRow(db, `SELECT * FROM UserConnections WHERE discordId = '${userId}' AND player = '${playerClan.tag}'`);
    if (!isUserConnected) return ControllerStatus.UNLINK_ACCOUNT_FAIL;

    await Database.runCommand(db, `DELETE FROM UserConnections WHERE discordId = '${userId}' AND player = '${playerClan.tag}'`);
    await Database.runCommand(db, 'COMMIT');
    return ControllerStatus.UNLINK_ACCOUNT_OK;
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    throw error;
  } finally {
    await Database.closeConnection(db);
  }
}

export async function executeDB(queryDatabase) {
  const db = await Database.openConnection();
  try {
    await Database.runCommand(db, 'BEGIN EXCLUSIVE');
    await Database.runCommand(db, queryDatabase);
    return [ControllerStatus.EXECUTE_DB_OK, db];
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.closeConnection(db);
    return [ControllerStatus.EXECUTE_DB_FAIL];
  }
}

export async function executeDBOk(connection) {
  await Database.runCommand(connection, 'COMMIT');
  await Database.closeConnection(connection);
}

export async function executeDBCancel(connection) {
  await Database.runCommand(connection, 'ROLLBACK');
  await Database.closeConnection(connection);
}

async function checkQuery(queryDatabase) {
  queryDatabase = queryDatabase.toLowerCase();
  const allowedPattern = /^\s*select\b/i;
  return allowedPattern.test(queryDatabase) ? true : false;
}

export async function queryDatabase(queryDatabase) {
  const db = await Database.openConnection();
  try {
    const tableName = 'vista';
    const tableParameters = 'player, name, role, townHall, lootCapital, addCapital, clanGames, warPreference, warAttacks';

    if (!queryDatabase) return [ControllerStatus.QUERY_DB_INFO, `TableName: ${tableName}\nParameters: ${tableParameters}`];
    if (!(await checkQuery(queryDatabase))) return [ControllerStatus.QUERY_DB_FAIL, null];

    const queryDatabase2 = `CREATE TEMPORARY VIEW ${tableName} AS
                              SELECT ${tableParameters}
                              FROM PlayerClanData
                              INNER JOIN PlayerData ON PlayerClanData.player = PlayerData.tag
                              WHERE role != 'not_member'`;

    await Database.runCommand(db, 'BEGIN');
    await Database.runCommand(db, queryDatabase2);
    const replyDatabase = await Database.getMultipleRow(db, queryDatabase);
    await Database.runCommand(db, 'COMMIT');
    return [ControllerStatus.QUERY_DB_OK, replyDatabase];
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    throw error;
  } finally {
    await Database.closeConnection(db);
  }
}
