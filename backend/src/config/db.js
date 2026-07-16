const { Pool } = require("pg");
require("dotenv").config();

// pg-connection-string parses `sslmode` out of the URL itself and, for
// require/prefer/verify-ca, prints a deprecation warning on every connect
// about a future semantics change — regardless of the explicit `ssl` option
// below. Stripping it from the string makes that `ssl` option the only
// source of truth instead of also being (re)parsed from the query string.
function connectionStringWithoutSslMode(databaseUrl) {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  return url.toString();
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: connectionStringWithoutSslMode(process.env.DATABASE_URL),
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

module.exports = pool;
