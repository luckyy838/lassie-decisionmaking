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

function formatPointList(points) {
  if (!points || !points.length) return '—';
  return points.map(point => {
    const moisture = Number(point.moisture);
    const strength = Number(point.strength);
    const moistureText = isNaN(moisture) ? '?' : moisture.toFixed(2);
    const strengthText = isNaN(strength) ? '?' : strength.toFixed(2);
    return '(' + moistureText + ', ' + strengthText + ')';
  }).join(', ');
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

function pointIndex(point: any): number | null {
  if (!point || point.index == null || point.index === '') return null;
  const n = Number(point.index);
  return isNaN(n) ? null : n;
}

type SampleOutcome = 'changed' | 'agreed' | 'stayed' | 'neither' | 'followedNoPlan';

function outcomeOf(step: any): SampleOutcome | null {
  const sample = pointIndex(step && step.userFreeSample);
  if (sample == null) return null;
  const suggestions = (step && step.robotSuggestions) || [];
  const suggestionIndexes = suggestions.map(pointIndex).filter((n) => n != null) as number[];
  const followed = suggestionIndexes.indexOf(sample) >= 0;
  const plan = pointIndex(step && step.desiredWaypoint);
  if (plan == null) return followed ? 'followedNoPlan' : 'neither';
  if (followed && sample !== plan) return 'changed';
  if (followed && sample === plan) return 'agreed';
  if (sample === plan) return 'stayed';
  return 'neither';
}

function isFollowed(outcome: SampleOutcome) {
  return outcome === 'changed' || outcome === 'agreed' || outcome === 'followedNoPlan';
}

function followedLetter(step: any): string | null {
  const sample = pointIndex(step && step.userFreeSample);
  if (sample == null) return null;
  const suggestions = (step && step.robotSuggestions) || [];
  const index = suggestions.findIndex((suggestion) => pointIndex(suggestion) === sample);
  if (index < 0) return null;
  return String.fromCharCode(65 + index);
}

type DestGroup = { n: number; plan: number; suggestion: number; other: number };
type PointBucket = {
  samples: number;
  changed: number;
  agreed: number;
  stayed: number;
  neither: number;
  followedNoPlan: number;
  overlap: DestGroup;
  separate: DestGroup;
  noPlan: number;
  confFollowed: number[];
  confNot: number[];
  letters: string[];
  reasons: string[];
};

function emptyDest(): DestGroup {
  return { n: 0, plan: 0, suggestion: 0, other: 0 };
}

function emptyBucket(): PointBucket {
  return {
    samples: 0,
    changed: 0,
    agreed: 0,
    stayed: 0,
    neither: 0,
    followedNoPlan: 0,
    overlap: emptyDest(),
    separate: emptyDest(),
    noPlan: 0,
    confFollowed: [],
    confNot: [],
    letters: [],
    reasons: [],
  };
}

function followedCount(bucket: PointBucket) {
  return bucket.changed + bucket.agreed + bucket.followedNoPlan;
}

function addStep(bucket: PointBucket, step: any) {
  const outcome = outcomeOf(step);
  if (!outcome) return;
  bucket.samples += 1;
  bucket[outcome] += 1;
  const suggestionIndexes = ((step && step.robotSuggestions) || []).map(pointIndex).filter((n) => n != null) as number[];
  const sample = pointIndex(step && step.userFreeSample);
  const plan = pointIndex(step && step.desiredWaypoint);
  if (sample != null && plan != null) {
    const group = suggestionIndexes.indexOf(plan) >= 0 ? bucket.overlap : bucket.separate;
    group.n += 1;
    if (sample === plan) group.plan += 1;
    else if (suggestionIndexes.indexOf(sample) >= 0) group.suggestion += 1;
    else group.other += 1;
  } else if (sample != null) {
    bucket.noPlan += 1;
  }
  const conf = confidenceNumber(step && step.decisionConfidence);
  if (conf != null) {
    (isFollowed(outcome) ? bucket.confFollowed : bucket.confNot).push(conf);
  }
  const letter = followedLetter(step);
  if (letter) bucket.letters.push(letter);
  if (!isFollowed(outcome)) {
    const options = step && step.rejectReasonsOptions;
    if (Array.isArray(options) && options.length) {
      options.forEach((text) => { if (text) bucket.reasons.push(String(text)); });
    } else if (step && step.rejectReason) {
      bucket.reasons.push(String(step.rejectReason));
    }
  }
}

function bucketFor(list: SessionRecord[]) {
  const bucket = emptyBucket();
  list.forEach((session) => stepsOf(session).forEach((step) => addStep(bucket, step)));
  return bucket;
}

function formatMean(nums: number[]) {
  const value = mean(nums);
  return value == null ? '—' : value.toFixed(1);
}

function countIn(items: string[], key: string) {
  return items.filter((item) => item === key).length;
}

function breakdownRows(withItems: string[], withoutItems: string[], allItems: string[]) {
  const seen: { [key: string]: boolean } = {};
  allItems.forEach((item) => { seen[item || '—'] = true; });
  return Object.keys(seen).map((key) => ({
    key,
    with: countIn(withItems, key),
    without: countIn(withoutItems, key),
    all: countIn(allItems, key),
  })).sort((a, b) => b.all - a.all);
}

function DestLeaves({ group, suggestionLabel }: { group: DestGroup; suggestionLabel: string }) {
  const rows = [
    ['Stayed on the plan', group.plan],
    [suggestionLabel, group.suggestion],
    ['Moved somewhere else', group.other],
  ];
  return (
    <div className="adminLeaves">
      {rows.map((row) => (
        <div className="adminLeaf" key={row[0]}>
          <span>{row[0]}</span>
          <span>{row[1]}</span>
        </div>
      ))}
    </div>
  );
}

function DecisionTreeCard({ title, bucket }: { title: string; bucket: PointBucket }) {
  return (
    <article className="adminTree">
      <h2>{title}</h2>
      <p className="adminTreeRoot">{bucket.samples}</p>
      <p className="adminTreeCaption">sampling decisions, after a plan was marked and suggestions were shown</p>
      <div className="adminBranch">
        <div className="adminBranchTitle">
          <span>A suggestion landed on the plan</span>
          <span>{bucket.overlap.n}</span>
        </div>
        <DestLeaves group={bucket.overlap} suggestionLabel="Moved to another suggestion" />
      </div>
      <div className="adminBranch">
        <div className="adminBranchTitle">
          <span>No suggestion landed on the plan</span>
          <span>{bucket.separate.n}</span>
        </div>
        <DestLeaves group={bucket.separate} suggestionLabel="Moved to a suggestion" />
      </div>
      {bucket.noPlan ? <p className="adminNote">Plan was not recorded: {bucket.noPlan}</p> : null}
    </article>
  );
}

function confidenceNumber(value: any): number | null {
  if (typeof value !== 'string' || !value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
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

  const withSessions = filtered.filter((session) => session.explanationEnabled === true);
  const withoutSessions = filtered.filter((session) => session.explanationEnabled === false);
  const withPoints = bucketFor(withSessions);
  const withoutPoints = bucketFor(withoutSessions);
  const allPoints = bucketFor(filtered);
  const selectedPoints = selected ? bucketFor([selected]) : emptyBucket();
  const objectives: string[] = [];
  const methods: string[] = [];
  const versions: string[] = [];
  filtered.forEach((session) => {
    objectives.push(primaryObjective(session));
    methods.push(resolutionMethodOf(session));
    versions.push(dataVersionLabel(session));
  });
  const letterRows = breakdownRows(withPoints.letters, withoutPoints.letters, allPoints.letters);
  const reasonRows = breakdownRows(withPoints.reasons, withoutPoints.reasons, allPoints.reasons);

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
        <section>
          <p className="adminContext">{filtered.length} participants · {allPoints.samples} sampling decisions</p>
          <div className="adminTrees">
            <DecisionTreeCard title="With explanation" bucket={withPoints} />
            <DecisionTreeCard title="Without explanation" bucket={withoutPoints} />
          </div>

          <h2 className="adminSectionTitle">Which suggestion was sampled</h2>
          <table className="adminCompare">
            <thead>
              <tr><th>Suggestion</th><th>With</th><th>Without</th><th>All</th></tr>
            </thead>
            <tbody>
              {letterRows.length ? letterRows.map((row) => (
                <tr key={row.key}><th>{row.key}</th><td>{row.with}</td><td>{row.without}</td><td>{row.all}</td></tr>
              )) : <tr><th>No matches yet</th><td>—</td><td>—</td><td>—</td></tr>}
            </tbody>
          </table>

          <h2 className="adminSectionTitle">Why a suggestion was not sampled</h2>
          <table className="adminCompare">
            <thead>
              <tr><th>Reason</th><th>With</th><th>Without</th><th>All</th></tr>
            </thead>
            <tbody>
              {reasonRows.length ? reasonRows.map((row) => (
                <tr key={row.key}><th>{row.key}</th><td>{row.with}</td><td>{row.without}</td><td>{row.all}</td></tr>
              )) : <tr><th>No reject reasons recorded</th><td>—</td><td>—</td><td>—</td></tr>}
            </tbody>
          </table>

          <h2 className="adminSectionTitle">Session background</h2>
          <div className="adminGrid">
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
          </div>
        </section>
      )}

      {view === 'list' && (
        <section>
          <p className="adminContext">
            With explanation: a suggestion landed on the plan in {withPoints.overlap.n} of {withPoints.samples} decisions. Without explanation: {withoutPoints.overlap.n} of {withoutPoints.samples}.
          </p>
          <table className="adminTable">
            <thead>
              <tr>
                <th>Time</th>
                <th>Branch</th>
                <th>Source</th>
                <th>Samples</th>
                <th>Followed</th>
                <th>Moved to a suggestion</th>
                <th>Confidence followed / not</th>
                <th>Primary objective</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => {
                const points = bucketFor([session]);
                return (
                  <tr key={session.id} onClick={() => openSession(session.id)}>
                    <td>{formatTime(session.createdAt)}</td>
                    <td>{branchLabel(session)}</td>
                    <td>{isFormal(session) ? 'Assigned' : 'Manual test'}</td>
                    <td>{points.samples}</td>
                    <td>{followedCount(points)}/{points.samples}</td>
                    <td>{points.changed}/{points.samples}</td>
                    <td>{formatMean(points.confFollowed)} / {formatMean(points.confNot)}</td>
                    <td>{primaryObjective(session)}</td>
                    <td>
                      <button onClick={(e) => { e.stopPropagation(); downloadSession(session); }}>JSON</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(session); }}>Hide</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {view === 'detail' && selected && (
        <section className="adminDetail">
          <p><button onClick={() => setView('list')}>Back to list</button></p>
          <h2>Session {selected.id}</h2>
          <p>{formatTime(selected.createdAt)} · {branchLabel(selected)} · {isFormal(selected) ? 'Assigned' : 'Manual test (' + selected.explanationChoice + ')'}</p>
          <p>Samples: {sampleCount(selected)} · Data version: {dataVersionLabel(selected)}</p>
          <div className="adminTrees adminTreesSingle">
            <DecisionTreeCard title={branchLabel(selected)} bucket={selectedPoints} />
          </div>
          <p>Hypothesis confidence: {(selected.payload && selected.payload.hypothesisConfidence) || '—'}</p>
          <p>Important points: {formatPointList(selected.payload && selected.payload.importantPoints)}{selected.payload && selected.payload.importantWeighedEqually ? ' · weighed every point equally' : ''}</p>
          <p>Ignored points: {formatPointList(selected.payload && selected.payload.ignoredPoints)}</p>
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
                  <td>{item.label || item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
