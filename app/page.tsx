'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown,
  ClipboardCheck, Clock3, HardHat, History, House, LoaderCircle,
  LogOut, MapPin, RefreshCw, ShieldCheck, UserRound, X,
  AlertCircle, KeyRound, ListChecks,
} from 'lucide-react'

type Entry = { id:string; worker_id:string; worker_name:string; work_date:string; working_place:string; project:string; working_hours:number }
type Profile = {id:string;name:string;must_change_password:boolean}
type WorkingPlace = {id:string;project:string;name:string}
type View = 'checking'|'login'|'change-password'|'submit'|'history'|'success'
type DuplicateResult = {duplicate:boolean;same_day_entries:{id:string;project:string;working_place:string;working_hours:number}[]}
const projects = ['Kingdao','Creative','Namhong'] as const
const quickHours = [4,6,8,10] as const
const todayIso = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const displayDate = (iso:string, opts?:Intl.DateTimeFormatOptions) => {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y,m,d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB',opts||{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d))
}
const displayMonth = (month:string) => {
  if(!/^\d{4}-\d{2}$/.test(month))return month
  const [year,m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(year,m-1,1))
}
const monthRange = (month:string) => {
  const [year,m]=month.split('-').map(Number)
  if(!year||!m)return ''
  const end = new Date(year,m,0).getDate()
  return `${displayMonth(month).split(' ')[0]} 1–${end}, ${year}`
}
const fmt = (n:number) => Number(n||0).toFixed(1).replace(/\.0$/,'')
const initials = (name:string) => name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'W'

