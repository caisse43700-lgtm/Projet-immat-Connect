/* OBD bootstrap loader */
(function (w) {
  'use strict';

  w.ObdBootstrap = {
    modules: [
      'core/obdSession.js?v=1',
      'core/obdGateway.js?v=1',
      'core/aiController.js?v=1'
    ],
    ready: function () {
      return !!(w.ObdSession && w.ObdGateway && w.AiController);
    }
  };
})(window);
