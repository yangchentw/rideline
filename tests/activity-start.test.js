import test from 'node:test';
import assert from 'node:assert/strict';
import {withUnifiedStart} from '../src/activity-start.js';
import {liveBoard} from '../src/live-board.js';
import {attendanceTimeline} from '../src/attendance-timeline.js';
import {csvFor} from '../src/domain.js';
const event={startsAt:'2026-11-03T00:00:00Z',checkpoints:[{id:'s',name:'起點',isStart:true},{id:'f',name:'終點'}],participants:[{id:'a',name:'A',joinedAt:'2026-11-02T00:00:00Z',checkins:{}},{id:'b',name:'B',joinedAt:'2026-11-03T01:00:00Z',checkins:{s:'2026-11-03T01:00:00Z',f:'2026-11-03T02:00:00Z'}}]};
test('all participants share the configured start, including late joiners, without mutating records',()=>{
 const next=withUnifiedStart(event);
 assert.deepEqual(next.participants.map(p=>p.checkins.s),[event.startsAt,event.startsAt]);
 assert.equal(event.participants[0].checkins.s,undefined);
 assert.equal(next.participants[1].checkins.f,event.participants[1].checkins.f);
 const legacy={...event,checkpoints:event.checkpoints.map(({isStart,...c})=>c)};
 assert.equal(withUnifiedStart(legacy),legacy);
});
test('board does not treat the planned shared start as actual departure before the event',()=>{
 const before=liveBoard(event,'s','all','',Date.parse(event.startsAt)-1);
 const after=liveBoard(event,'s','all','',Date.parse(event.startsAt));
 assert.equal(before.summary.started,0);
 assert.equal(before.summary.waiting,2);
 assert.equal(after.summary.started,2);
 assert.equal(after.summary.complete,1);
 assert.equal(after.rows[0].arrival,event.startsAt);
 assert.equal(liveBoard({...event,checkpoints:[event.checkpoints[0]]}).summary.complete,0);
});
test('timeline and CSV show the shared start for everyone while retaining real arrivals',()=>{
 assert.deepEqual(attendanceTimeline(event,'s').rows.map(r=>r.points[0].time),[event.startsAt,event.startsAt]);
 const csv=csvFor(event);
 assert.ok(csv.includes('起點（統一起始）'));
 assert.equal(csv.match(/2026\/11\/03\s+08:00:00/g)?.length,2);
});

test('start remains first even when a new station also has zero route distance',async()=>{
 const {checkpointOrder}=await import('../src/activity-start.js');
 const sorted=[{id:'new',km:0},{id:'s',km:0,isStart:true},{id:'end',km:20}].sort(checkpointOrder);
 assert.equal(sorted[0].id,'s');
});

test('latest real checkin takes precedence over the planned shared start',()=>{
 const early={...event,participants:[{id:'a',name:'A',checkins:{f:'2026-11-02T23:50:00Z'}}]};
 assert.equal(liveBoard(early).rows[0].latest.checkpoint.id,'f');
});
