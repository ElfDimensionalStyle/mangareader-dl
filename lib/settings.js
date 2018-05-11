const fs = require( "mz/fs" );
const path = require( "path" );
const DotJson = require( "dot-json" );
const fileExists = require( "file-exists" );
const expandHomeDir = require( "expand-home-dir" );
const chalk = require( "chalk" );
const strpad = require( "strpad" );

const i = require( "." );
const u = require( "./update" );

/**
 * Includes functions related to reading/writing the settings file
 */

/**
 * @returns settingsPath
 */
function getSettingsPath() {
  const globalSettingsPath = expandHomeDir( "~/.mangareader-dl.json" );
  const localSettingsPath = path.resolve( __dirname, "..", "mangareader-dl.json" );

  return fileExists.sync( globalSettingsPath ) ? globalSettingsPath : localSettingsPath;
}

/**
 * @returns settings
 */
function createSettingsObject( settingsPath ) {
  // File exists checks need only to happen at initialization
  if ( !fileExists.sync( settingsPath ) ) fs.writeFileSync( settingsPath, `{ "config": {}, "history": {} }` );

  return new DotJson( settingsPath );
}

const readHistory = settings => settings.get( "history" );
const readConfig = settings => settings.get( "config" );
const readId = settings => settings.get( "id" ) || "";

/**
 * @returns defaults
 */
const parseDefaults = settings => ( {
  out     : settings.get( "config.outputPath" ) || "./",
  provider: settings.get( "config.provider" ) || "mangareader",
  dir     : settings.get( "config.dir" ) || false,
  extended: settings.get( "config.extended" ) || false,
} );

/**
 * Write given data to history
 */
function writeHistory( settings, { name, chapter, provider, subscribe, path: outputPath } ) {
  const id = readId( settings );
  const subscribeDefault = settings.get( `history.${name}.subscribe` );
  const providerDefault = settings.get( `history.${name}.provider` );
  if ( subscribeDefault !== subscribe ) {
    if ( subscribe )
      u.addManga( id, name, provider );
    else
      u.removeManga( id, name, provider );
  }

  if ( providerDefault !== undefined && providerDefault !== provider ) {
    u.updateProvider( id, name, provider );
  }

  settings
    .set( `history.${name}.chapter`, chapter )
    .set( `history.${name}.path`, outputPath )
    .set( `history.${name}.provider`, provider )
    .set( `history.${name}.subscribe`, subscribe )
    .save();
}

/**
 * Read data for name from history
 */
function readHistoryForName( settings, name ) {
  const chapter = settings.get( `history.${name}.chapter` );
  const outputPath = settings.get( `history.${name}.path` );
  const provider = settings.get( `history.${name}.provider` );

  return { chapter, provider, path: outputPath };
}

/**
 * Output contents of settings.history via 'list' command
 */
function outputHistory( settings ) {
  const mangaObj = settings.get( "history" );
  const mangas = Object.keys( mangaObj ).sort( ( a, b ) => a > b ? 1 : -1 );
  const longestName = mangas.reduce( ( acc, cur ) => cur.length > acc ? cur.length : acc, 0 );

  if ( mangas.length > 0 ) {
    i.prependArrowPrintStdout( "Downloaded manga:" );
    mangas.forEach( manga => {
      if ( mangaObj[manga].subscribe !== undefined && mangaObj[manga].chapter !== undefined && mangaObj[manga].path !== undefined && mangaObj[manga].provider !== undefined )
        console.log( `  ${chalk.green( mangaObj[manga].subscribe ? "✓" : " " )} ${strpad.right( manga, longestName )} ${strpad.left( chalk.green( mangaObj[manga].chapter ), 13 )} [${strpad.right( mangaObj[manga].provider, "mangareader".length )} ${mangaObj[manga].path}]` );
    } );
  } else {
    i.prependArrowPrintStdout( `No manga downloaded yet. Specify --help for usage info.` );
  }
}

/**
 * Output contents of settings.config via 'config' command
 */
function outputConfig( settings ) {
  const { out, provider, dir, extended } = parseDefaults( settings );

  return `  Current configuration:
    --out: ${out}
    --dir: ${dir}
    --provider: ${provider}
    --extended: ${extended}`;
}

/**
 * Reset given setting [config/history]
 */
function reset( setting, settings, settingsPath ) {
  const id = readId( settings );

  switch ( setting ) {
    case "config":
      const history = readHistory( settings );
      fs.writeFile( settingsPath, `{ "id": ${id}, "config": {}, "history": ${JSON.stringify( history )} }` );
      break;
    case "history":
      const config = readConfig( settings );
      fs.writeFile( settingsPath, `{ "id": ${id}, "config": ${JSON.stringify( config )}, "history": {} }` );
      break;
  }
}

module.exports = {
  getSettingsPath,
  createSettingsObject,
  writeHistory,
  readHistory,
  readHistoryForName,
  outputHistory,
  outputConfig,
  parseDefaults,
  reset,
  readId,
};
