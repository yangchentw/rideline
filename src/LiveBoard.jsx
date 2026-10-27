import React,{useRef,useState} from 'react';
import {CheckCircle2,Clock,Flag,MapPin,RefreshCw,Search,Share2,Users} from 'lucide-react';
import {liveBoard} from './live-board';
import './live-board.css';

const stamp=value=>new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function Timestamp({value}){return <time dateTime={value}>{stamp(value)}</time>;}

export default function LiveBoard({event,mode,updatedAt,syncError,onShare,onRefresh}) {
  const [checkpointId,setCheckpointId]=useState(''),[status,setStatus]=useState('all'),[search,setSearch]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const listRef=useRef();
  const {summary,stations,selected,rows}=liveBoard(event,checkpointId,status,search);
  function choose(id,nextStatus='all') {
    setCheckpointId(id);setStatus(nextStatus);
    if(window.matchMedia('(max-width: 700px)').matches)listRef.current?.scrollIntoView({behavior:'instant',block:'start'});
  }
  async function refresh(){setRefreshing(true);try{await onRefresh();}finally{setRefreshing(false);}}
  return <section className="live-board" aria-label="活動即時看板">
    <header className="board-heading"><div><p className="board-eyebrow">每一次抵達，一起掌握</p><h2>活動即時看板</h2><p>各站打卡進度與夥伴名單，所有人皆可瀏覽。</p></div><button className="btn" onClick={onShare}><Share2 size={17}/>分享看板</button></header>
    <div className="board-sync">
      <div><strong>{event.endedAt?'活動已結束':mode==='demo'?'本機示範':'每 15 秒自動同步'}</strong>{event.endedAt&&<span>結束於 <Timestamp value={event.endedAt}/></span>}{mode==='demo'?<span>資料僅存在此瀏覽器，其他裝置不會共用。</span>:<span>最後更新：{updatedAt?<Timestamp value={updatedAt}/>:'等待同步'}</span>}</div>
      {mode==='shared'&&<button className="btn" disabled={refreshing} onClick={refresh}><RefreshCw size={16}/>{refreshing?'同步中…':'重新同步'}</button>}
    </div>
    {syncError&&<p className="board-sync-error" role="alert">同步暫停，顯示最後成功取得的資料。請檢查網路後重新同步。</p>}
    <div className="board-summary">{[
      ['參加人數',summary.total,Users],['已出發',summary.started,MapPin],['完成全部站點',summary.complete,Flag],['尚未出發',summary.waiting,Clock]
    ].map(([label,count,Icon])=><div key={label}><Icon size={18}/><span>{label}</span><strong>{count}<small>人</small></strong></div>)}</div>
    {!stations.length?<div className="panel board-empty"><MapPin size={26}/><p>目前尚未設定打卡點。</p></div>:<div className="board-layout">
      <section className="panel board-stations" aria-label="各站打卡進度"><header className="panel-head"><h2><MapPin size={18}/>各站進度</h2><span className="muted small">{stations.length} 個站點</span></header>
        <div className="board-station-list">{stations.map((station,index)=><article key={station.id} className={'board-station'+(selected.id===station.id?' is-selected':'')}>
          <button className="board-station-title" aria-pressed={selected.id===station.id} onClick={()=>choose(station.id)}><span className="number">{String(index+1).padStart(2,'0')}</span><strong>{station.name}</strong><small>{station.km??'—'} km</small></button>
          <div className="board-progress" role="progressbar" aria-label={`${station.name} 打卡進度`} aria-valuenow={station.arrived} aria-valuemin={0} aria-valuemax={Math.max(1,summary.total)} aria-valuetext={`${station.arrived} / ${summary.total} 人已打卡`}><span style={{width:`${summary.total?station.arrived/summary.total*100:0}%`}}/></div>
          <div className="board-station-counts"><button onClick={()=>choose(station.id,'arrived')} aria-label={`${station.name} 已打卡 ${station.arrived} 人`}>已打卡 <strong>{station.arrived}</strong> 人</button><button onClick={()=>choose(station.id,'missing')} aria-label={`${station.name} 未打卡 ${station.missing} 人`}>未打卡 <strong>{station.missing}</strong> 人</button></div>
          <p className="board-last">最近打卡：{station.latest?<Timestamp value={station.latest}/>:'尚無紀錄'}</p>
        </article>)}</div>
      </section>
      <section ref={listRef} className="panel board-people" aria-label="站點人員名單"><header className="board-people-heading"><h2>{selected.name}</h2><p>已打卡 {selected.arrived} 人 · 未打卡 {selected.missing} 人</p><label>查看站點<select value={selected.id} onChange={e=>{setCheckpointId(e.target.value);setStatus('all');}}>{stations.map(station=><option key={station.id} value={station.id}>{station.name}</option>)}</select></label></header>
        <div className="board-filters"><div className="board-tabs" role="group" aria-label="打卡狀態">{[['all','全部',summary.total],['arrived','已打卡',selected.arrived],['missing','未打卡',selected.missing]].map(([value,label,count])=><button key={value} aria-pressed={status===value} className={status===value?'active':''} onClick={()=>setStatus(value)}>{label} {count}</button>)}</div><label className="board-search"><Search size={17}/><input type="search" aria-label="搜尋看板姓名" placeholder="搜尋騎行名稱…" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
        <p className="board-list-count" role="status">顯示 {rows.length} / {summary.total} 位參加者</p>
        <ul className="board-person-list">{rows.map(row=><li key={row.id}><div className="board-person-name"><strong>{row.name}</strong><span className={row.arrival?'board-arrived':'board-missing'}>{row.arrival?<><CheckCircle2 size={14}/>已打卡</>:'未打卡'}</span></div><div className="board-person-detail">{row.arrival?<><span>抵達時間</span><Timestamp value={row.arrival}/></>:row.latest?<><span>最近打卡 · {row.latest.checkpoint.name}</span><Timestamp value={row.latest.at}/></>:<span>尚無打卡紀錄</span>}</div></li>)}</ul>
        {!rows.length&&<div className="board-empty"><Users size={26}/><p>{summary.total?'沒有符合條件的參加者。':'還沒有參加者加入活動。'}</p></div>}
        <p className="board-note">未打卡表示該站尚無紀錄，不代表落後或異常。</p>
      </section>
    </div>}
  </section>;
}