export default function WorkerPage(){
  const [view,setView]=useState<View>('checking')
  const [profile,setProfile]=useState<Profile|null>(null)
  const [workerId,setWorkerId]=useState(''),[password,setPassword]=useState('')
  const [oldPassword,setOldPassword]=useState(''),[newPassword,setNewPassword]=useState('')
  const [authLoading,setAuthLoading]=useState(false),[authError,setAuthError]=useState('')
  const [date,setDate]=useState(todayIso())
  const [project,setProject]=useState<string>('Kingdao'),[place,setPlace]=useState('')
  const [availablePlaces,setAvailablePlaces]=useState<WorkingPlace[]>([])
  const [placesLoading,setPlacesLoading]=useState(false),[placesError,setPlacesError]=useState('')
  const [placesRetry,setPlacesRetry]=useState(0)
  const [hoursChoice,setHoursChoice]=useState<number|'other'>(8),[customHours,setCustomHours]=useState('')
  const [submitError,setSubmitError]=useState(''),[submitting,setSubmitting]=useState(false)
  const [checkingDuplicate,setCheckingDuplicate]=useState(false)
  const [duplicate,setDuplicate]=useState<DuplicateResult|null>(null),[duplicateError,setDuplicateError]=useState('')
  const [duplicateRetry,setDuplicateRetry]=useState(0)
  const [month,setMonth]=useState(todayIso().slice(0,7))
  const [history,setHistory]=useState<Entry[]>([]),[historyLoading,setHistoryLoading]=useState(false),[historyError,setHistoryError]=useState('')
  const [historyRetry,setHistoryRetry]=useState(0)
  const [accountOpen,setAccountOpen]=useState(false)
  const [lastSubmitted,setLastSubmitted]=useState<Entry|null>(null)
  const selectedHours=hoursChoice==='other'?Number(customHours):hoursChoice
  const validHours=hoursChoice==='other'?customHours.trim()!==''&&Number.isFinite(selectedHours)&&selectedHours>0&&selectedHours<=24:Number.isFinite(selectedHours)
  const total=useMemo(()=>history.reduce((s,x)=>s+Number(x.working_hours||0),0),[history])
  const canSubmit=!!profile&&!!place&&!placesLoading&&!placesError&&!checkingDuplicate&&!duplicateError&&!duplicate?.duplicate&&validHours&&!submitting

  useEffect(()=>{
    let live=true
    ;(async()=>{
      try{
        const r=await fetch('/api/worker/session',{cache:'no-store'})
        if(!live)return
        if(!r.ok){setView('login');return}
        const data=await r.json()
        setProfile(data.worker)
        setView(data.worker.must_change_password?'change-password':'submit')
      }catch{if(live)setView('login')}
    })()
    return()=>{live=false}
  },[])

  useEffect(()=>{
    if(!accountOpen)return
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setAccountOpen(false)}
    document.addEventListener('keydown',onKey)
    return()=>document.removeEventListener('keydown',onKey)
  },[accountOpen])

  async function login(){
    if(!workerId.trim()||!password){setAuthError('Enter your Worker ID and password.');return}
    setAuthLoading(true);setAuthError('')
    try{
      const r=await fetch('/api/worker/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workerId:workerId.trim(),password})})
      const data=await r.json().catch(()=>({}))
      if(!r.ok){setAuthError(data.error||'Could not sign in.');return}
      setProfile(data.worker);setWorkerId('');setPassword('')
      setView(data.worker.must_change_password?'change-password':'submit')
    }catch{setAuthError('Connection failed. Check your internet and try again.')}
    finally{setAuthLoading(false)}
  }
  async function changePassword(){
    setAuthLoading(true);setAuthError('')
    try{
      const r=await fetch('/api/worker/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oldPassword,newPassword})})
      const data=await r.json().catch(()=>({}))
      if(r.status===401){setView('login');return}
      if(!r.ok){setAuthError(data.error||'Could not change password.');return}
      setProfile(p=>p?{...p,must_change_password:false}:p)
      setOldPassword('');setNewPassword('');setView('submit')
    }catch{setAuthError('Connection failed. Check your internet and try again.')}
    finally{setAuthLoading(false)}
  }
  async function logout(){
    setAccountOpen(false)
    try{await fetch('/api/worker/logout',{method:'POST'})}finally{
      setProfile(null);setHistory([]);setView('login');setAuthError('');setAuthLoading(false)
      setOldPassword('');setNewPassword('');setDuplicate(null)
    }
  }

  useEffect(()=>{
    if(view!=='submit')return
    const controller=new AbortController()
    setPlace('');setAvailablePlaces([]);setPlacesError('');setPlacesLoading(true)
    ;(async()=>{
      try{
        const r=await fetch(`/api/working-places?project=${encodeURIComponent(project)}`,{cache:'no-store',signal:controller.signal})
        const data=await r.json().catch(()=>({}))
        if(!r.ok)throw new Error(data.error||'Could not load working places.')
        setAvailablePlaces(data.places||[])
      }catch(err){
        if(controller.signal.aborted)return
        setPlacesError('Could not load working places. Check your connection.')
      }finally{if(!controller.signal.aborted)setPlacesLoading(false)}
    })()
    return()=>controller.abort()
  },[view,project,placesRetry])

  // Check the selected date/project/place before submission. The POST route rechecks server-side.
  useEffect(()=>{
    if(view!=='submit'||!profile||!place){setDuplicate(null);setDuplicateError('');setCheckingDuplicate(false);return}
    const controller=new AbortController()
    setCheckingDuplicate(true);setDuplicate(null);setDuplicateError('')
    const timer=setTimeout(async()=>{
      try{
        const qs=new URLSearchParams({date,project,working_place:place})
        const r=await fetch(`/api/entries/check?${qs}`,{cache:'no-store',signal:controller.signal})
        const data=await r.json().catch(()=>({}))
        if(r.status===401){setView('login');return}
        if(!r.ok)throw new Error(data.error||'Could not check entries.')
        if(!controller.signal.aborted)setDuplicate(data)
      }catch{
        if(!controller.signal.aborted)setDuplicateError('Could not check existing entries. Please retry.')
      }finally{if(!controller.signal.aborted)setCheckingDuplicate(false)}
    },250)
    return()=>{clearTimeout(timer);controller.abort()}
  },[view,profile?.id,date,project,place,duplicateRetry])

  useEffect(()=>{
    if(view!=='history')return
    const controller=new AbortController()
    setHistoryLoading(true);setHistoryError('')
    ;(async()=>{
      try{
        const r=await fetch(`/api/my-entries?month=${encodeURIComponent(month)}`,{cache:'no-store',signal:controller.signal})
        const data=await r.json().catch(()=>({}))
        if(r.status===401){setView('login');return}
        if(!r.ok)throw new Error(data.error||'Could not load history.')
        if(!controller.signal.aborted)setHistory(data.entries||[])
      }catch{if(!controller.signal.aborted)setHistoryError('Could not load your records. Check your connection and retry.')}
      finally{if(!controller.signal.aborted)setHistoryLoading(false)}
    })()
    return()=>controller.abort()
  },[view,month,historyRetry])

  async function submit(){
    if(!canSubmit)return
    setSubmitting(true);setSubmitError('')
    try{
      // Recheck immediately in case another submission was made on a different device.
      const qs=new URLSearchParams({date,project,working_place:place})
      const checkResponse=await fetch(`/api/entries/check?${qs}`,{cache:'no-store'})
      const check=await checkResponse.json().catch(()=>({}))
      if(checkResponse.status===401){setView('login');return}
      if(!checkResponse.ok)throw new Error(check.error||'Could not verify existing entries.')
      if(check.duplicate){setDuplicate(check);setSubmitError('These hours are already recorded. Check History.');return}
      const r=await fetch('/api/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({work_date:date,working_place:place,project,working_hours:selectedHours})})
      const data=await r.json().catch(()=>({}))
      if(r.status===401){setView('login');return}
      if(r.status===409){setDuplicateRetry(x=>x+1);setSubmitError(data.error||'These hours are already recorded.');return}
      if(!r.ok){setSubmitError(data.error||'Could not save working hours.');return}
      setLastSubmitted(data.entry)
      setView('success')
    }catch(err){setSubmitError(err instanceof Error?err.message:'Connection failed. Please retry.')}
    finally{setSubmitting(false)}
  }

  const changePage=(next:'submit'|'history')=>{setAccountOpen(false);setSubmitError('');setView(next)}
  const header=(title:string,subtitle:string)=> <header className="worker-page-header">
    <div className="worker-header-copy"><div className="worker-brand-line"><Clock3 size={17} strokeWidth={2}/><span>WORKING HOUR TRACKER</span></div><h1>{title}</h1><p>{subtitle}</p></div>
    <button type="button" className="account-trigger" aria-label="Open account menu" aria-haspopup="dialog" onClick={()=>setAccountOpen(true)}><UserRound size={23} strokeWidth={1.9}/></button>
  </header>

  if(view==='checking')return <main className="worker-auth-page"><div className="worker-auth-card" aria-live="polite"><div className="auth-mark"><Clock3 size={26}/></div><div className="skeleton skeleton-title"/><div className="skeleton skeleton-line"/><div className="skeleton skeleton-field"/><div className="skeleton skeleton-field"/></div></main>
  if(view==='login')return <main className="worker-auth-page"><form className="worker-auth-card" onSubmit={e=>{e.preventDefault();void login()}}><div className="auth-mark"><HardHat size={27} strokeWidth={1.9}/></div><span className="auth-eyebrow">WORKING HOUR TRACKER</span><h1>Worker Login</h1><p className="worker-subtitle">Sign in to record your working hours.</p><label htmlFor="worker-id">Worker ID</label><input id="worker-id" name="username" value={workerId} onChange={e=>setWorkerId(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Enter your Worker ID" maxLength={60} required/><label htmlFor="worker-password">Password</label><input id="worker-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required/>{authError&&<p className="worker-alert danger" role="alert"><AlertCircle size={19}/>{authError}</p>}<button type="submit" className="worker-main-button" disabled={authLoading}>{authLoading?<><LoaderCircle size={20} className="spin"/>Signing in...</>:<>Log in <ArrowRight size={20}/></>}</button><p className="worker-helper">First time? Your temporary password is your Worker ID. You will be asked to change it after signing in.</p></form></main>
  if(view==='change-password')return <main className="worker-auth-page"><form className="worker-auth-card" onSubmit={e=>{e.preventDefault();void changePassword()}}><div className="auth-mark"><KeyRound size={27}/></div><span className="auth-eyebrow">ACCOUNT SECURITY</span><h1>Set Your Password</h1><p className="worker-subtitle">{profile?.name} · {profile?.id}</p><p className="worker-helper">Change your temporary password to a private password with at least 8 characters.</p><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} required/><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={8} placeholder="At least 8 characters" required/>{authError&&<p className="worker-alert danger" role="alert"><AlertCircle size={19}/>{authError}</p>}<button className="worker-main-button" type="submit" disabled={authLoading}>{authLoading?<><LoaderCircle size={20} className="spin"/>Saving...</>:<>Save password <Check size={20}/></>}</button>{!profile?.must_change_password&&<button className="worker-quiet-button" type="button" onClick={()=>{setAuthError('');setView('submit')}}>Cancel</button>}<button className="worker-quiet-button" type="button" onClick={()=>void logout()}>Log out</button></form></main>

  return <main className="worker-shell worker-app">
    {view==='submit'&&<>
      {header('Submit Hours','Record your working hours for the day.')}
      <div className="worker-page-content">
        <div className="worker-profile-strip"><div className="worker-avatar">{initials(profile?.name||'Worker')}</div><div><strong>{profile?.name}</strong><span>Worker ID: {profile?.id}</span></div><ShieldCheck className="profile-check" size={21} strokeWidth={1.8}/></div>
        <section className="worker-form-panel" aria-label="Working hours form">
          <div className="worker-field"><label htmlFor="work-date"><CalendarDays size={19}/>Work Date</label><input type="date" id="work-date" value={date} onChange={e=>{setDate(e.target.value);setSubmitError('')}} required/></div>
          <div className="worker-field"><div className="worker-field-label"><ListChecks size={19}/>Select Project</div><div className="project-picks" role="group" aria-label="Select project">{projects.map(p=><button type="button" key={p} className={`project-pick ${project===p?'selected':''}`} aria-pressed={project===p} onClick={()=>{setProject(p);setPlace('');setSubmitError('')}}>{project===p&&<Check size={17} strokeWidth={2.5}/>}<span>{p}</span></button>)}</div></div>
          <div className="worker-field"><label htmlFor="work-place"><MapPin size={19}/>Working Place</label><div className="worker-select-wrap"><select id="work-place" value={place} required disabled={placesLoading||!!placesError||availablePlaces.length===0} onChange={e=>{setPlace(e.target.value);setSubmitError('')}}><option value="">{placesLoading?'Loading working places...':placesError?'Unable to load places':availablePlaces.length===0?'No places assigned':'Select working place'}</option>{availablePlaces.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select><ChevronDown size={20} aria-hidden className="select-chevron"/></div>{placesLoading?<div className="worker-hint"><LoaderCircle className="spin" size={16}/>Loading locations...</div>:placesError?<div className="worker-inline-error" role="alert"><AlertCircle size={18}/><span>{placesError}</span><button type="button" onClick={()=>setPlacesRetry(x=>x+1)}>Retry</button></div>:availablePlaces.length===0?<p className="worker-hint">No working places assigned to {project}. Please contact your admin.</p>:null}</div>
          <div className="worker-field"><div className="worker-field-label"><Clock3 size={19}/>Working Hours</div><div className="hour-picks" role="group" aria-label="Select working hours">{quickHours.map(h=><button type="button" key={h} className={`hour-pick ${hoursChoice===h?'selected':''}`} aria-pressed={hoursChoice===h} onClick={()=>{setHoursChoice(h);setSubmitError('')}}>{h}h</button>)}<button type="button" className={`hour-pick other ${hoursChoice==='other'?'selected':''}`} aria-pressed={hoursChoice==='other'} onClick={()=>{setHoursChoice('other');setSubmitError('')}}>Other</button></div>{hoursChoice==='other'&&<div className="other-hours-field"><label htmlFor="custom-hours">Enter working hours</label><input id="custom-hours" type="number" inputMode="decimal" min="0.5" max="24" step="0.5" value={customHours} onChange={e=>{setCustomHours(e.target.value);setSubmitError('')}} placeholder="e.g. 7.5" autoFocus/><span>hours</span></div>}{validHours&&<div className="selected-hours-line"><span>Selected working hours</span><strong>{fmt(selectedHours)} hrs</strong></div>}</div>
          {checkingDuplicate&&<p className="worker-hint"><LoaderCircle size={16} className="spin"/>Checking existing records...</p>}
          {duplicate?.duplicate&&<div className="worker-alert warning" role="status"><AlertCircle size={20}/><div><strong>Already submitted</strong><p>Hours for this date, project and working place have already been recorded. Check your History.</p><button type="button" onClick={()=>changePage('history')}>View History <ArrowRight size={16}/></button></div></div>}
          {!duplicate?.duplicate&&!checkingDuplicate&&duplicate?.same_day_entries?.length? <div className="worker-alert notice"><CheckCircle2 size={19}/><span>{duplicate.same_day_entries.length} other work record(s) already exist for {displayDate(date)}.</span></div>:null}
          {duplicateError&&<div className="worker-inline-error" role="alert"><AlertCircle size={18}/><span>{duplicateError}</span><button type="button" onClick={()=>setDuplicateRetry(x=>x+1)}>Retry</button></div>}
          {submitError&&<p className="worker-alert danger" role="alert"><AlertCircle size={20}/>{submitError}</p>}
          <button type="button" className="worker-main-button worker-submit-button" disabled={!canSubmit} onClick={()=>void submit()}>{submitting?<><LoaderCircle size={21} className="spin"/>Submitting...</>:<> <ClipboardCheck size={21}/>{validHours?`Submit ${fmt(selectedHours)} Hours`:'Select Working Hours'}<ArrowRight size={19}/></>}</button>
        </section>
      </div>
    </>}

    {view==='history'&&<>
      {header('History','Your monthly working hour records.')}
      <div className="worker-page-content">
        <div className="worker-month-control"><label htmlFor="history-month"><CalendarDays size={19}/>Select Month</label><input type="month" id="history-month" value={month} onChange={e=>setMonth(e.target.value)}/></div>
        <section className="worker-month-summary" aria-label="Monthly total"><div className="summary-top"><span>Total Hours This Month</span><Clock3 size={20}/></div>{historyLoading?<div className="skeleton skeleton-total"/>:<div className="summary-number">{fmt(total)} <small>hrs</small></div>}<p>{monthRange(month)}</p></section>
        <div className="worker-record-heading"><h2>Work Records</h2><span>{historyLoading?'...':`${history.length} ${history.length===1?'entry':'entries'}`}</span></div>
        {historyError?<div className="worker-empty-card" role="alert"><AlertCircle size={36}/><h3>Unable to load records</h3><p>{historyError}</p><button className="worker-outline-button" type="button" onClick={()=>setHistoryRetry(x=>x+1)}><RefreshCw size={18}/>Try again</button></div>:historyLoading?<div className="worker-record-list" aria-busy="true">{[1,2,3].map(i=><div className="worker-record-card" key={i}><div className="skeleton skeleton-row-title"/><div className="skeleton skeleton-row-sub"/></div>)}</div>:history.length===0?<div className="worker-empty-card"><div className="worker-empty-icon"><History size={34} strokeWidth={1.5}/></div><h3>No working hours recorded</h3><p>You haven’t submitted any working hours for {displayMonth(month)}.</p><button type="button" className="worker-outline-button" onClick={()=>changePage('submit')}>Go to Submit Hours <ArrowRight size={18}/></button></div>:<div className="worker-record-list">{history.map(entry=><article className="worker-record-card" key={entry.id}><div className="record-details"><span className="record-date"><CalendarDays size={17}/>{displayDate(entry.work_date)}</span><strong>{entry.project}</strong><span className="record-location"><MapPin size={16}/>{entry.working_place}</span></div><span className="record-hours">{fmt(Number(entry.working_hours))} hrs</span></article>)}</div>}
      </div>
    </>}

    {view==='success'&&<section className="worker-success-page" aria-live="polite"><div className="worker-success-badge"><Check size={41} strokeWidth={2.6}/></div><h1>Hours Submitted!</h1><p>Your working hours have been saved successfully.</p><div className="worker-success-summary"><div><span><CalendarDays size={18}/>Work date</span><strong>{displayDate(lastSubmitted?.work_date||date)}</strong></div><div><span><ListChecks size={18}/>Project</span><strong>{lastSubmitted?.project||project}</strong></div><div><span><MapPin size={18}/>Working place</span><strong>{lastSubmitted?.working_place||place}</strong></div><div><span><Clock3 size={18}/>Working hours</span><strong>{fmt(Number(lastSubmitted?.working_hours??selectedHours))} hrs</strong></div></div><button type="button" className="worker-main-button" onClick={()=>{setPlace('');setHoursChoice(8);setCustomHours('');setLastSubmitted(null);changePage('submit')}}>Done <Check size={19}/></button><button type="button" className="worker-quiet-button" onClick={()=>changePage('history')}>View my history <ArrowRight size={17}/></button></section>}

    {(view==='submit'||view==='history')&&<nav className="worker-bottom-nav" aria-label="Main navigation"><button type="button" className={view==='submit'?'active':''} aria-current={view==='submit'?'page':undefined} onClick={()=>changePage('submit')}><House size={23} strokeWidth={1.9}/><span>Submit</span></button><button type="button" className={view==='history'?'active':''} aria-current={view==='history'?'page':undefined} onClick={()=>changePage('history')}><History size={23} strokeWidth={1.9}/><span>History</span></button></nav>}

    {accountOpen&&(view==='submit'||view==='history')&&<div className="worker-sheet-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAccountOpen(false)}}><section className="worker-account-sheet" role="dialog" aria-modal="true" aria-label="Account menu"><div className="sheet-handle"/><div className="sheet-title"><h2>My Account</h2><button type="button" aria-label="Close account menu" onClick={()=>setAccountOpen(false)}><X size={23}/></button></div><div className="account-identity"><div className="worker-avatar">{initials(profile?.name||'Worker')}</div><div><strong>{profile?.name}</strong><span>Worker ID: {profile?.id}</span></div></div><button type="button" className="sheet-menu-row" onClick={()=>{setAccountOpen(false);setAuthError('');setView('change-password')}}><KeyRound size={20}/>Change password <ArrowRight size={18}/></button><button type="button" className="sheet-menu-row logout" onClick={()=>void logout()}><LogOut size={20}/>Log out <ArrowRight size={18}/></button></section></div>}
  </main>
}
