-- PLAYERS data table
CREATE TABLE IF NOT EXISTS PlayerData (
  tag               TEXT        NOT NULL,
  name              TEXT        NOT NULL,
  townHall          INTEGER     NOT NULL,
  warPreference     TEXT        NOT NULL,
  lootCapitalT      INTEGER     NOT NULL,
  addCapitalT       INTEGER     NOT NULL,
  clanGamesT        INTEGER     NOT NULL,
  PRIMARY KEY (tag)
);

-- CLAN data table
CREATE TABLE IF NOT EXISTS ClanData (
  tag             TEXT      NOT NULL,
  lastUpdate      TEXT,
  lastWar         TEXT,
  PRIMARY KEY (tag)
);

-- Relationship table of a player in a clan
CREATE TABLE IF NOT EXISTS PlayerClanData (
  clan            TEXT        NOT NULL,
  player          TEXT 	      NOT NULL,
  role            TEXT        NOT NULL,
  lootCapital     INTEGER     NOT NULL      DEFAULT 0,
  addCapital      INTEGER     NOT NULL      DEFAULT 0,
  clanGames       INTEGER     NOT NULL      DEFAULT 0,
  warAttacks      TEXT 	      NOT NULL      DEFAULT '- - - - -',
  PRIMARY KEY (clan, player),
  CONSTRAINT fk_clan FOREIGN KEY (clan) REFERENCES ClanData(tag)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_player FOREIGN KEY (player) REFERENCES PlayerData(tag)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Table of connections between DISCORD_USER and COC_PLAYER
CREATE TABLE IF NOT EXISTS UserConnections (
  discordId     TEXT      NOT NULL,
  player        TEXT      NOT NULL,
  PRIMARY KEY (discordId, player),
  CONSTRAINT fk_player FOREIGN KEY (player) REFERENCES PlayerData(tag)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Table of connections between DISCORD_GUILD & COC_CLAN
CREATE TABLE IF NOT EXISTS GuildConnections (
  guildId             TEXT      NOT NULL,
  clan                TEXT      NOT NULL,
  channelLogId        TEXT,
  notMemberRoleId     TEXT,
  memberRoleId        TEXT,
  adminRoleId         TEXT,
  coLeaderRoleId      TEXT,
  leaderRoleId        TEXT,
  PRIMARY KEY (guildId, clan),
  CONSTRAINT fk_clan FOREIGN KEY (clan) REFERENCES ClanData(tag)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);