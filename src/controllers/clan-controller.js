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
  const db = await Database.openConnection();
  try {
    const clan = await ClashofClansApi.getClan(clanTag);
    if (!clan) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);
    const createTempView = `CREATE TEMPORARY VIEW ${tableName} AS
                              SELECT ${tableParameters}
                              FROM PlayerClanData
                              INNER JOIN PlayerData ON PlayerClanData.player = PlayerData.tag
                                WHERE role != 'not_member'`;

    await Database.runCommand(db, 'BEGIN');
    await Database.runCommand(db, createTempView);
    const replyDatabase = await Database.getMultipleRow(db, `SELECT * FROM ${tableName}`);
    await Database.runCommand(db, 'COMMIT');
    return await CreateResponse.create(replyDatabase, CreateResponse.HTTP_200_OK);
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  } finally {
    await Database.closeConnection(db);
  }
}

// Track a clan with Discord guild
export async function track(clanTag, guildId) {
  const db = await Database.openConnection();
  try {
    const clan = await ClashofClansApi.getClan(clanTag);
    if (!clan) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    try {
      await Database.runCommand(db, `INSERT INTO GuildConnections (guildId, clan) VALUES ('${guildId}', '${clan.tag}')`);
    } catch (error) {
      if (error.code === ErrorHandler.SQLITE_CONSTRAINT_UNIQUE) return await CreateResponse.create(ControllerStatus.TRACK_FAIL, CreateResponse.HTTP_404_NOT_FOUND);
      if (error.code === ErrorHandler.SQLITE_CONSTRAINT_FOREIGNKEY) {
        await Database.runCommand(db, `INSERT INTO ClanData (tag) VALUES ('${clan.tag}')`);
        await Database.runCommand(db, `INSERT INTO GuildConnections (guildId, clan) VALUES ('${guildId}', '${clan.tag}')`);
      }
    }
    await Database.runCommand(db, 'COMMIT');
    return await CreateResponse.create(ControllerStatus.TRACK_OK, CreateResponse.HTTP_200_OK);
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  } finally {
    await Database.closeConnection(db);
  }
}

// Untrack a clan with Discord guild
export async function untrack(clanTag, guildId) {
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
    await Database.closeConnection(db);
  }
}
