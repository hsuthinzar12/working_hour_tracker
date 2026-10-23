'use client'

import { useEffect, useMemo, useState } from 'react'

type Entry = { id:string; worker_id:string; worker_name:string; work_date:string; working_place:string; project:string; working_hours:number }
type Profile = { id:string; name:string }
const projects = ['Kingdao','Creative','Namhong']
const quickHours = [4,6,8,10]
const todayIso = () => new Date().toISOString().slice(0,10)

export default function WorkerPage(){
  const [view,setView]=useState<'submit'|'history'|'profile'|'success'>('submit')
  const [profile,setProfile]=useState<Profile>({id:'',name:''})
  const [date,setDate]=useState(todayIso())
  const [place,setPlace]=useState('')
  const [project,setProject]=useState('Kingdao')
  const [workingPlaces,setWorkingPlaces]=useState<{id:string;name:string}[]>([])
  const [placesLoading,setPlacesLoading]=useState(false)
  const [hours,setHours]=useState<number|string>(8)
  const [month,setMonth]=useState(todayIso().slice(0,7))
  const [history,setHistory]=useState<Entry[]>([])
  const [loading,setLoading]=useState(false)
  const [message,setMessage]=useState('')
  const total=useMemo(()=>history.reduce((s,x)=>s+Number(x.working_hours||0),0),[history])

  useEffect(()=>{ const saved=localStorage.getItem('workerProfile'); if(saved){try{setProfile(JSON.parse(saved))}catch{}} else setView('profile') },[])
  async function loadHistory(){
    if(!profile.id)return
    setLoading(true)
    setMessage('')
    try {
      const r=await fetch(`/api/my-entries?worker_id=${encodeURIComponent(profile.id)}&month=${month}`)
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setMessage(d.error||'Could not load history.');return}
      setHistory(d.entries||[])
    } catch {
      setMessage('Could not connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{ if(view==='history') loadHistory() },[view,month,profile.id])
  function saveProfile(){ if(!profile.id.trim()||!profile.name.trim()){setMessage('Worker ID and name are required.');return} localStorage.setItem('workerProfile',JSON.stringify(profile)); setMessage(''); setView('submit') }
  async function submit(){
    if(!profile.id||!profile.name){setView('profile');return}
    if(!place.trim()){setMessage('Please enter working place.');return}
    const h=Number(hours); if(!h||h<=0||h>24){setMessage('Please enter valid working hours.');return}
    setLoading(true); setMessage('')
    try {
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({worker_id:profile.id,worker_name:profile.name,work_date:date,working_place:place.trim(),project,working_hours:h})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setMessage(d.error||'Could not save working hours.');return}
      setView('success')
    } catch {
      setMessage('Could not connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(()=>{
  async function loadWorkingPlaces(){
    setPlacesLoading(true)
    setPlace('')

    try {
      const r = await fetch(
        `/api/working-places?project=${encodeURIComponent(project)}`
      )

      const d = await r.json()

      if (!r.ok) {
        setWorkingPlaces([])
        return
      }

      setWorkingPlaces(d.places || [])
    } catch {
      setWorkingPlaces([])
    } finally {
      setPlacesLoading(false)
    }
  }
  loadWorkingPlaces()
  },[project])

  return <main className="worker-shell">
    {view==='submit' && <>
      <header className="mobile-hero"><div className="eyebrow">Working Hour Tracker</div><h1>Submit Working Hours</h1><p>{new Date(date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</p></header>
      <section className="mobile-body">
        <div className="card worker-card"><div className="avatar">👷</div><div><b>{profile.id?`${profile.id} • ${profile.name}`:'Set worker profile'}</b><span>Construction Worker</span></div><button className="link-btn" onClick={()=>setView('profile')}>Edit</button></div>
        <div className="card form-card">
          <label>Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <label>Project</label><div className="choice-grid three">{projects.map(p=><button key={p} className={project===p?'choice active':'choice'} onClick={()=>setProject(p)}>{p}</button>)}</div>
          <label>Working Place</label>
          <select
            value={place}
            onChange={(e)=>setPlace(e.target.value)}
            disabled={placesLoading || workingPlaces.length === 0}
            required
          >
          <option value="">
            {placesLoading
              ? 'Loading working places...'
              : workingPlaces.length === 0
              ? 'No working places available'
              : 'Select working place'}
          </option>
          {workingPlaces.map((item)=>(
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
          </select>
          <label>Working Hours</label><div className="choice-grid four">{quickHours.map(h=><button key={h} className={Number(hours)===h?'choice active':'choice'} onClick={()=>setHours(h)}>{h}</button>)}</div>
          <input className="hours-input" type="number" inputMode="decimal" min="0.5" max="24" step="0.5" placeholder="Other hours" value={typeof hours==='string'?hours:''} onChange={e=>setHours(e.target.value)} />
          {message&&<p className="error">{message}</p>}
          <button className="primary-btn" onClick={submit} disabled={loading}>{loading?'Saving...':'Submit Hours'}</button>
        </div>
      </section>
    </>}

    {view==='profile' && <section className="standalone"><div className="card form-card"><h2>Worker Profile</h2><p className="muted">Set this once on the worker's phone.</p><label>Worker ID</label><input placeholder="W-001" value={profile.id} onChange={e=>setProfile({...profile,id:e.target.value})}/><label>Worker Name</label><input placeholder="Mg Mg" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/>{message&&<p className="error">{message}</p>}<button className="primary-btn" onClick={saveProfile}>Save Profile</button></div></section>}

    {view==='success' && <section className="success-screen"><div className="success-icon">✓</div><h1>Hours Submitted</h1><p>Your working hours were recorded successfully.</p><div className="card summary-card"><div><span>Date</span><b>{date}</b></div><div><span>Project</span><b>{project}</b></div><div><span>Working Place</span><b>{place}</b></div><div><span>Hours</span><b>{hours} hrs</b></div></div><button className="primary-btn" onClick={()=>{setPlace('');setHours(8);setView('submit')}}>Done</button><button className="text-btn" onClick={()=>setView('history')}>View History</button></section>}

    {view==='history' && <><header className="mobile-hero compact"><div className="eyebrow">My Working Hours</div><h1>History</h1></header><section className="mobile-body"><div className="card"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/><div className="month-total"><span>Total this month</span><b>{total.toFixed(1).replace('.0','')} hrs</b></div><div className="history-list">{loading?<p className="muted">Loading...</p>:history.length?history.map(x=><div className="history-row" key={x.id}><div><b>{new Date(x.work_date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}</b><span>{x.working_place}</span></div><div><b>{x.project}</b><span>{x.working_hours} hrs</span></div></div>):<p className="muted">No records this month.</p>}</div></div></section></>}

    {view!=='profile'&&view!=='success'&&<nav className="bottom-nav"><button className={view==='submit'?'active':''} onClick={()=>setView('submit')}>⌂<span>Submit</span></button><button className={view==='history'?'active':''} onClick={()=>setView('history')}>▣<span>History</span></button></nav>}
  </main>
}
