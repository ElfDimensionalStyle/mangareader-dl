const fs = require( "mz/fs" );
const path = require( "path" );
const mkdir = require( "make-dir" );
const range = require( "py-range" );
const chalk = require( "chalk" );
const logUpdate = require( "log-update" );

const i = require( "../lib" );
const s = require( "../lib/settings" );
const { downloadManga } = require( "../lib/download" );

/* Functions for parsing cli commands */

function list( settings, resetObj ) {
  if ( resetObj ) {
    s.reset( "history", settings, resetObj.settingsPath, resetObj.force );
    i.prependArrowPrintStdout( "History has been reset." );
  } else
    s.outputHistory( settings );

  checkForUpdate();
}

function config( args, settings, defaults, outputPath, settingsPath ) {
  if ( settingsPath ) { // If 'reset' has been passed
    s.reset( "config", settings, settingsPath );
    i.prependArrowPrintStdout( "Config has been reset." );
  } else {
    let outMsg = "";

    if ( outputPath !== defaults.out ) {
      settings.set( "config.outputPath", outputPath ).save();
      outMsg += `Default output path set to '${outputPath}'. `;
    }

    if ( args.provider !== defaults.provider ) {
      settings.set( "config.provider", args.provider ).save();
      outMsg += `'${args.provider}' set as default provider. `;
    }

    settings.set( "config.dir", args.dir ).save();
    if ( args.dir !== defaults.dir )
      outMsg += args.dir ? "'--dir' option enabled. " : "'--dir' option disabled. ";

    settings.set( "config.extended", args.extended ).save();
    if ( args.extended !== defaults.extended )
      outMsg += args.extended ? "'--extended' option enabled." : "'--extended' option disabled.";

    if ( outMsg.length === 0 ) {
      outMsg = `No options have been passed to 'config'. Specify --help for usage info\n${s.outputConfig( settings )}`;
    }

    i.prependArrowPrintStdout( outMsg );
    checkForUpdate();
  }
}

function manga( args, outputPath, settings ) {
  const url = args._[0];
  const { name } = i.parseFromUrl( url );

  if ( args.dir ) {
    const newOut = path.join( outputPath, name );

    mkdir.sync( newOut );
    outputPath = newOut;
  }

  const options = {
    outputPath,
    provider : args.provider,
    isForce  : args.force,
    bar      : args.bar,
    subscribe: args.subscribe,
  };

  downloadManga( url, options, settings );
}

async function update( args, settings ) {
  logUpdate( `${chalk.green( "❯" )} Searching for updates...` );

  const mangaList = s.generateMangaList( settings );
  const downloaded = [];

  for ( const manga of mangaList ) {
    const last = await i.getLastChapter( manga.name, manga.provider );

    if ( last > manga.chapter ) {
      const options = {
        provider : manga.provider,
        bar      : args.bar,
        subscribe: true,
      };
      await downloadManga( manga.name, options, settings );

      downloaded.push( { name: manga.name, start: manga.chapter, end: last } );
    }
  }

  const mangaStr = downloaded.reduce( ( arr, manga ) => {
    const name = manga.name;
    const start = manga.start;
    const end = manga.end;

    return `${arr}\n    - ${name} (${start + 3 > end ? range( start + 1, end + 1 ) : `${start}-${end}`})`;
  }, "" );

  if ( downloaded.length )
    setTimeout( () => {
      i.prependArrowPrintStdout( `Updated the following manga:${mangaStr}` );
    }, 100 );
  else
    i.prependArrowPrintStdout( `No new updates are available` );
}

function checkForUpdate() {
  /* eslint-disable global-require */
  const updateCheck = require( "update-check" );
  const packageJson = require( "../package" );

  updateCheck( packageJson )
    .then( update => { if ( update ) i.prependArrowPrintStdout( `A new version of mangareader-dl is available: current ${packageJson.version}, latest ${update.latest}` ); } )
    .catch( err => {
      if ( err.code !== "ENOTFOUND" )
        console.log( err );
    } );
}

module.exports = {
  list,
  config,
  manga,
  update,
};
