#!/usr/bin/env node

const fs = require( "mz/fs" );
const path = require( "path" );
const meow = require( "meow" );

const i = require( "../lib" );
const s = require( "../lib/settings" );
const cliCommands = require( "../lib/cli-commands" );
const { generateIdIfMissing } = require( "../lib/update" );

const supportedProviders = require( "../lib/providers/available.json" );

const settingsPath = s.getSettingsPath();
const settings = s.createSettingsObject( settingsPath );
const defaults = s.parseDefaults( settings );

generateIdIfMissing( settings );

const cli = meow( `
  Usage
    $ mangareader-dl <manga>

  Commands
    <manga> Manga to download
    list    List downloaded manga
    config  Set defaults

  Options
    --out, -o       Set output path
    --dir, -d       Download into 'path/manga-name'
    --provider, -p  Set download site
    --force, -f     Overwrite history
    --subscribe, -s Subscribe to new chapters
    --extended, -e  Extended progress bar
    --micro, -m     Micro progress bar

  Examples
    $ mangareader-dl mangareader.net/naruto/100 -do .
    => Download naruto chapter 100+ into cwd

    $ mangareader-dl naruto -mp mangareader
    => Download naruto from mangareader.net in micro mode

  For the documentation please refer to:
  https://github.com/jneidel/mangareader-dl

`, {
    description: "mangareader-dl: CLI for comfortable manga download",
    flags      : {
      out: {
        alias  : "o",
        type   : "string",
        default: defaults.out,
      },
      dir: {
        alias  : "d",
        type   : "boolean",
        default: defaults.dir,
      },
      force: {
        alias  : "f",
        type   : "boolean",
        default: false,
      },
      extended: {
        alias  : "e",
        type   : "boolean",
        default: defaults.extended,
      },
      provider: {
        alias  : "p",
        type   : "string",
        default: defaults.provider,
      },
      micro: {
        alias  : "m",
        type   : "boolean",
        default: false,
      },
      subscribe: {
        alias  : "s",
        type   : "boolean",
        default: false,
      },
    },
  }
);

// Clean up input
const args = cli.flags;
args._ = cli.input;

let outputPath = path.normalize( args.out );
outputPath = path.isAbsolute( args.out ) ? args.out : path.resolve( process.cwd(), args.out );

if ( !~supportedProviders.indexOf( args.provider ) ) {
  i.prependArrowPrintStdout( `The provider '${args.provider}' is not supported. Please choose one from the list:\n  [${supportedProviders}]\n  Or submit a issue on GitHub requesting support of the given provider.` );
  process.exit();
}

args.bar = args.micro ? "micro" : args.extended ? "extended" : "normal"; // Micro > extended > normal

const isReset = args._[1] === "reset";

// Parse commands
switch ( args._[0] ) {
  case "list":
    cliCommands.list( settings, isReset ? settingsPath : null );
    break;
  case "config":
    cliCommands.config( args, settings, defaults, outputPath, isReset ? settingsPath : null );
    break;
  default: // <manga>
    cliCommands.manga( args, outputPath, settings );
}

process.on( "unhandledRejection", ( err ) => { throw err; } );
