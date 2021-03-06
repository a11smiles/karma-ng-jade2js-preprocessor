var util = require('util');
var jade = require('jade');

var TEMPLATE = 'angular.module(\'%s\', []).run([\'$templateCache\', function($templateCache) {\n' +
    '  $templateCache.put(\'%s\',\n    \'%s\');\n' +
    '}]);\n';

var SINGLE_MODULE_TPL = '(function(module) {\n' +
    'try {\n' +
    '  module = angular.module(\'%s\');\n' +
    '} catch (e) {\n' +
    '  module = angular.module(\'%s\', []);\n' +
    '}\n' +
    'module.run([\'$templateCache\', function($templateCache) {\n' +
    '  $templateCache.put(\'%s\',\n    \'%s\');\n' +
    '}]);\n' +
    '})();\n';

var REQUIRE_MODULE_TPL = 'require([\'%s\'], function(angular) {%s});\n'

var ANGULAR2_TPL = 'window.$templateCache = window.$templateCache || {};\n' +
  "window.$templateCache['%s'] = '%s';\n"

var escapeContent = function(content) {
  return content.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\r?\n/g, '\\n\' +\n    \'');
};

var createJade2JsPreprocessor = function(logger, basePath, config) {
  config = typeof config === 'object' ? config : {};

  var log = logger.create('preprocessor.jade2js');
  var moduleName = config.moduleName;
  var locals = config.locals;
  var templateExtension = config.templateExtension || 'html';
  var stripPrefix = new RegExp('^' + (config.stripPrefix || ''));
  var prependPrefix = config.prependPrefix || '';
  var jadeOptions = config.jadeOptions || {};
  var cacheIdFromPath = config && config.cacheIdFromPath || function(filepath) {
    return prependPrefix +
      filepath
        .replace(stripPrefix, '')
        .replace(/\.jade$/, '.' + templateExtension);
  };

  var enableRequireJs = config.enableRequireJs
  var requireJsAngularId = config.requireJsAngularId || 'angular'
  var angular = config.angular || 1
  
  return function(content, file, done) {
    var processed;

    log.debug('Processing "%s".', file.originalPath);

    jadeOptions.filename = file.originalPath;

    try {
       processed = jade.compile(content, jadeOptions);
    } catch (e) {
     log.error('%s\n  at %s', e.message, file.originalPath);
     return;
    }

    content = processed(locals);

    var htmlPath = cacheIdFromPath(file.originalPath.replace(basePath + '/', ''));

    file.path = file.path.replace(/\.jade$/, '.html') + '.js';

    var tpl
    if (angular === 2 || angular === '2') {
      tpl = util.format(ANGULAR2_TPL, htmlPath, escapeContent(content))
    } else {
      if (moduleName) {
        tpl = util.format(SINGLE_MODULE_TPL, moduleName, moduleName, htmlPath, escapeContent(content))
      } else {
        tpl = util.format(TEMPLATE, htmlPath, htmlPath, escapeContent(content))
      }

      if (enableRequireJs) {
        tpl = util.format(REQUIRE_MODULE_TPL, requireJsAngularId, tpl)
      }
    }  
      
    done(tpl);
  };
};

createJade2JsPreprocessor.$inject = ['logger', 'config.basePath', 'config.ngJade2JsPreprocessor'];

module.exports = createJade2JsPreprocessor;
