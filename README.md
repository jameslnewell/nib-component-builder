# nib-component-builder

One stop method for building JS, CSS and other assets with the Component builder.

## Methods

### build(directory : String, options : Object, callback : function(errors : Array))

 - `directory`  - The component directory
 - `options`    - The builder options
 - `callback`   - The builder callback called when the component has been built
 
### Options

    /**
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

## Usage
    
    require('nib-component-builder')('C:\\temp\\app', {}, function(err) {
      if (err.length) {
        console.log(err);
      } else {
        console.log('done');
      }
    });
    