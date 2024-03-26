import { appendFile } from 'fs/promises';
import { ClashOfClansError, DatabaseError } from './errorCreate.js';
const LOG_FILENAME = 'latest.log';

async function serializeMessage(message) {
  if (message instanceof ClashOfClansError) return message.stack + ` {\n  errno: ${message.errno}\n}`;
  if (message instanceof DatabaseError) return message.stack + ` {\n  errno: ${message.errno}\n  code: '${message.code}'\n}`;
  return message;
}

export async function writeConsoleANDLog(message) {
  message = await serializeMessage(message);

  console.error(message);
  await appendFile(LOG_FILENAME, message + '\n');
}
