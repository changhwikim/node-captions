/** @module sami
 * @memberOf node-captions
 */
/*jslint node: true, nomen: true, plusplus: true, unparam: true, todo: true */
'use strict';

var fs = require('fs'),
    htmlparser = require('htmlparser2'),
    SAMI = require('../config/sami.json');

module.exports = {
    /**
     * generates SAMI from JSON
     * @function
     * @public
     * @param {string} data - proprietary JSON data to translate to SAMI
     */

    generate: function(data) {
        var SAMI_BODY = '',
            captions = data;

        SAMI_BODY += SAMI.header.join('\n') + '\n';
        captions.forEach(function(caption) {
            if (caption.text === '') {
              //TODO - should add '&nbsp;' sync tag for caption.endTimeMicro exists
                caption.text = '&nbsp;';
            }
            SAMI_BODY += SAMI.lineTemplate.replace('{startTime}', Math.floor(caption.startTimeMicro / 1000))
                .replace('{text}', module.exports.renderMacros(caption.text)) + '\n';
            if (caption.endTimeMicro) {
                SAMI_BODY += SAMI.lineTemplate.replace('{startTime}', Math.floor(caption.endTimeMicro / 1000))
                .replace('{text}', '&nbsp;\n');
            }
        });

        return SAMI_BODY + SAMI.footer.join('\n') + '\n';
    },

    /**
     * renders macros into sami-type stylings
     * @function
     * @public
     * @param {string} data - renders sami-type stylings from macros
     */

    renderMacros: function(data) {
        return data.replace(/\{break\}/g, '<br>')
            .replace(/\{italic\}/g, '<i>')
            .replace(/\{end-italic\}/g, '</i>');
    },
    /**
     * Reads a SMI file and verifies it sees the proper header
     * @function
     * @param {string} file - path to file
     * @param {callback} callback - callback to call when complete
     * @public
     */
    read: function(file, options, callback) {
        var lines;
        fs.readFile(file, options, function(err, data) {
            if (err) {
                return callback(err);
            }
            lines = data.toString().split(/(?:\r\n|\r|\n)/gm);
            if (module.exports.verify(lines[0])) {
                callback(undefined, data);
            } else {
                callback('INVALID_SMI_FORMAT');
            }
        });
    },
    /**
     * Parses srt captions, errors if format is invalid
     * @function
     * @param {string} filedata - String of caption data
     * @param {callback} callback - function to call when complete
     * @public
     */
    parse: function(filedata, callback) {
        var lines;
        lines = filedata.toString().split(/(?:\r\n|\r|\n)/gm);
        if (module.exports.verify(lines[0])) {
            return callback(undefined, lines);
        }
        return callback('INVALID_SRT_FORMAT');
    },
    /**
     * verifies a SMI file header, returns true/false
     * @function
     * @param {string} header - Header line to verify
     * @public
     */
    verify: function(header) {
        var SAMI_HEADER = SAMI.header[0];
        var SAMI_HEADER_REGEX = new RegExp(SAMI_HEADER, 'i');
        return SAMI_HEADER_REGEX.test(header.trim());
    },

    /**
     * converts SMI to JSON format
     * @function
     * @param {array} data - output from read usually
     * @public
     */
    toJSON: function(data) {
        var NBSP = '&nbsp;';
        var SYNC_TAG = 'sync';
        var BR_TAG = 'br';
        var START_ATTRIB = 'start';

        var jsonCaptions = [];

        var text = '';
        var tempTime = 0;
        var caption = {};
        var parser = new htmlparser.Parser({
            onopentag: function(name, attribs) {
              if (name === SYNC_TAG) {
                tempTime = attribs[START_ATTRIB] * 1000;
                if (jsonCaptions.length == 0) {
                  // first sync
                  text = '';
                }
              }
              else if (name == BR_TAG) {
                text += '{break}';
              }
            },
            ontext: function(thisText) {
              thisText = thisText.trim();
              if (thisText === NBSP) {
                if (tempTime != 0) {
                  caption['endTimeMicro'] = tempTime;
                  tempTime = 0;
                }
                caption['text'] = text;
                jsonCaptions.push(caption);

                caption = {};
                text = '';
              }
              else {
                if (tempTime != 0) {
                  caption['startTimeMicro'] = tempTime;
                  tempTime = 0;
                }
                text += thisText;
              }
            },
            onclosetag: function(tagname) {
            }
        }, {});
        parser.write(data);
        parser.end();

        return jsonCaptions;
    },
    decode: function (dataBuff, language, callback) {
      var targetEncodingCharset = 'utf8';

      var charset = charsetDetect.detect(dataBuff);
      var detectedEncoding = charset.encoding;
      win.debug('SUB charset detected: ', detectedEncoding);
      // Do we need decoding?
      if (detectedEncoding.toLowerCase().replace('-', '') === targetEncodingCharset) {
        callback(dataBuff.toString('utf8'));
        // We do
      } else {
        var langInfo = App.Localization.langcodes[language] || {}; 
        win.debug('SUB charsets expected for language \'%s\': ', language, langInfo.encoding);
        if (langInfo.encoding !== undefined && langInfo.encoding.indexOf(detectedEncoding) < 0) {
          // The detected encoding was unexepected to the language, so we'll use the most common
          // encoding for that language instead.
          detectedEncoding = langInfo.encoding[0];
        }   
        win.debug('SUB charset used: ', detectedEncoding);
        dataBuff = iconv.encode(iconv.decode(dataBuff, detectedEncoding), targetEncodingCharset);
        callback(dataBuff.toString('utf8'));
      }   
    },  
    /**
     * translates timestamp to microseconds
     * @function
     * @param {string} timestamp - string timestamp from srt file
     * @public
     */
    translateTime: function(timestamp) {
    },
    /**
     * converts SMI stylings to macros
     * @function
     * @param {string} text - text to render macros for
     * @public
     */
    addMacros: function(text) {
        return text.replace(/<br>/g, '{break}')
            .replace(/<i>/g, '{italic}')
            .replace(/<\/i>/g, '{end-italic}');
    }
};
