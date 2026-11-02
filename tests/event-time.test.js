import test from 'node:test';
import assert from 'node:assert/strict';
import {taiwanDateTimeInput,validateEventStart,earliestEventStartInput} from '../src/event-time.js';
const now=Date.parse('2026-11-02T15:59:30Z');
test('creation default uses Taiwan time at opening, including date rollover',()=>{
  assert.equal(taiwanDateTimeInput(now),'2026-11-02T23:59');
  assert.equal(taiwanDateTimeInput(now+60000),'2026-11-03T00:00');
});
test('start must be strictly more than eight hours after submission time',()=>{
  for(const value of ['', 'invalid',new Date(now).toISOString(),new Date(now+8*3600000).toISOString()]){
    assert.throws(()=>validateEventStart(value,now),/出發日期與時間必須晚於現在 8 小時/);
  }
  assert.doesNotThrow(()=>validateEventStart(new Date(now+8*3600000+1).toISOString(),now));
  assert.throws(()=>validateEventStart(new Date(now+9*3600000).toISOString(),now+3600000),/出發日期與時間/);
  assert.equal(earliestEventStartInput(now),'2026-11-03T08:00');
  assert.equal(earliestEventStartInput(Date.parse('2026-11-02T16:00:00Z')),'2026-11-03T08:01');
});
