'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Entry={id:string;worker_id:string;worker_name:string;work_date:string;working_place:string;project:string;working_hours:number}
type WorkingPlace={id:string;project:string;name:string;is_active:boolean;created_at:string}
type AdminView='dashboard'|'places'|'workers'
type WorkerRow={id:string;worker_id:string;worker_name:string;is_active:boolean;must_change_password:boolean}
const projects=['Kingdao','Creative','Namhong']
const monthNow=()=>new Date().toISOString().slice(0,7)
const fmt=(n:number)=>Number(n||0).toFixed(1).replace('.0','')

export default function AdminPage(){
  const [authed,setAuthed]=useState(false),[password,setPassword]=useState(''),[loginError,setLoginError]=useState('')
  const [view,setView]=useState<AdminView>('dashboard')
  const [month,setMonth]=useState(monthNow()),[project,setProject]=useState(''),[place,setPlace]=useState(''),[search,setSearch]=useState('')
  const [entries,setEntries]=useState<Entry[]>([]),[loading,setLoading]=useState(false),[fetchError,setFetchError]=useState('')
  const [workingPlaces,setWorkingPlaces]=useState<WorkingPlace[]>([]),[placesLoading,setPlacesLoading]=useState(false),[placesError,setPlacesError]=useState('')
  const [newPlaceProject,setNewPlaceProject]=useState('Kingdao'),[newPlaceName,setNewPlaceName]=useState(''),[savingPlace,setSavingPlace]=useState(false)
  const [workers,setWorkers]=useState<WorkerRow[]>([]),[workerError,setWorkerError]=useState(''),[workerStatus,setWorkerStatus]=useState(''),[importing,setImporting]=useState(false),[workerSearch,setWorkerSearch]=useState('')
  const [newWorkerName,setNewWorkerName]=useState(''),[newWorkerId,setNewWorkerId]=useState(''),[savingWorker,setSavingWorker]=useState(false),[deletingWorkerId,setDeletingWorkerId]=useState<string|null>(null)
  const [workerModalOpen,setWorkerModalOpen]=useState(false),[workerModalMode,setWorkerModalMode]=useState<'manual'|'csv'>('manual'),[workerModalError,setWorkerModalError]=useState('')
  const [workersLoading,setWorkersLoading]=useState(false)
  const workerModalTriggerRef=useRef<HTMLButtonElement>(null)
  const workerModalWasOpenRef=useRef(false)
  useEffect(()=>{
    if(workerModalOpen){workerModalWasOpenRef.current=true}
    else if(workerModalWasOpenRef.current){workerModalTriggerRef.current?.focus();workerModalWasOpenRef.current=false}
  },[workerModalOpen])

  async function load(){
    setLoading(true)
    setFetchError('')
    try {
      const qs=new URLSearchParams({month,project,place,search})
      const r=await fetch('/api/admin/entries?'+qs,{cache:'no-store'})
      if(r.status===401){setAuthed(false);return}
      if(!r.ok) throw new Error(`Admin API returned ${r.status}`)
      const d=await r.json()
      setEntries(d.entries||[])
      setAuthed(true)
    } catch {
      setFetchError('Could not refresh data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function loadWorkingPlaces(){
    setPlacesLoading(true)
    setPlacesError('')
    try{
      const r=await fetch('/api/admin/working-places',{cache:'no-store'})
      if(r.status===401){setAuthed(false);return}
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setPlacesError(d.error||'Could not load working places.');return}
      setWorkingPlaces(d.places||[])
    }catch{
      setPlacesError('Could not load working places. Please try again.')
    }finally{
      setPlacesLoading(false)
    }
  }

  useEffect(()=>{if(!authed||view!=='dashboard')return; void load()},[authed,view,month,project,place,search])
  useEffect(()=>{if(!authed||view!=='dashboard')return; const t=setInterval(()=>{void load()},15000); return()=>clearInterval(t)},[authed,view,month,project,place,search])
  useEffect(()=>{if(!authed||view!=='places')return; void loadWorkingPlaces()},[authed,view])
  useEffect(()=>{if(!authed||view!=='workers')return; void loadWorkers()},[authed,view])

  async function loadWorkers(){
    setWorkersLoading(true)
    setWorkerError('')
    try{
      const r=await fetch('/api/admin/workers',{cache:'no-store'})
      if(r.status===401){setAuthed(false);return}
      const data=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(data.error||'Could not load workers.')
      setWorkers(data.workers||[])
    }catch(e){setWorkerError(e instanceof Error?e.message:'Could not load workers.')}
    finally{setWorkersLoading(false)}
  }
  function openWorkerModal(mode:'manual'|'csv'='manual'){
    setWorkerModalMode(mode)
    setWorkerModalError('')
    setNewWorkerName('')
    setNewWorkerId('')
    setWorkerModalOpen(true)
  }
  function closeWorkerModal(){
    if(savingWorker||importing)return
    setWorkerModalOpen(false)
    setWorkerModalError('')
  }
  // Close on Escape, trap keyboard focus, and prevent background scrolling.
  useEffect(()=>{
    if(!workerModalOpen)return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(!savingWorker&&!importing){event.preventDefault();setWorkerModalOpen(false);setWorkerModalError('')}
        return
      }
      if(event.key!=='Tab')return
      const dialog=document.getElementById('worker-add-dialog')
      if(!dialog)return
      const focusable=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')).filter(node=>node.getClientRects().length>0)
      if(!focusable.length)return
      const first=focusable[0],last=focusable[focusable.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',onKeyDown)
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKeyDown)}
  },[workerModalOpen,savingWorker,importing])

  async function addWorker(){
    const name=newWorkerName.trim().replace(/\s+/g,' ')
    const id=newWorkerId.trim()
    setWorkerModalError('');setWorkerStatus('')
    if(!name||!id){setWorkerModalError('Enter both Worker Name and Worker ID.');return}
    if(name.length>120||id.length>60){setWorkerModalError('Name must be up to 120 characters and Worker ID up to 60.');return}
    setSavingWorker(true)
    try{
      const r=await fetch('/api/admin/workers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({worker:{name,id}})})
      const data=await r.json().catch(()=>({}))
      if(r.status===401){setAuthed(false);return}
      if(!r.ok)throw new Error(data.error||'Could not add worker.')
      setWorkerModalOpen(false)
      setNewWorkerName('');setNewWorkerId('')
      setWorkerStatus(`${name} (${id}) was added successfully.`)
      await loadWorkers()
    }catch(e){setWorkerModalError(e instanceof Error?e.message:'Could not add worker.')}
    finally{setSavingWorker(false)}
  }
  async function deleteWorker(worker:WorkerRow){
    if(!confirm(`Delete the account for ${worker.worker_name} (${worker.worker_id})?\n\nThey will no longer be able to log in. Existing working-hour records will be kept. This account deletion cannot be undone.`))return
    setWorkerError('');setWorkerStatus('');setDeletingWorkerId(worker.id)
    try{
      const r=await fetch('/api/admin/workers',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:worker.id})})
      const data=await r.json().catch(()=>({}))
      if(r.status===401){setAuthed(false);return}
      if(!r.ok)throw new Error(data.error||'Could not delete worker.')
      setWorkers(current=>current.filter(w=>w.id!==worker.id))
      setWorkerStatus(`${worker.worker_name}'s login account was deleted. Their historical working hours were kept.`)
    }catch(e){setWorkerError(e instanceof Error?e.message:'Could not delete worker.')}
    finally{setDeletingWorkerId(null)}
  }
  async function importCsv(file:File|undefined){
    if(!file)return
    setWorkerModalError('');setWorkerStatus('')
    if(file.size>1024*1024){setWorkerModalError('CSV file is too large (max 1 MB).');return}
    const source=await file.text()
    let roster:{id:string;name:string}[]=[]
    try{roster=parseWorkerCsv(source)}catch(e){setWorkerModalError(e instanceof Error?e.message:'Invalid CSV file.');return}
    if(!confirm(`Import ${roster.length} workers? New workers use their Worker ID as a temporary password. Existing passwords will remain unchanged.`))return
    setImporting(true)
    try{
      let done=0
      for(let i=0;i<roster.length;i+=25){
        const r=await fetch('/api/admin/workers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workers:roster.slice(i,i+25)})})
        const d=await r.json().catch(()=>({}))
        if(!r.ok)throw new Error(`${d.error||'Import failed'} (after ${done} workers)`)
        done+=Math.min(25,roster.length-i)
        setWorkerStatus(`Imported ${done} / ${roster.length} workers`)
      }
      setWorkerModalOpen(false)
      await loadWorkers()
      setWorkerStatus(`Import finished: ${done} workers. Existing passwords were preserved.`)
    }catch(e){setWorkerModalError(e instanceof Error?e.message:'Could not import workers.')}
    finally{setImporting(false)}
  }
  async function updateWorker(worker:WorkerRow){
    setWorkerError('')
    try{
      const r=await fetch('/api/admin/workers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:worker.id,is_active:!worker.is_active})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(d.error||'Update failed')
      await loadWorkers()
    }catch(e){setWorkerError(e instanceof Error?e.message:'Update failed')}
  }
  async function resetWorkerPassword(worker:WorkerRow){
    if(!confirm(`Reset ${worker.worker_name}'s password to their Worker ID? They must change it on next login.`))return
    setWorkerError('')
    try{
      const r=await fetch('/api/admin/workers/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:worker.id})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok)throw new Error(d.error||'Reset failed')
      setWorkerStatus(`Password reset for ${worker.worker_name}.`)
      await loadWorkers()
    }catch(e){setWorkerError(e instanceof Error?e.message:'Reset failed')}
  }

  async function login(){
    setLoginError('')
    try {
      const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})})
      if(!r.ok){setLoginError('Incorrect password');return}
      setAuthed(true)
      setPassword('')
    } catch {
      setLoginError('Could not connect to the server. Please try again.')
    }
  }
  async function logout(){await fetch('/api/admin/logout',{method:'POST'});setAuthed(false)}
  async function remove(id:string){if(!confirm('Delete this record?'))return;await fetch('/api/admin/entries',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});void load()}

  async function addWorkingPlace(){
    const name=newPlaceName.trim()
    if(!name){setPlacesError('Enter a working place name.');return}
    setSavingPlace(true);setPlacesError('')
    try{
      const r=await fetch('/api/admin/working-places',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:newPlaceProject,name})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setPlacesError(d.error||'Could not add working place.');return}
      setNewPlaceName('')
      await loadWorkingPlaces()
    }catch{
      setPlacesError('Could not add working place. Please try again.')
    }finally{
      setSavingPlace(false)
    }
  }

  async function toggleWorkingPlace(item:WorkingPlace){
    setPlacesError('')
    try{
      const r=await fetch('/api/admin/working-places',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,is_active:!item.is_active})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setPlacesError(d.error||'Could not update working place.');return}
      setWorkingPlaces(current=>current.map(p=>p.id===item.id?d.place:p))
    }catch{
      setPlacesError('Could not update working place. Please try again.')
    }
  }

  async function deleteWorkingPlace(item:WorkingPlace){
    if(!confirm(`Delete “${item.name}” from ${item.project}? Existing working-hour records will not be deleted.`))return
    setPlacesError('')
    try{
      const r=await fetch('/api/admin/working-places',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id})})
      const d=await r.json().catch(()=>({}))
      if(!r.ok){setPlacesError(d.error||'Could not delete working place.');return}
      setWorkingPlaces(current=>current.filter(p=>p.id!==item.id))
    }catch{
      setPlacesError('Could not delete working place. Please try again.')
    }
  }

  const places=useMemo(()=>Array.from(new Set(entries.map(x=>x.working_place))).sort(),[entries])
  const totals=useMemo(()=>{const by:{[k:string]:number}={Kingdao:0,Creative:0,Namhong:0};const workers=new Set<string>();let all=0;entries.forEach(x=>{workers.add(x.worker_id);all+=Number(x.working_hours);by[x.project]=(by[x.project]||0)+Number(x.working_hours)});return{workers:workers.size,all,by}},[entries])
  const workerSummary=useMemo(()=>{const map=new Map<string,{name:string,id:string,Kingdao:number,Creative:number,Namhong:number,total:number}>();entries.forEach(x=>{const k=x.worker_id;const w=map.get(k)||{name:x.worker_name,id:k,Kingdao:0,Creative:0,Namhong:0,total:0};(w as any)[x.project]=Number((w as any)[x.project]||0)+Number(x.working_hours);w.total+=Number(x.working_hours);map.set(k,w)});return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name))},[entries])
  const groupedPlaces=useMemo(()=>projects.map(p=>({project:p,items:workingPlaces.filter(x=>x.project===p)})),[workingPlaces])

  if(!authed)return <div className="center-page"><div className="login-card"><div className="logo-mark">⏱</div><h1>Admin Access</h1><p className="muted">Enter the admin password to open the dashboard.</p><input type="password" placeholder="Admin password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>{loginError&&<p className="error">{loginError}</p>}<button className="primary-btn" onClick={login}>Open Dashboard</button></div></div>

  return <main className="admin-shell">
    <aside className="sidebar">
      <div className="brand">⏱ Working Hour Tracker</div>
      <button className={view==='dashboard'?'side-item active':'side-item'} onClick={()=>setView('dashboard')}>Dashboard</button>
      <button className={view==='places'?'side-item active':'side-item'} onClick={()=>setView('places')}>Working Places</button>
      <button className={view==='workers'?'side-item active':'side-item'} onClick={()=>setView('workers')}>Workers</button>
      <button className="logout-btn" onClick={logout}>Log out</button>
    </aside>

    <section className="admin-content">
      {view==='dashboard'&&<>
        <div className="admin-top"><div><h1>Working Hours Dashboard</h1><p>Worker submissions auto-refresh every 15 seconds.</p></div><div className="admin-actions"><a className="outline-btn" href={`/api/admin/export?month=${month}`}>Export CSV</a><button className="primary-small" onClick={()=>void load()}>{loading?'Refreshing...':'Refresh'}</button></div></div>
        {fetchError&&<p className="error">{fetchError}</p>}
        <div className="filters"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/><select value={project} onChange={e=>setProject(e.target.value)}><option value="">All Projects</option><option>Kingdao</option><option>Creative</option><option>Namhong</option></select><select value={place} onChange={e=>setPlace(e.target.value)}><option value="">All Working Places</option>{places.map(p=><option key={p}>{p}</option>)}</select><input placeholder="Search worker name or ID" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className="stats"><Stat label="Total Workers" value={`${totals.workers}`}/><Stat label="Total Hours" value={`${fmt(totals.all)} hrs`}/><Stat label="Kingdao" value={`${fmt(totals.by.Kingdao)} hrs`}/><Stat label="Creative" value={`${fmt(totals.by.Creative)} hrs`}/><Stat label="Namhong" value={`${fmt(totals.by.Namhong)} hrs`}/></div>
        <div className="table-card"><div className="table-head"><b>All Records</b><span>{entries.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Worker ID</th><th>Worker Name</th><th>Working Place</th><th>Project</th><th>Hours</th><th></th></tr></thead><tbody>{entries.length?entries.map(x=><tr key={x.id}><td>{x.work_date}</td><td>{x.worker_id}</td><td><b>{x.worker_name}</b></td><td>{x.working_place}</td><td><span className="tag">{x.project}</span></td><td><b>{fmt(x.working_hours)} hrs</b></td><td><button className="delete-btn" onClick={()=>remove(x.id)}>Delete</button></td></tr>):<tr><td colSpan={7} className="muted">No records found.</td></tr>}</tbody></table></div></div>
        <div className="table-card"><div className="table-head"><b>Monthly Worker Summary</b></div><div className="table-wrap"><table><thead><tr><th>Worker</th><th>ID</th><th>Kingdao</th><th>Creative</th><th>Namhong</th><th>Total</th></tr></thead><tbody>{workerSummary.map(w=><tr key={w.id}><td><b>{w.name}</b></td><td>{w.id}</td><td>{fmt(w.Kingdao)}</td><td>{fmt(w.Creative)}</td><td>{fmt(w.Namhong)}</td><td><b>{fmt(w.total)} hrs</b></td></tr>)}</tbody></table></div></div>
      </>}

      {view==='workers'&&<>
        <div className="admin-top">
          <div><h1>Workers</h1><p>Manage worker accounts, passwords and access.</p></div>
          <div className="admin-actions worker-top-actions">
            <button type="button" className="outline-btn" disabled={workersLoading} onClick={()=>void loadWorkers()}>{workersLoading?'Refreshing...':'Refresh'}</button>
            <button type="button" className="primary-small worker-open-modal" ref={workerModalTriggerRef} onClick={()=>openWorkerModal('manual')}><span aria-hidden="true" className="worker-add-plus">+</span> Add New Worker</button>
          </div>
        </div>
        {workerStatus&&<p className="worker-good" role="status" aria-live="polite">{workerStatus}</p>}
        {workerError&&<p className="error" role="alert">{workerError}</p>}
        <div className="table-card worker-accounts-card">
          <div className="table-head"><b>Worker Accounts</b><span>{workers.length} workers</span></div>
          <div className="worker-search"><input aria-label="Search worker name or ID" placeholder="Search name or Worker ID" value={workerSearch} onChange={e=>setWorkerSearch(e.target.value)}/></div>
          <div className="table-wrap"><table><thead><tr><th>Name</th><th>Worker ID</th><th>Status</th><th>Password</th><th>Actions</th></tr></thead><tbody>
            {workers.filter(w=>(w.worker_name+' '+w.worker_id).toLowerCase().includes(workerSearch.toLowerCase())).map(w=><tr key={w.id}><td><b>{w.worker_name}</b></td><td>{w.worker_id}</td><td>{w.is_active?'Active':'Disabled'}</td><td>{w.must_change_password?'Temporary':'Changed'}</td><td><div className="row-actions"><button className="outline-small" disabled={deletingWorkerId===w.id} onClick={()=>void updateWorker(w)}>{w.is_active?'Disable':'Enable'}</button><button className="outline-small" disabled={deletingWorkerId===w.id} onClick={()=>void resetWorkerPassword(w)}>Reset password</button><button className="delete-btn" disabled={deletingWorkerId!==null} onClick={()=>void deleteWorker(w)}>{deletingWorkerId===w.id?'Deleting...':'Delete'}</button></div></td></tr>)}
            {!workers.some(w=>(w.worker_name+' '+w.worker_id).toLowerCase().includes(workerSearch.toLowerCase()))&&<tr><td colSpan={5} className="muted">{workersLoading?'Loading worker accounts...':'No worker accounts found.'}</td></tr>}
          </tbody></table></div>
        </div>
        <p className="worker-delete-note">Deleting a worker removes only their login account. Existing working-hour records remain available in the Dashboard and CSV exports.</p>
      </>}
      {view==='workers'&&workerModalOpen&&<div className="worker-modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeWorkerModal()}}>
        <div id="worker-add-dialog" className="worker-add-dialog" role="dialog" aria-modal="true" aria-labelledby="worker-modal-title" aria-describedby="worker-modal-desc">
          <div className="worker-modal-header">
            <div><h2 id="worker-modal-title">Add New Workers</h2><p id="worker-modal-desc">Add one worker manually or import multiple workers from CSV.</p></div>
            <button type="button" className="worker-modal-close" aria-label="Close Add Workers dialog" disabled={savingWorker||importing} onClick={closeWorkerModal}>×</button>
          </div>
          <div className="worker-modal-body">
            <div className="worker-modal-tabs" aria-label="Choose how to add workers">
              <button type="button" aria-pressed={workerModalMode==='manual'} className={workerModalMode==='manual'?'active':''} disabled={savingWorker||importing} onClick={()=>{setWorkerModalMode('manual');setWorkerModalError('')}}>Manual Entry</button>
              <button type="button" aria-pressed={workerModalMode==='csv'} className={workerModalMode==='csv'?'active':''} disabled={savingWorker||importing} onClick={()=>{setWorkerModalMode('csv');setWorkerModalError('')}}>Import CSV</button>
            </div>
            {workerModalError&&<p className="error worker-modal-alert" role="alert">{workerModalError}</p>}
            {workerModalMode==='manual'?<form id="worker-manual-form" className="worker-create-form worker-modal-form" onSubmit={e=>{e.preventDefault();void addWorker()}}>
              <label htmlFor="new-worker-name">Worker Name <span aria-hidden="true">*</span></label>
              <input id="new-worker-name" autoFocus autoComplete="off" placeholder="e.g. Aung Aung" value={newWorkerName} maxLength={120} required disabled={savingWorker} onChange={e=>setNewWorkerName(e.target.value)}/>
              <label htmlFor="new-worker-id">Worker ID <span aria-hidden="true">*</span></label>
              <input id="new-worker-id" autoComplete="off" placeholder="e.g. WORKER-001" value={newWorkerId} maxLength={60} required disabled={savingWorker} onChange={e=>setNewWorkerId(e.target.value)}/>
              <p className="worker-modal-hint">The initial password is the Worker ID. Workers are asked to change it on first login.</p>
            </form>:<div className="worker-import worker-modal-import">
              <p className="muted">Upload a CSV exported from Google Sheets.</p>
              <p className="field-help">Include <b>Name</b> and <b>ID</b> columns (or Worker Name / Worker ID).</p>
              <label htmlFor="worker-csv-file" className="worker-upload-label">Choose a CSV file</label>
              <input id="worker-csv-file" type="file" accept=".csv,text/csv" disabled={importing} onChange={e=>{void importCsv(e.target.files?.[0]);e.target.value=''}}/>
              <p className="worker-modal-hint">Import starts after selecting a file and confirming. Existing passwords will not be changed.</p>
              {importing&&<p className="worker-import-progress" role="status">{workerStatus||'Importing workers...'}</p>}
            </div>}
          </div>
          <div className="worker-modal-footer">
            <button type="button" className="worker-modal-cancel" disabled={savingWorker||importing} onClick={closeWorkerModal}>Cancel</button>
            {workerModalMode==='manual'&&<button form="worker-manual-form" type="submit" className="primary-small worker-modal-save" disabled={savingWorker||!newWorkerName.trim()||!newWorkerId.trim()}>{savingWorker?'Adding...':'Add Worker'}</button>}
          </div>
        </div>
      </div>}
      {view==='places'&&<>
        <div className="admin-top"><div><h1>Working Places</h1><p>Add locations by project. Workers can only select active locations from this list.</p></div><button className="primary-small" onClick={()=>void loadWorkingPlaces()}>{placesLoading?'Refreshing...':'Refresh'}</button></div>
        {placesError&&<p className="error">{placesError}</p>}
        <div className="place-manager-grid">
          <div className="table-card place-create-card">
            <div className="table-head"><b>Add Working Place</b></div>
            <div className="place-form">
              <label>Project</label>
              <select value={newPlaceProject} onChange={e=>setNewPlaceProject(e.target.value)}>{projects.map(p=><option key={p}>{p}</option>)}</select>
              <label>Working Place Name</label>
              <input placeholder="e.g. Site A, Building 2" value={newPlaceName} onChange={e=>setNewPlaceName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&void addWorkingPlace()}/>
              <button className="primary-btn" disabled={savingPlace} onClick={()=>void addWorkingPlace()}>{savingPlace?'Adding...':'Add Working Place'}</button>
            </div>
          </div>
          <div className="place-help-card"><b>How it works</b><p>1. Admin selects a project and adds its working places.</p><p>2. Worker selects a project first.</p><p>3. The worker dropdown shows only active places for that project.</p></div>
        </div>

        <div className="project-place-groups">
          {groupedPlaces.map(group=><div className="table-card" key={group.project}>
            <div className="table-head"><b>{group.project}</b><span>{group.items.filter(x=>x.is_active).length} active</span></div>
            <div className="place-list">
              {placesLoading?<p className="muted">Loading...</p>:group.items.length?group.items.map(item=><div className="place-row" key={item.id}>
                <div><b>{item.name}</b><span className={item.is_active?'status-pill active':'status-pill inactive'}>{item.is_active?'Active':'Inactive'}</span></div>
                <div className="row-actions"><button className="outline-small" onClick={()=>void toggleWorkingPlace(item)}>{item.is_active?'Disable':'Enable'}</button><button className="delete-btn" onClick={()=>void deleteWorkingPlace(item)}>Delete</button></div>
              </div>):<p className="muted empty-state">No working places added yet.</p>}
            </div>
          </div>)}
        </div>
      </>}
    </section>
  </main>
}

