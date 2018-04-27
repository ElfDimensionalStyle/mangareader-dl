const fs = require( "mz/fs" );
const path = require( "path" );
const mkdir = require( "make-dir" );

const i = require( "../lib" );
const s = require( "../lib/settings" );
const { downloadManga } = require( "../lib/download" );

/* Functions for parsing cli commands */

function list( settings, settingsPath ) {
  if ( settingsPath ) {
    s.reset( "history", settings, settingsPath );
    i.prependArrowPrintStdout( "History has been reset." );
  } else
    s.outputHistory( settings );

  checkForUpdate();
}

function config( argv, settings, defaults, outputPath, settingsPath ) {
  if ( settingsPath ) { // If 'reset' has been passed
    s.reset( "config", settings, settingsPath );
    i.prependArrowPrintStdout( "Config has been reset." );
  } else {
    let outMsg = "";

    if ( outputPath !== defaults.out ) {
      settings.set( "config.outputPath", outputPath ).save();
      outMsg += `Default output path set to '${outputPath}'. `;
    }

    if ( argv.provider !== defaults.provider ) {
      settings.set( "config.provider", argv.provider ).save();
      outMsg += `'${argv.provider}' set as default provider. `;
    }

    settings.set( "config.dir", argv.dir ).save();
    if ( argv.dir !== defaults.dir )
      outMsg += argv.dir ? "'--dir' option enabled. " : "'--dir' option disabled. ";

    settings.set( "config.extended", argv.extended ).save();
    if ( argv.extended !== defaults.extended )
      outMsg += argv.extended ? "'--extended' option enabled." : "'--extended' option disabled.";

    if ( outMsg.length === 0 ) {
      outMsg = `No options have been passed to 'config'. Specify --help for usage info\n${s.outputConfig( settings )}`;
    }

    i.prependArrowPrintStdout( outMsg );
    checkForUpdate();
  }
}

function manga( argv, outputPath, settings ) {
  const url = argv._[0];
  const { name } = i.parseFromUrl( url );

  const subscribeDefault = settings.get( `history.${name}.subscribe` );
  const subscribe = argv.subscribe === 0 /* fallback */ ? subscribeDefault ? subscribeDefault : false : argv.subscribe;
  if ( subscribe !== subscribeDefault )
    settings.set( `history.${name}.subscribe`, subscribe ).save();

  if ( argv.dir ) {
    const newOut = path.join( outputPath, name );

    mkdir.sync( newOut );
    outputPath = newOut;
  }

  const options = {
    outputPath,
    provider: argv.provider,
    isForce : argv.force,
    bar     : argv.bar,
  };

  downloadManga( url, options, settings );
}

function checkForUpdate() {
  /* eslint-disable global-require */
  const updateCheck = require( "update-check" );
  const packageJson = require( "../package" );

  updateCheck( packageJson )
    .then( update => { if ( update ) i.prependArrowPrintStdout( `A new version of mangareader-dl is available: current ${packageJson.version}, latest ${update.latest}` ); } );
}

module.exports = {
  list,
  config,
  manga,
};
