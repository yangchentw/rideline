import test from 'node:test';import assert from 'node:assert/strict';import {attendanceTimeline} from '../src/attendance-timeline.js';
test('timeline includes all riders, archived stations, cross-day times and checkpoint filters',()=>{
 const event={checkpoints:[{id:'a',name:'起點'},{id:'b',name:'終點'}],archivedCheckpoints:[{id:'c',name:'舊點',deletedAt:'2026-10-11'}],participants:[{id:'r1',name:'小安',checkins:{a:'2026-10-10T15:00:00Z',b:'2026-10-10T17:00:00Z',c:'2026-10-10T16:00:00Z'}},{id:'r2',name:'未到者',checkins:{}},{id:'r3',name:'資料異常',checkins:{a:'invalid'}}]};
 const m=attendanceTimeline(event);assert.equal(m.rows.length,3);assert.equal(m.count,3);assert.equal(m.span,7200000);assert.deepEqual(m.rows[0].points.map(p=>p.checkpointId),['a','c','b']);assert.equal(m.rows[1].points.length,0);assert.equal(m.rows[2].points.length,0);
 const filter=attendanceTimeline(event,'b');assert.equal(filter.rows.length,3);assert.equal(filter.count,1);assert.equal(filter.span,60000);assert.equal(filter.rows[0].points[0].name,'終點');
 const empty=attendanceTimeline({...event,participants:[]});assert.equal(empty.count,0);assert.equal(empty.span,60000);
});
