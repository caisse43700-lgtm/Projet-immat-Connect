'use strict';

const PATHS = {
  AUTH_FLOW: ['auth','session','profile'],
  PROFILE_FLOW: ['profile','owner_plate','preferences'],
  MESSAGES_FLOW: ['profile','owner_plate','messages','normalizeRows','renderMessages'],
  ALERT_FLOW: ['roadReport','saveReportRemote','remoteId'],
  ALERT_RESOLUTION_FLOW: ['roadReport','saveReportRemote','remoteId','resolve_report','handleResolveReport','dismissAlert'],
  REALTIME_FLOW: ['subscribe','event','dispatch','refresh'],
  SYNC_FLOW: ['local','remote','merge','persist']
};

function listPaths(){ return PATHS; }
module.exports = { PATHS, listPaths };
