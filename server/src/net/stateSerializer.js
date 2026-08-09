/* Thin re-export: the redaction logic itself lives in shared/shelem-engine.js
 * so it's the same code the offline client uses to build its own view. This
 * file exists as the named module the rest of the server imports, keeping
 * "where does state redaction happen" easy to find.
 */
var ShelemEngine = require('../../../shared/shelem-engine.js');

module.exports = ShelemEngine.buildStateForSeat;
