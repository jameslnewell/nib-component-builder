var fs        = require('fs');
var path      = require('path');

var validator = require('component-validator');
var resolver  = require('component-resolver');
var builder   = require('component-builder');

/**
 * Create a directory if it doesn't already exist
 * @param   {string}    directory
 * @param   {function}  callback
 */
function createDirectoryIfItDoesntExist(directory, callback) {
  fs.mkdir(directory, function(err) {

    //if we get an error stating the dir already exists (because of a race condition) then
    // we're safe to create the file because it exists
    if (err && err.code !== 'EEXIST') {
      callback(err);
    } else {
      callback();
    }

  });
}

/**
 * Create a file if it doesn't already exist and write the contents to the file
 * @param   {string}    file
 * @param   {string}    contents
 * @param   {function}  callback
 */
function createFileInDirectoryAndWrite(file, contents, callback) {
  createDirectoryIfItDoesntExist(path.dirname(file), function(err) {
    if (err) throw err;
    fs.writeFile(file, contents, callback);
  });
}

/**
 * Build a component
 * @param   {string}    directory                     The component directory
 * @param   {object}    options                       The build options
 * @param   {boolean}   [options.install=true]        Whether the dependencies should be installed
 * @param   {boolean}   [options.require=true]        Whether the require method should be included in the outputted script (only one script on the page needs this)
 * @param   {boolean}   [options.autorequire=true]    Whether to automatically require the canonical component
 * @param   {boolean}   [options.development=false]   Whether the development dependencies should be built
 * @param   {boolean}   [options.verbose=false]       Whether to print warnings and status messages to stdout
 * @param   {boolean}   [options.scripts=true]        Whether to build the scripts
 * @param   {boolean}   [options.styles=true]         Whether to build the styles
 * @param   {boolean}   [options.files=true]          Whether to build the files
 * @param   {string}    [options.installDir]          The directory where the components are installed to
 * @param   {string}    [options.buildDir]            The directory where the components are built to
 * @param   {string}    [options.scriptBuildFile]     The name of the script build file e.g. build.js
 * @param   {string}    [options.styleBuildFile]      The name of the style build file e.g. build.css
 * @param   {function}  callback                      The callback
 */
module.exports = function(directory, options, callback) {
  options.scripts = typeof options.scripts === 'undefined' ? true : options.scripts;
  options.styles  = typeof options.styles === 'undefined' ? true : options.styles;
  options.files   = typeof options.files === 'undefined' ? true : options.files;

  /**
   * The errors which occurred during build
   * @type  {Array}
   */
  var errors = [];

  /**
   * The number of executed builders
   * @type  {number}
   */
  var builderCount = 0;

  /**
   * The number of finished builders
   * @type  {number}
   */
  var finishedCount = 0;

  //the component directory
  var componentDirectory  = directory;
  var componentFile       = componentDirectory+'/component.json';

  //the build directory
  var installDirectory    = options.installDir || componentDirectory+'/components';
  var buildDirectory      = options.buildDir || componentDirectory+'/build';

  var scriptBuildFile     = options.scriptBuildFile || 'build.js';
  var scriptBuildPath     = buildDirectory+'/'+scriptBuildFile;

  var styleBuildFile      = options.styleBuildFile || 'build.css';
  var styleBuildPath      = buildDirectory+'/'+styleBuildFile;
  

  // === set builder count ===

  if (options.scripts !== false) {
    ++builderCount;
  }

  if (options.styles !== false) {
    ++builderCount;
  }

  if (options.files !== false) {
    ++builderCount;
  }

  /**
   * Record when a build is finished
   * @param   {*} err
   */
  function done(err) {
    ++finishedCount;

    //record the errors
    if (err) {
      errors.push(err);
    }

    //call the user's callback if we're done
    if (finishedCount === builderCount) {
      callback(errors);
    }

  }

  /**
   * Build scripts
   * @param   {object}  tree
   * @param   {object}  options
   */
  function buildScripts(tree, options) {
    builder.scripts(tree, options)
      .use('scripts', builder.plugins.js())
      .use('templates', builder.plugins.string())
      .use('json', builder.plugins.json())
      .end(function (err, output) {
        if (err) return done(err);

        //check there were scripts
        if (typeof output !== 'string') {
          done();
          return;
        }

        //include the require functions
        if (options.require !== false) {
          output = builder.scripts.require + output;
        }

        //require the canonical component
        if (options.autorequire !== false) {
          try {
            output += '\nrequire(\'' + builder.scripts.canonical(tree).canonical + '\')\n';
          } catch (err) {
            return done(err);
          }
        }
        //create the file inside the build directory
        createFileInDirectoryAndWrite(scriptBuildPath, output, function(err) {
          if (err) return done(err);
          done();
        });

      })
    ;
  }

  /**
   * Build styles
   * @param   {object}  tree
   * @param   {object}  options
   */
  function buildStyles(tree, options) {
    builder.styles(tree, options)
      .use('styles', builder.plugins.css())
      .use('styles', builder.plugins.urlRewriter())
      .end(function (err, output) {
        if (err) return done(err);

        //check there were styles
        if (typeof output !== 'string') {
          done();
          return;
        }

        //create the file inside the build directory
        createFileInDirectoryAndWrite(styleBuildPath, output, function(err) {
          if (err) return done(err);
          done();
        });

      })
    ;
  }

  /**
   * Build files
   * @param   {object}  tree
   * @param   {object}  options
   */
  function buildFiles(tree, options) {
    options.destination = buildDirectory;
    builder.files(tree, options)
      .use('images', builder.plugins.copy())
      .use('fonts', builder.plugins.copy())
      .use('files', builder.plugins.copy())
      .end(function (err, output) {
        if (err) return done(err);
        done();
      })
    ;
  }

  /**
   * Build the component
   * @param   {object} component The parsed component.json object
   */
  function build(component) {

    var validateOptions = {
      filename:     componentDirectory,
      verbose:      options.verbose === true
    };

    var resolveOptions = {
      root:         componentDirectory,
      out:          installDirectory,
      install:      options.install !== false,
      development:  options.development === true,
      verbose:      options.verbose === true
    };

    var builderOptions = {
      development:  options.development === true,
    };

    //validate the component
    try {
      validator(component, validateOptions);
    } catch(err) {
      callback([err]);
      return;
    }

    //build the component
    resolver(component, resolveOptions, function (err, tree) {
      if (err) return callback([err]);

      if (options.scripts !== false) {
        buildScripts(tree, builderOptions);
      }

      if (options.styles !== false) {
        buildStyles(tree, builderOptions);
      }

      if (options.files !== false) {
        buildFiles(tree, builderOptions);
      }

    });
  }

  fs.readFile(componentFile, function(err, data) {
    if (err) return callback([err]);

    //get the compoment.json data
    build(JSON.parse(data));

  });

};
