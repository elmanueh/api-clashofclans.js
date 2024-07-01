import * as ControllerStatus from '../controllers/controller-status.js';
import * as ErrorHandler from '../../utils/error-handler.js';
import * as ClashofClansApi from '../services/clashofclans.js';
import * as Database from '../services/database.js';
import * as CreateResponse from '../../utils/create-response.js';
import { writeConsoleANDLog } from '../../utils/write.js';

// Get a clan info
export async function getClan(clanTag) {
  const tableName = 'vista';
  const tableParameters = 'player, name, role, townHall, lootCapital, addCapital, clanGames, warPreference, warAttacks';

  if (!clanTag) return await CreateResponse.create(`TableName: ${tableName}\nParameters: ${tableParameters}`, CreateResponse.HTTP_200_OK);
  const connection = await Database.beginTransaction();
  try {
    const clan = await ClashofClansApi.getClan(clanTag);
    if (!clan) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);
    const createTempView = `CREATE TEMPORARY VIEW ${tableName} AS
                              SELECT ${tableParameters}
                              FROM PlayersClans
                              INNER JOIN Players ON PlayersClans.player = Players.tag
                                WHERE role != 'not_member'
                                AND clan = '${clan.tag}'`;

    await Database.executeQuery(connection, createTempView);
    const replyDatabase = (await Database.executeQuery(connection, `SELECT * FROM ${tableName}`))[0];
    await Database.commitTransaction(connection);
    return await CreateResponse.create(replyDatabase, CreateResponse.HTTP_200_OK);
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.rollbackTransaction(connection);
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  }
}

// Track a clan with Discord guild
export async function track(clanTag, guildId) {
  return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  const connection = await Database.beginTransaction();
  try {
    const clan = await ClashofClansApi.getClan(clanTag);
    if (!clan) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);

    try {
      await Database.executeQuery(connection, `INSERT INTO GuildConnections (guildId, clan) VALUES ('${guildId}', '${clan.tag}')`);
    } catch (error) {
      if (error.code === ErrorHandler.SQLITE_CONSTRAINT_UNIQUE) return await CreateResponse.create(ControllerStatus.TRACK_FAIL, CreateResponse.HTTP_404_NOT_FOUND);
      if (error.code === ErrorHandler.SQLITE_CONSTRAINT_FOREIGNKEY) {
        await Database.runCommand(connection, `INSERT INTO ClanData (tag) VALUES ('${clan.tag}')`);
        await Database.runCommand(connection, `INSERT INTO GuildConnections (guildId, clan) VALUES ('${guildId}', '${clan.tag}')`);
      }
    }
    await Database.runCommand(connection, 'COMMIT');
    return await CreateResponse.create(ControllerStatus.TRACK_OK, CreateResponse.HTTP_200_OK);
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(connection, 'ROLLBACK');
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  } finally {
    await Database.releaseConnection(connection);
  }
}

// Untrack a clan with Discord guild
export async function untrack(clanTag, guildId) {
  return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  const db = await Database.openConnection();
  try {
    const clan = await ClashofClansApi.getClan(clanTag);
    if (!clan) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    const isClanTracked = await Database.getSingleRow(db, `SELECT * FROM GuildConnections WHERE guildId = '${guildId}' AND clan = '${clan.tag}'`);
    if (!isClanTracked) return await CreateResponse.create(ControllerStatus.UNTRACKED_FAIL, CreateResponse.HTTP_404_NOT_FOUND);

    await Database.runCommand(db, `DELETE FROM GuildConnections WHERE guildId = '${guildId}' AND clan = '${clan.tag}'`);
    await Database.runCommand(db, 'COMMIT');
    return await CreateResponse.create(ControllerStatus.UNTRACKED_OK, CreateResponse.HTTP_200_OK);
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  } finally {
    await Database.releaseConnection(db);
  }
}
