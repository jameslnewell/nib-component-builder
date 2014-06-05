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
  fs.exists(directory, function(exists) {
    if (exists) {
      callback();
    } else {
      fs.mkdir(directory, callback);
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
 * @param   {function}  callback                      The callback
 */
module.exports = function(directory, options, callback) {

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
  var buildDirectory      = componentDirectory+'/build';
  var buildScript         = buildDirectory+'/build.js';
  var buildStyle          = buildDirectory+'/build.css';

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
   */
  function buildScripts(tree) {
    builder.scripts(tree)
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
        createFileInDirectoryAndWrite(buildScript, output, function(err) {
          if (err) return done(err);
          done();
        });

      })
    ;
  }

  /**
   * Build styles
   * @param   {object}  tree
   */
  function buildStyles(tree) {
    builder.styles(tree)
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
        createFileInDirectoryAndWrite(buildStyle, output, function(err) {
          if (err) return done(err);
          done();
        });

      })
    ;
  }

  /**
   * Build files
   * @param   {object}  tree
   */
  function buildFiles(tree) {
    console.log('building files');
    builder.files(tree)
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
      filename: '',
      verbose:      options.verbose === true
    };

    var resolveOptions = {
      root:         componentDirectory,
      out:          componentDirectory,
      install:      options.install !== false,
      development:  options.development === true,
      verbose:      options.verbose === true
    };

    //validate the component
    try {
      validator(component, validateOptions);
    } catch(err) {
      callback(err);
      return;
    }

    //build the component
    resolver(component, resolveOptions, function (err, tree) {
      if (err) return callback([err]);

      if (options.scripts !== false) {
        buildScripts(tree);
      }

      if (options.styles !== false) {
        buildStyles(tree);
      }

      if (options.files !== false) {
        buildFiles(tree);
      }

    });
  }

  fs.readFile(componentFile, function(err, data) {
    if (err) return callback([err]);

    //get the compoment.json data
    build(JSON.parse(data));

  });

};

module.exports('C:\\temp\\app', {verbose: true}, function(err) {
  console.log(err);
});