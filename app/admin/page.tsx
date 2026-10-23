'use client'

import { useEffect, useMemo, useState } from 'react'

type Entry = {
  id: string
  worker_id: string
  worker_name: string
  work_date: string
  working_place: string
  project: string
  working_hours: number
}

type WorkingPlace = {
  id: string
  project: string
  name: string
  is_active: boolean
}

const monthNow = () => new Date().toISOString().slice(0, 7)

const fmt = (n: number) =>
  Number(n || 0)
    .toFixed(1)
    .replace('.0', '')

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [view, setView] = useState<'dashboard' | 'places'>('dashboard')

  // Dashboard
  const [month, setMonth] = useState(monthNow())
  const [project, setProject] = useState('')
  const [place, setPlace] = useState('')
  const [search, setSearch] = useState('')

  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  // Working Places
  const [workingPlaces, setWorkingPlaces] = useState<WorkingPlace[]>([])
  const [newPlaceProject, setNewPlaceProject] = useState('Kingdao')
  const [newPlaceName, setNewPlaceName] = useState('')
  const [placesLoading, setPlacesLoading] = useState(false)
  const [placesError, setPlacesError] = useState('')

  // =========================
  // Dashboard Data
  // =========================

  async function load() {
    setLoading(true)
    setFetchError('')

    try {
      const qs = new URLSearchParams({
        month,
        project,
        place,
        search,
      })

      const r = await fetch('/api/admin/entries?' + qs, {
        cache: 'no-store',
      })

      if (r.status === 401) {
        setAuthed(false)
        return
      }

      if (!r.ok) {
        throw new Error(`Admin API returned ${r.status}`)
      }

      const d = await r.json()

      setEntries(d.entries || [])
      setAuthed(true)
    } catch {
      setFetchError('Could not refresh data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed || view !== 'dashboard') return

    void load()
  }, [authed, view, month, project, place, search])

  useEffect(() => {
    if (!authed || view !== 'dashboard') return

    const timer = setInterval(() => {
      void load()
    }, 15000)

    return () => clearInterval(timer)
  }, [authed, view, month, project, place, search])

  // =========================
  // Login
  // =========================

  async function login() {
    setLoginError('')

    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!r.ok) {
        setLoginError('Incorrect password')
        return
      }

      setAuthed(true)
      setPassword('')
    } catch {
      setLoginError('Could not connect to the server. Please try again.')
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', {
      method: 'POST',
    })

    setAuthed(false)
  }

  // =========================
  // Working Places
  // =========================

  async function loadWorkingPlaces() {
    setPlacesLoading(true)
    setPlacesError('')

    try {
      const r = await fetch('/api/admin/working-places', {
        cache: 'no-store',
      })

      if (r.status === 401) {
        setAuthed(false)
        return
      }

      const d = await r.json()

      if (!r.ok) {
        setPlacesError(d.error || 'Could not load working places.')
        return
      }

      setWorkingPlaces(d.places || [])
    } catch (error) {
      console.error('Could not load working places:', error)
      setPlacesError('Could not load working places.')
    } finally {
      setPlacesLoading(false)
    }
  }

  useEffect(() => {
    if (!authed || view !== 'places') return

    void loadWorkingPlaces()
  }, [authed, view])

  async function addWorkingPlace() {
    if (!newPlaceName.trim()) {
      alert('Please enter a working place name.')
      return
    }

    try {
      const r = await fetch('/api/admin/working-places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: newPlaceProject,
          name: newPlaceName.trim(),
        }),
      })

      const d = await r.json()

      if (!r.ok) {
        alert(d.error || 'Could not add working place.')
        return
      }

      setNewPlaceName('')
      await loadWorkingPlaces()
    } catch (error) {
      console.error(error)
      alert('Could not add working place.')
    }
  }

  async function toggleWorkingPlace(
    id: string,
    isActive: boolean
  ) {
    try {
      const r = await fetch('/api/admin/working-places', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          is_active: !isActive,
        }),
      })

      const d = await r.json()

      if (!r.ok) {
        alert(d.error || 'Could not update working place.')
        return
      }

      await loadWorkingPlaces()
    } catch (error) {
      console.error(error)
      alert('Could not update working place.')
    }
  }

  async function deleteWorkingPlace(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this working place?'
    )

    if (!confirmed) return

    try {
      const r = await fetch('/api/admin/working-places', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      })

      const d = await r.json()

      if (!r.ok) {
        alert(d.error || 'Could not delete working place.')
        return
      }

      await loadWorkingPlaces()
    } catch (error) {
      console.error(error)
      alert('Could not delete working place.')
    }
  }

  // =========================
  // Record Delete
  // =========================

  async function remove(id: string) {
    if (!confirm('Delete this record?')) return

    await fetch('/api/admin/entries', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    })

    load()
  }

  // =========================
  // Dashboard Calculations
  // =========================

  const places = useMemo(
    () =>
      Array.from(
        new Set(entries.map((x) => x.working_place))
      ).sort(),
    [entries]
  )

  const totals = useMemo(() => {
    const by: { [k: string]: number } = {
      Kingdao: 0,
      Creative: 0,
      Namhong: 0,
    }

    const workers = new Set<string>()

    let all = 0

    entries.forEach((x) => {
      workers.add(x.worker_id)

      all += Number(x.working_hours)

      by[x.project] =
        (by[x.project] || 0) + Number(x.working_hours)
    })

    return {
      workers: workers.size,
      all,
      by,
    }
  }, [entries])

  const workerSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        id: string
        Kingdao: number
        Creative: number
        Namhong: number
        total: number
      }
    >()

    entries.forEach((x) => {
      const k = x.worker_id

      const worker =
        map.get(k) || {
          name: x.worker_name,
          id: k,
          Kingdao: 0,
          Creative: 0,
          Namhong: 0,
          total: 0,
        }

      ;(worker as any)[x.project] += Number(x.working_hours)

      worker.total += Number(x.working_hours)

      map.set(k, worker)
    })

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [entries])

  // =========================
  // Login Screen
  // =========================

  if (!authed) {
    return (
      <div className="center-page">
        <div className="login-card">
          <div className="logo-mark">⏱</div>

          <h1>Admin Access</h1>

          <p className="muted">
            Enter the admin password to open the dashboard.
          </p>

          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') login()
            }}
          />

          {loginError && (
            <p className="error">{loginError}</p>
          )}

          <button
            className="primary-btn"
            onClick={login}
          >
            Open Dashboard
          </button>
        </div>
      </div>
    )
  }

  // =========================
  // Main Admin UI
  // =========================

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          ⏱ Working Hour Tracker
        </div>

        <div
          className={`side-item ${
            view === 'dashboard' ? 'active' : ''
          }`}
          onClick={() => setView('dashboard')}
          style={{ cursor: 'pointer' }}
        >
          Dashboard
        </div>

        <div
          className={`side-item ${
            view === 'places' ? 'active' : ''
          }`}
          onClick={() => setView('places')}
          style={{ cursor: 'pointer' }}
        >
          Working Places
        </div>

        <button
          className="logout-btn"
          onClick={logout}
        >
          Log out
        </button>
      </aside>

      <section className="admin-content">

        {/* ========================= */}
        {/* DASHBOARD */}
        {/* ========================= */}

        {view === 'dashboard' && (
          <>
            <div className="admin-top">
              <div>
                <h1>Working Hours Dashboard</h1>

                <p>
                  Worker submissions auto-refresh every
                  15 seconds.
                </p>
              </div>

              <div className="admin-actions">
                <a
                  className="outline-btn"
                  href={`/api/admin/export?month=${month}`}
                >
                  Export CSV
                </a>

                <button
                  className="primary-small"
                  onClick={load}
                >
                  {loading
                    ? 'Refreshing...'
                    : 'Refresh'}
                </button>
              </div>
            </div>

            {fetchError && (
              <p className="error">{fetchError}</p>
            )}

            <div className="filters">
              <input
                type="month"
                value={month}
                onChange={(e) =>
                  setMonth(e.target.value)
                }
              />

              <select
                value={project}
                onChange={(e) =>
                  setProject(e.target.value)
                }
              >
                <option value="">
                  All Projects
                </option>

                <option>Kingdao</option>
                <option>Creative</option>
                <option>Namhong</option>
              </select>

              <select
                value={place}
                onChange={(e) =>
                  setPlace(e.target.value)
                }
              >
                <option value="">
                  All Working Places
                </option>

                {places.map((p) => (
                  <option key={p}>
                    {p}
                  </option>
                ))}
              </select>

              <input
                placeholder="Search worker name or ID"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <div className="stats">
              <Stat
                label="Total Workers"
                value={`${totals.workers}`}
              />

              <Stat
                label="Total Hours"
                value={`${fmt(totals.all)} hrs`}
              />

              <Stat
                label="Kingdao"
                value={`${fmt(
                  totals.by.Kingdao
                )} hrs`}
              />

              <Stat
                label="Creative"
                value={`${fmt(
                  totals.by.Creative
                )} hrs`}
              />

              <Stat
                label="Namhong"
                value={`${fmt(
                  totals.by.Namhong
                )} hrs`}
              />
            </div>

            <div className="table-card">
              <div className="table-head">
                <b>All Records</b>

                <span>
                  {entries.length} records
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Worker ID</th>
                      <th>Worker Name</th>
                      <th>Working Place</th>
                      <th>Project</th>
                      <th>Hours</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {entries.length ? (
                      entries.map((x) => (
                        <tr key={x.id}>
                          <td>{x.work_date}</td>

                          <td>{x.worker_id}</td>

                          <td>
                            <b>
                              {x.worker_name}
                            </b>
                          </td>

                          <td>
                            {x.working_place}
                          </td>

                          <td>
                            <span className="tag">
                              {x.project}
                            </span>
                          </td>

                          <td>
                            <b>
                              {fmt(
                                x.working_hours
                              )}{' '}
                              hrs
                            </b>
                          </td>

                          <td>
                            <button
                              className="delete-btn"
                              onClick={() =>
                                remove(x.id)
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="muted"
                        >
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-card">
              <div className="table-head">
                <b>
                  Monthly Worker Summary
                </b>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>ID</th>
                      <th>Kingdao</th>
                      <th>Creative</th>
                      <th>Namhong</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workerSummary.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <b>{w.name}</b>
                        </td>

                        <td>{w.id}</td>

                        <td>
                          {fmt(w.Kingdao)}
                        </td>

                        <td>
                          {fmt(w.Creative)}
                        </td>

                        <td>
                          {fmt(w.Namhong)}
                        </td>

                        <td>
                          <b>
                            {fmt(w.total)} hrs
                          </b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ========================= */}
        {/* WORKING PLACES */}
        {/* ========================= */}

        {view === 'places' && (
          <>
            <div className="admin-top">
              <div>
                <h1>Working Places</h1>

                <p>
                  Manage working places for each
                  project.
                </p>
              </div>

              <button
                className="primary-small"
                onClick={loadWorkingPlaces}
              >
                {placesLoading
                  ? 'Refreshing...'
                  : 'Refresh'}
              </button>
            </div>

            {placesError && (
              <p className="error">
                {placesError}
              </p>
            )}

            <div className="table-card">
              <div className="table-head">
                <b>Add Working Place</b>
              </div>

              <div
                className="filters"
                style={{
                  padding: '20px',
                }}
              >
                <select
                  value={newPlaceProject}
                  onChange={(e) =>
                    setNewPlaceProject(
                      e.target.value
                    )
                  }
                >
                  <option>Kingdao</option>
                  <option>Creative</option>
                  <option>Namhong</option>
                </select>

                <input
                  placeholder="Working place name"
                  value={newPlaceName}
                  onChange={(e) =>
                    setNewPlaceName(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addWorkingPlace()
                    }
                  }}
                />

                <button
                  className="primary-small"
                  onClick={addWorkingPlace}
                >
                  Add Working Place
                </button>
              </div>
            </div>

            <div className="table-card">
              <div className="table-head">
                <b>Working Places</b>

                <span>
                  {workingPlaces.length} places
                </span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Working Place</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {workingPlaces.length ? (
                      workingPlaces.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <span className="tag">
                              {item.project}
                            </span>
                          </td>

                          <td>
                            <b>{item.name}</b>
                          </td>

                          <td>
                            {item.is_active
                              ? 'Active'
                              : 'Disabled'}
                          </td>

                          <td>
                            <div
                              style={{
                                display: 'flex',
                                gap: '8px',
                              }}
                            >
                              <button
                                className="outline-btn"
                                onClick={() =>
                                  toggleWorkingPlace(
                                    item.id,
                                    item.is_active
                                  )
                                }
                              >
                                {item.is_active
                                  ? 'Disable'
                                  : 'Enable'}
                              </button>

                              <button
                                className="delete-btn"
                                onClick={() =>
                                  deleteWorkingPlace(
                                    item.id
                                  )
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="muted"
                        >
                          {placesLoading
                            ? 'Loading...'
                            : 'No working places added yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

function Stat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}