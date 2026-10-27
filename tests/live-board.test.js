import test from 'node:test';
import assert from 'node:assert/strict';
import {liveBoard,liveBoardUrl} from '../src/live-board.js';
const event={checkpoints:[{id:'a',name:'起點'},{id:'b',name:'終點'}],participants:[
 {id:'1',name:'Mia',checkins:{a:'2026-10-10T15:00:00Z',b:'2026-10-10T17:00:00Z'}},
 {id:'2',name:'阿安',checkins:{a:'2026-10-10T16:00:00Z',removed:'2026-10-11T03:00:00Z'}},
 {id:'3',name:'等待者',checkins:{}},
 {id:'4',name:'錯誤紀錄',checkins:{a:'invalid'}}
]};
test('board counts current stations and distinguishes no checkin from latest arrival',()=>{
 const m=liveBoard(event,'b');
 assert.deepEqual(m.summary,{total:4,started:2,complete:1,waiting:2});
 assert.deepEqual(m.stations.map(s=>[s.arrived,s.missing,s.latest]),[[2,2,'2026-10-10T16:00:00Z'],[1,3,'2026-10-10T17:00:00Z']]);
 assert.equal(m.rows[1].latest.checkpoint.name,'起點');
 assert.equal(m.rows[2].latest,null);
 assert.equal(m.rows[0].arrival,'2026-10-10T17:00:00Z');
});
test('station filters and name search use full station totals',()=>{
 const m=liveBoard(event,'b','missing',' 阿安 ');
 assert.deepEqual(m.rows.map(p=>p.id),['2']);
 assert.equal(m.selected.missing,3);
 assert.deepEqual(liveBoard(event,'b','arrived','mia').rows.map(p=>p.id),['1']);
 assert.equal(liveBoard(event,'gone').selected.id,'a');
});
test('empty events and no stations never report riders completed',()=>{
 assert.deepEqual(liveBoard({checkpoints:[],participants:event.participants}).summary,{total:4,started:0,complete:0,waiting:4});
 assert.equal(liveBoard({checkpoints:[],participants:[]}).selected,null);
 assert.equal(liveBoard({...event,participants:[]}).stations[0].arrived,0);
});
test('shared board links retain only public activity and page parameters',()=>{
 const u=new URL(liveBoardUrl('https://ride.example/path?checkpoint=secret&key=credential#old','ride / 1'));
 assert.equal(u.pathname,'/path');
 assert.deepEqual([...u.searchParams],[['event','ride / 1'],['page','live']]);
 assert.equal(u.hash,'');
});
