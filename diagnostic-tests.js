/* Diagnostic OBD virtuel - integration tests */
'use strict';

let _pass = 0;
let _fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log('PASS ' + name);
    _pass++;
  } catch (e) {
    console.log('FAIL ' + name + ' - ' + e.message);
    _fail++;
  }
}

function ok(value, message) {
  if (!value) throw new Error(message || 'assertion failed');
}

function eq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || ('expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)));
  }
}

const { ImmatBus, EVENTS } = require('./core/bus');
const { createDiagnosticInbox, DiagnosticInbox } = require('./core/diagnostic/diagnostic-inbox');
const { connectDiagnosticToBus } = require('./core/diagnostic/bus-bridge');
const { createDiagnosticAdapter } = require('./core/diagnostic/diagnostic-adapter');
const { openGateway } = require('./core/diagnostic/claude-obd-gateway');

console.log('\n-- Diagnostic OBD virtuel --');

test('DIAG-01 invariant violation goes to inbox', () => {
  const inbox = createDiagnosticInbox();
  const bridge = connectDiagnosticToBus({ inbox });

  ImmatBus.emit(EVENTS.INVARIANT_VIOLATED, {
    invariant: 'INV-011',
    label: 'Unicite de source de verite',
    severity: 'critical',
    context: { test: true }
  });

  const defects = inbox.list();
  bridge.unsubscribe();

  eq(defects.length, 1);
  eq(defects[0].category, 'invariant');
  eq(defects[0].severity, 'critical');
  eq(defects[0].source, 'INV-011');
});

test('DIAG-02 test failure becomes diagnostic defect', () => {
  const inbox = createDiagnosticInbox();
  const adapter = createDiagnosticAdapter({ inbox });

  adapter.adapt('TEST_FAILED', {
    test: 'AB-04 resolution flow',
    chain: 'roadReport_A -> remoteId -> resolve_report -> dismiss'
  });

  const defects = inbox.list();
  eq(defects.length, 1);
  eq(defects[0].category, 'test');
  eq(defects[0].severity, 'high');
  ok(defects[0].chain.indexOf('remoteId') >= 0, 'chain should contain remoteId');
});

test('DIAG-03 gateway exposes global inbox status', () => {
  DiagnosticInbox.clear();
  DiagnosticInbox.add({
    severity: 'critical',
    category: 'invariant',
    title: 'Invariant critique'
  });

  const gateway = openGateway();
  eq(gateway.connected, true);
  ok(gateway.health < 100, 'health score should decrease');
  eq(gateway.counts.critical, 1);
  ok(gateway.actions.indexOf('run_autotests') >= 0, 'run_autotests should be proposed');

  DiagnosticInbox.clear();
});

console.log('\n' + '='.repeat(50));
console.log('DIAGNOSTIC: ' + _pass + ' pass | ' + _fail + ' fail');
console.log('='.repeat(50));

if (_fail > 0) process.exit(1);
