// Package metadata file for Meteor.js. Maintainer: @dandv.
'use strict';

var packageName = 'webix:skin-flat';  // https://atmospherejs.com/webix/skin-flat
var gitHubPath = 'webix-hub/tracker';  // https://github.com/webix-hub/tracker - unfortunate name choice for the main Webix repo
var where = 'client';  // where to install: 'client' or 'server'. For both, pass nothing.

/* All of the below is just to get the version number of the 3rd party library.
 * First we'll try to read it from package.json. This works when publishing or testing the package
 * but not when running an example app that uses a local copy of the package because the current 
 * directory will be that of the app, and it won't have package.json. Find the path of a file is hard:
 * http://stackoverflow.com/questions/27435797/how-do-i-obtain-the-path-of-a-file-in-a-meteor-package
 * Therefore, we'll fall back to GitHub.
 * We also don't have the HTTP package at this stage, and if we use Package.* in the request() callback,
 * it will error that it must be run in a Fiber. So we'll use Node futures.
 */
var request = Npm.require('request');
var Future = Npm.require('fibers/future');

var fut = new Future;
var version;  // assume the skin version is the same as the Webix version, despite https://github.com/webix-hub/tracker/issues/221

try {
  var bowerJson = JSON.parse(Npm.require('fs').readFileSync('webix/bower.json'));
  version = bowerJson.version;
} catch (e) {
  // if the file was not found, fall back to GitHub
  console.warn('Could not find webix/bower.json to read version number from; trying GitHub...');
  var url = 'https://api.github.com/repos/' + gitHubPath + '/tags';
  request.get({
    url: url,
    headers: {
      'User-Agent': 'request'  // GitHub requires it
    }
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var versions = JSON.parse(body).map(function (version) {
        return version['name'].replace(/^\D+/, '');  // trim leading non-digits
      }).sort();
      fut.return(versions[versions.length - 1]);
    } else {
      fut.throw('Could not get version information from ' + url + ' either (incorrect package name?):\n' + (response && response.statusCode || '') + (response && response.body || '') + (error || ''));
    }
  });

  version = fut.wait();
}

// Now that we finally have an accurate version number...
Package.describe({
  name: packageName,
  summary: 'Default skin for Webix UI',
  version: version,
  git: 'https://github.com/MeteorPackaging/webix-skin-flat',
  documentation: 'README.md'
});

Package.onUse(function (api) {
  api.imply('webix:webix@2.3.8');
  
  api.addFiles(['webix/codebase/skins/debug/flat.css'], 'client');

  // add the Webix font files
  ['PTS-webfont', 'PTS-bold'].forEach(function (font) {
    api.addFiles([
      // we bundle all font files, but the client will request only one of them via the CSS @font-face rule
      'webix/codebase/fonts/' + font + '.eot',  // IE8 or older only understands EOT. IE9+ will read it too because it loads the first occurrence of `src`
      'webix/codebase/fonts/' + font + '.ttf',  // Android Browsers 4.1, 4.3 - http://caniuse.com/#feat=ttf
      'webix/codebase/fonts/' + font + '.woff'  // Most modern browsers
    ], 'client');
  });
});

Package.onTest(function(api) {
  api.use(packageName, 'client');  // yes, our package tests have to explicitly use our package - https://github.com/meteor/meteor/issues/1620
  api.use(['tinytest', 'http'], 'client');
  api.addFiles('test.js', 'client');
});
