import * as ControllerStatus from '../controllers/controller-status.js';
import * as ErrorHandler from '../../utils/error-handler.js';
import * as ClashofClansApi from '../services/clashofclans.js';
import * as Database from '../services/database.js';
import * as CreateResponse from '../../utils/create-response.js';
import * as COCAPI from '../../utils/constants.js';

// Get a clan info
export async function getClan(clanTag) {
  if (!clanTag) return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  let conn;
  try {
    conn = await Database.getConnection();
    const clanApi = await ClashofClansApi.getClan(clanTag);
    if (!clanApi) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);

    const playersClan = (await Database.Select(conn, COCAPI.PLAYERSINCLAN_VIEW))[0];
    return await CreateResponse.create(playersClan, CreateResponse.HTTP_200_OK);
  } catch (error) {
    console.log(error);
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  } finally {
    await Database.releaseConnection(conn);
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