function Stat({label,value}:{label:string,value:string}){return <div className="stat"><span>{label}</span><b>{value}</b></div>}


// CSV parser supports quoted fields, line breaks, and UTF-8 exports from Google Sheets.
function parseWorkerCsv(text:string):Array<{id:string;name:string}>{
  const rows:string[][]=[];let row:string[]=[];let field='';let quoted=false
  const source=text.replace(/^\uFEFF/,'')
  for(let i=0;i<source.length;i++){
    const c=source[i]
    if(c==='"'){
      if(quoted&&source[i+1]==='"'){field+='"';i++}else quoted=!quoted
    }else if(c===','&&!quoted){row.push(field);field=''}
    else if((c==='\n'||c==='\r')&&!quoted){
      row.push(field);field='';if(row.some(x=>x.trim()))rows.push(row);row=[]
      if(c==='\r'&&source[i+1]==='\n')i++
    }else field+=c
  }
  if(quoted)throw new Error('CSV has an unclosed quotation mark.')
  row.push(field);if(row.some(x=>x.trim()))rows.push(row)
  if(rows.length<2)throw new Error('CSV needs a header row and worker data.')
  const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'')
  const headers=rows[0].map(norm)
  const nameIndex=headers.findIndex(h=>['name','workername','employeename','fullname','username','worker'].includes(h))
  const idIndex=headers.findIndex(h=>['id','workerid','userid','employeeid','empid','staffid','staffno','employeeno'].includes(h))
  if(nameIndex<0||idIndex<0)throw new Error('CSV headers must include Name and ID (or Worker Name and Worker ID).')
  const records=rows.slice(1).map(r=>({id:(r[idIndex]||'').trim(),name:(r[nameIndex]||'').trim()})).filter(x=>x.id||x.name)
  if(records.length===0)throw new Error('No workers found.')
  if(records.some(x=>!x.id||!x.name))throw new Error('Some rows are missing Name or ID.')
  if(new Set(records.map(x=>x.id)).size!==records.length)throw new Error('Duplicate Worker IDs found in CSV.')
  if(records.length>2000)throw new Error('Maximum 2000 workers per import.')
  return records
}
