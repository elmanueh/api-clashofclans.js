import * as ControllerStatus from '../controllers/controller-status.js';
import * as ErrorHandler from '../../utils/error-handler.js';
import * as ClashofClansApi from '../services/clashofclans.js';
import * as Database from '../services/database.js';
import * as CreateResponse from '../../utils/create-response.js';
import { writeConsoleANDLog } from '../../utils/write.js';

// Get a player information
export async function getPlayer(playerTag) {
  try {
    const playerClan = await ClashofClansApi.getPlayer(playerTag);
    if (playerClan) return await CreateResponse.create(playerClan, CreateResponse.HTTP_200_OK);
    return await CreateResponse.create(ControllerStatus.TAG_INCORRECT);
  } catch (error) {
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  }
}

// Link the COC account with Discord
export async function linkAccount(playerTag, playerToken, userId) {
  const db = await Database.openConnection();
  try {
    const playerClan = await ClashofClansApi.getPlayer(playerTag);
    if (!playerClan) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);
    const tokenVerified = await ClashofClansApi.verifyPlayerToken(playerTag, playerToken);
    if (!tokenVerified) return await CreateResponse.create(ControllerStatus.TOKEN_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    try {
      await Database.runCommand(db, `INSERT INTO UserConnections VALUES ('${userId}', '${playerClan.tag}')`);
    } catch (error) {
      if (error.code === ErrorHandler.SQLITE_CONSTRAINT_UNIQUE) return await CreateResponse.create(ControllerStatus.LINK_ACCOUNT_FAIL, CreateResponse.HTTP_404_NOT_FOUND);
      else if (error.code === ErrorHandler.SQLITE_CONSTRAINT_FOREIGNKEY) {
        await Database.runCommand(db, `INSERT INTO PlayerData VALUES ('${playerClan.tag}', '${playerClan.name}', '${playerClan.townHallLevel}', '${playerClan.warPreference}')`);
        await Database.runCommand(db, `INSERT INTO UserConnections VALUES ('${userId}', '${playerClan.tag}')`);
      } else throw error;
    }
    await Database.runCommand(db, 'COMMIT');
    return await CreateResponse.create(ControllerStatus.LINK_ACCOUNT_OK, CreateResponse.HTTP_200_OK);
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  } finally {
    await Database.closeConnection(db);
  }
}

// Unlink the COC account with Discord
export async function unlinkAccount(playerTag, userId) {
  const db = await Database.openConnection();
  try {
    const playerClan = await ClashofClansApi.getPlayer(playerTag);
    if (!playerClan) return await CreateResponse.create(ControllerStatus.TAG_INCORRECT, CreateResponse.HTTP_404_NOT_FOUND);

    await Database.runCommand(db, 'BEGIN IMMEDIATE');
    const isUserLinked = await Database.getSingleRow(db, `SELECT * FROM UserConnections WHERE discordId = '${userId}' AND player = '${playerClan.tag}'`);
    if (!isUserLinked) return await CreateResponse.create(ControllerStatus.UNLINK_ACCOUNT_FAIL, CreateResponse.HTTP_404_NOT_FOUND);

    await Database.runCommand(db, `DELETE FROM UserConnections WHERE discordId = '${userId}' AND player = '${playerClan.tag}'`);
    await Database.runCommand(db, 'COMMIT');
    return await CreateResponse.create(ControllerStatus.UNLINK_ACCOUNT_OK, HTTP_200_OK);
  } catch (error) {
    await writeConsoleANDLog(error);
    await Database.runCommand(db, 'ROLLBACK');
    return await CreateResponse.create(ControllerStatus.ERROR, CreateResponse.HTTP_500_INTERNAL_SERVER_ERROR);
  } finally {
    await Database.closeConnection(db);
  }
}
