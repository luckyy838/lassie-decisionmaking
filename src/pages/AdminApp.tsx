import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import '../styles/admin.scss';

const API = 'http://127.0.0.1:5000';
const TOKEN_KEY = 'lassieAdminToken';

type SessionRecord = {
  id: number;
  createdAt: number;
  explanationEnabled: boolean | null;
  explanationChoice: string | null;
  payload: any;
};

type View = 'overview' | 'list' | 'detail';

function authHeaders(token: string) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
  };
}

function formatTime(ms: number) {
  if (!ms) return '';
  const date = new Date(ms);
  const p = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${date.getFullYear()}/${p(date.getMonth() + 1)}/${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

function isFormal(session: SessionRecord) {
  const choice = session.explanationChoice;
  return choice == null || choice === '' || choice === 'random';
}

function branchLabel(session: SessionRecord) {
  if (session.explanationEnabled === true) return 'With explanation';
  if (session.explanationEnabled === false) return 'Without explanation';
  return 'Unknown';
}

function stepsOf(session: SessionRecord) {
  const steps = session.payload && session.payload.userSteps;
  return Array.isArray(steps) ? steps : [];
}

function sampleCount(session: SessionRecord) {
  return stepsOf(session).filter((step) => step && step.userFreeSample).length;
}

function hitCount(session: SessionRecord) {
  return stepsOf(session).filter((step) => step && step.hitSuggestion).length;
}

function confidenceNumber(value: any): number | null {
  if (typeof value !== 'string' || !value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function averageConfidence(session: SessionRecord) {
  const nums = stepsOf(session)
    .map((step) => confidenceNumber(step && step.decisionConfidence))
    .filter((n) => n != null) as number[];
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function primaryObjective(session: SessionRecord) {
  const steps = stepsOf(session);
  const objectives = steps.length && steps[0].objectives;
  if (!Array.isArray(objectives) || !objectives.length) return '—';
  const ranked = objectives.slice().sort((a, b) => (a.ranking || 99) - (b.ranking || 99));
  return ranked[0].objective || '—';
}

function dataVersionLabel(session: SessionRecord) {
  const version = session.payload && session.payload.dataVersion;
  if (!version || version.local == null) return '—';
  return String(version.local);
}

function shortResolutionMethod(value: string) {
  const known = ['One-at-a-time', 'Hierarchical', 'Even weighting'];
  const shortName = known.find((name) => value.indexOf(name) === 0);
  return shortName || value;
}

function resolutionMethodOf(session: SessionRecord) {
  const step = stepsOf(session).find((item) => item && item.resolutionMethod);
  const value = step && step.resolutionMethod;
  if (!value) return '—';
  return shortResolutionMethod(value);
}

function suggestionLetters(step: any) {
  const suggestions = (step && step.robotSuggestions) || [];
  return suggestions.map((suggestion, i) => {
    const letter = String.fromCharCode(65 + i);
    const index = suggestion && suggestion.index != null ? suggestion.index : '?';
    return letter + ' @ ' + index;
  }).join(', ');
}

function mean(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function countBy(items: string[]) {
  const map: { [key: string]: number } = {};
  items.forEach((item) => {
    const key = item || '—';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.keys(map).map((key) => ({ key, count: map[key] }));
}

export default function AdminApp() {
  const [token, setToken] = useState(sessionStorage.getItem(TOKEN_KEY) || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [view, setView] = useState<View>('overview');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [branch, setBranch] = useState<'all' | 'with' | 'without'>('all');
  const [formalOnly, setFormalOnly] = useState(false);

  const load = (activeToken: string) => {
    setLoadError('');
    fetch(API + '/admin/sessions', { headers: authHeaders(activeToken) })
      .then((res) => {
        if (res.status === 401) {
          sessionStorage.removeItem(TOKEN_KEY);
          setToken('');
          throw new Error('Login expired');
        }
        if (!res.ok) throw new Error('Cannot reach the local database. Is Flask running on port 5000?');
        return res.json();
      })
      .then((data) => setSessions(data.sessions || []))
      .catch((err) => setLoadError(err.message || 'Failed to load sessions'));
  };

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  const onLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    fetch(API + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Wrong username or password');
        return res.json();
      })
      .then((data) => {
        sessionStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
      })
      .catch((err) => setLoginError(err.message || 'Login failed'));
  };

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (formalOnly && !isFormal(session)) return false;
      if (branch === 'with' && session.explanationEnabled !== true) return false;
      if (branch === 'without' && session.explanationEnabled !== false) return false;
      return true;
    });
  }, [sessions, branch, formalOnly]);

  const selected = sessions.find((session) => session.id === selectedId) || null;

  const openSession = (id: number) => {
    setSelectedId(id);
    setView('detail');
  };

  const downloadSession = (session: SessionRecord) => {
    const blob = new Blob([JSON.stringify(session.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${session.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteSession = (session: SessionRecord) => {
    if (!window.confirm('Hide this session from the admin list?')) return;
    fetch(API + '/admin/sessions/' + session.id + '/delete', {
      method: 'POST',
      headers: authHeaders(token),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Delete failed');
        if (selectedId === session.id) {
          setSelectedId(null);
          setView('list');
        }
        load(token);
      })
      .catch((err) => setLoadError(err.message || 'Delete failed'));
  };

  if (!token) {
    return (
      <div className="adminPage">
        <form className="adminLogin" onSubmit={onLogin}>
          <h1>LASSIE admin</h1>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {loginError ? <p className="adminError">{loginError}</p> : null}
          <button type="submit">Log in</button>
        </form>
      </div>
    );
  }

  const withN = filtered.filter((s) => s.explanationEnabled === true).length;
  const withoutN = filtered.filter((s) => s.explanationEnabled === false).length;
  const sampleNums = filtered.map(sampleCount);
  const hits = filtered.reduce((sum, session) => sum + hitCount(session), 0);
  const samplesTotal = sampleNums.reduce((a, b) => a + b, 0);
  const confNums = filtered
    .map(averageConfidence)
    .filter((n) => n != null) as number[];
  const letters: string[] = [];
  const methods: string[] = [];
  const objectives: string[] = [];
  const versions: string[] = [];
  const confByBranch: { with: number[]; without: number[] } = { with: [], without: [] };
  filtered.forEach((session) => {
    objectives.push(primaryObjective(session));
    versions.push(dataVersionLabel(session));
    methods.push(resolutionMethodOf(session));
    const avg = averageConfidence(session);
    if (avg != null && session.explanationEnabled === true) confByBranch.with.push(avg);
    if (avg != null && session.explanationEnabled === false) confByBranch.without.push(avg);
    stepsOf(session).forEach((step) => {
      if (step && step.hitSuggestion && step.robotSuggestions && step.userFreeSample) {
        const index = step.robotSuggestions.findIndex((s) => s && step.userFreeSample && s.index === step.userFreeSample.index);
        if (index >= 0) letters.push(String.fromCharCode(65 + index));
      }
    });
  });

  return (
    <div className="adminPage">
      <header className="adminHeader">
        <h1>LASSIE admin</h1>
        <nav>
          <button className={view === 'overview' ? 'isOn' : ''} onClick={() => setView('overview')}>Overview</button>
          <button className={view === 'list' ? 'isOn' : ''} onClick={() => setView('list')}>Participants</button>
          <button onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setToken(''); }}>Log out</button>
        </nav>
      </header>
      <div className="adminFilters">
        <label>
          Branch
          <select value={branch} onChange={(e) => setBranch(e.target.value as any)}>
            <option value="all">All</option>
            <option value="with">With explanation</option>
            <option value="without">Without explanation</option>
          </select>
        </label>
        <label className="adminCheck">
          <input type="checkbox" checked={formalOnly} onChange={(e) => setFormalOnly(e.target.checked)} />
          Assigned sessions only
        </label>
        <span>{filtered.length} shown / {sessions.length} saved</span>
      </div>
      {loadError ? <p className="adminError">{loadError}</p> : null}

      {view === 'overview' && (
        <section className="adminGrid">
          <article>
            <h2>Completed</h2>
            <p className="adminStat">{filtered.length}</p>
          </article>
          <article>
            <h2>With / without</h2>
            <p className="adminStat">{withN} / {withoutN}</p>
            <p>Difference: {Math.abs(withN - withoutN)}</p>
          </article>
          <article>
            <h2>Samples per person</h2>
            <p className="adminStat">{mean(sampleNums) == null ? '—' : mean(sampleNums)!.toFixed(1)}</p>
            <p>Total samples: {samplesTotal}</p>
          </article>
          <article>
            <h2>Followed a suggestion</h2>
            <p className="adminStat">{samplesTotal ? Math.round(100 * hits / samplesTotal) + '%' : '—'}</p>
            <p>{countBy(letters).map((row) => row.key + ' ' + row.count).join(' · ') || 'No matches yet'}</p>
          </article>
          <article>
            <h2>Mean confidence</h2>
            <p>With: {mean(confByBranch.with) == null ? '—' : mean(confByBranch.with)!.toFixed(1)}</p>
            <p>Without: {mean(confByBranch.without) == null ? '—' : mean(confByBranch.without)!.toFixed(1)}</p>
            <p>Overall: {mean(confNums) == null ? '—' : mean(confNums)!.toFixed(1)}</p>
          </article>
          <article>
            <h2>Primary objective</h2>
            {countBy(objectives).map((row) => <p key={row.key}>{row.key}: {row.count}</p>)}
          </article>
          <article>
            <h2>Resolution method</h2>
            {countBy(methods).map((row) => <p key={row.key}>{row.key}: {row.count}</p>)}
          </article>
          <article>
            <h2>Data version</h2>
            {countBy(versions).map((row) => <p key={row.key}>Version {row.key}: {row.count}</p>)}
          </article>
        </section>
      )}

      {view === 'list' && (
        <table className="adminTable">
          <thead>
            <tr>
              <th>Time</th>
              <th>Branch</th>
              <th>Source</th>
              <th>Samples</th>
              <th>Hits</th>
              <th>Confidence</th>
              <th>Primary objective</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((session) => (
              <tr key={session.id} onClick={() => openSession(session.id)}>
                <td>{formatTime(session.createdAt)}</td>
                <td>{branchLabel(session)}</td>
                <td>{isFormal(session) ? 'Assigned' : 'Manual test'}</td>
                <td>{sampleCount(session)}</td>
                <td>{hitCount(session)}</td>
                <td>{averageConfidence(session) == null ? '—' : averageConfidence(session)!.toFixed(1)}</td>
                <td>{primaryObjective(session)}</td>
                <td>
                  <button onClick={(e) => { e.stopPropagation(); downloadSession(session); }}>JSON</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSession(session); }}>Hide</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'detail' && selected && (
        <section className="adminDetail">
          <p><button onClick={() => setView('list')}>Back to list</button></p>
          <h2>Session {selected.id}</h2>
          <p>{formatTime(selected.createdAt)} · {branchLabel(selected)} · {isFormal(selected) ? 'Assigned' : 'Manual test (' + selected.explanationChoice + ')'}</p>
          <p>Samples: {sampleCount(selected)} · Data version: {dataVersionLabel(selected)}</p>
          <p>Conclusion: {(selected.payload && selected.payload.conclusionFreeResponse) || '—'}</p>
          <p>
            <button onClick={() => downloadSession(selected)}>Download JSON</button>
            <button onClick={() => deleteSession(selected)}>Hide</button>
          </p>
          <h3>Steps</h3>
          <table className="adminTable">
            <thead>
              <tr>
                <th>Step</th>
                <th>Plan</th>
                <th>A / B / C</th>
                <th>Sampled</th>
                <th>Match</th>
                <th>Confidence</th>
                <th>Objective</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {stepsOf(selected).map((step, i) => (
                <tr key={i}>
                  <td>{step.step != null ? step.step : i + 1}</td>
                  <td>{step.desiredWaypoint ? step.desiredWaypoint.index : '—'}</td>
                  <td>{suggestionLetters(step) || '—'}</td>
                  <td>{step.userFreeSample ? step.userFreeSample.index : '—'}</td>
                  <td>{step.hitSuggestion ? (step.acceptOrReject || 'Yes') : 'No'}</td>
                  <td>{step.decisionConfidence || '—'}</td>
                  <td>{primaryObjective({ ...selected, payload: { userSteps: [step] } })}</td>
                  <td>{step.resolutionMethod ? shortResolutionMethod(step.resolutionMethod) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Survey</h3>
          <table className="adminTable">
            <thead>
              <tr><th>Question</th><th>Answer</th></tr>
            </thead>
            <tbody>
              {((selected.payload && selected.payload.surveyResponses) || []).map((item, i) => (
                <tr key={i}>
                  <td>{item.text || item.id}</td>
                  <td>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
