// Plain, JSON-serializable experiment progress. Chart objects never go in here.

export const PROGRESS_KEY = 'lassieProgress_v1';
export const PROGRESS_VERSION = 1;
export const PROGRESS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type ProgressRoute = '/' | '/decision' | '/conclusion' | '/survey' | '/complete';

export type ProgressRecord = {
  version: number,
  savedAt: number,
  sessionId: string,
  route: ProgressRoute,
  submitted: boolean,
  introPage: number,
  introCompleted: boolean,
  explanationEnabled: boolean | null,
  explanationChoice: 'with' | 'without' | 'random' | null,
  dataVersion: number,
  objectives: any[],
  resolutionMethod: number,
  initialResolutionMethod: number,
  userFeedbackState: number,
  step: number,
  suggestionsReady: boolean,
  desiredWaypoint: any,
  robotSuggestions: any[],
  spatialReward: number[],
  variableReward: number[],
  discrepancyReward: number[],
  infoGaussian: number[],
  dispGaussian: number[],
  strategySuggestions: any[],
  showRobotSuggestions: boolean,
  userSample: any,
  samples: any[],
  currSampleIdx: number,
  numImgClicks: number,
  userSteps: any[],
  rejectReasons: number[],
  rejectReasonsOptions: string[],
  rejectReasonFreeResponse: string,
  decisionConfidence: number,
  suggestionOverlapNote: string,
  hitSuggestion: boolean,
  matchedSuggestionLabel: string | null,
  sampleType: 'robot' | 'user' | null,
  conclusionStep: 'confidence' | 'important' | 'ignored',
  hypothesisConfidence: number,
  importantPoints: any[],
  ignoredPoints: any[],
  importantWeighedEqually: boolean,
  ignoredConsideredEveryPoint: boolean,
  conclusionFreeResponse: string,
  surveyPage: number,
  surveyAnswers: { [key: string]: string },
};

export function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isRoute(value: any): value is ProgressRoute {
  return value === '/' || value === '/decision' || value === '/conclusion' || value === '/survey' || value === '/complete';
}

// Researcher reset. The query must sit before the hash, as in /?reset=1#/.
// A hash query such as #/?reset=1 is a route, not this switch.
export function consumeProgressReset(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') !== '1') return;
    window.localStorage.removeItem(PROGRESS_KEY);
    params.delete('reset');
    const search = params.toString();
    const next = window.location.pathname + (search ? '?' + search : '') + window.location.hash;
    window.history.replaceState(window.history.state, '', next);
  } catch (err) {}
}

export function readProgress(): ProgressRecord | null {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== PROGRESS_VERSION || typeof parsed.sessionId !== 'string' || !parsed.sessionId) {
      window.localStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > PROGRESS_MAX_AGE_MS) {
      window.localStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    if (!isRoute(parsed.route)) {
      window.localStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    return parsed as ProgressRecord;
  } catch (err) {
    try { window.localStorage.removeItem(PROGRESS_KEY); } catch (ignore) {}
    return null;
  }
}

export function writeProgress(record: ProgressRecord): void {
  try {
    const payload = { ...record, version: PROGRESS_VERSION, savedAt: Date.now() };
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
  } catch (err) {}
}

function copyList(value: any): any[] {
  return Array.isArray(value) ? value.map(item => (item && typeof item === 'object' ? { ...item } : item)) : [];
}

function copySample(sample: any) {
  if (!sample || typeof sample !== 'object') return sample;
  return {
    ...sample,
    isHovered: false,
    moisture: Array.isArray(sample.moisture) ? sample.moisture.slice() : sample.moisture,
    shear: Array.isArray(sample.shear) ? sample.shear.slice() : sample.shear,
  };
}

export function buildProgress(state: any): ProgressRecord {
  const step = state.currUserStep || {};
  if (state.submitted) {
    return {
      version: PROGRESS_VERSION,
      savedAt: Date.now(),
      sessionId: state.sessionId,
      route: '/complete',
      submitted: true,
      introPage: 0,
      introCompleted: true,
      explanationEnabled: state.explanationEnabled,
      explanationChoice: state.explanationChoice,
      dataVersion: state.dataVersion && state.dataVersion.local,
      objectives: [],
      resolutionMethod: 0,
      initialResolutionMethod: 0,
      userFeedbackState: 0,
      step: 1,
      suggestionsReady: false,
      desiredWaypoint: null,
      robotSuggestions: [],
      spatialReward: [],
      variableReward: [],
      discrepancyReward: [],
      infoGaussian: [],
      dispGaussian: [],
      strategySuggestions: [],
      showRobotSuggestions: false,
      userSample: null,
      samples: [],
      currSampleIdx: 0,
      numImgClicks: 0,
      userSteps: [],
      rejectReasons: [],
      rejectReasonsOptions: [],
      rejectReasonFreeResponse: '',
      decisionConfidence: -1,
      suggestionOverlapNote: '',
      hitSuggestion: false,
      matchedSuggestionLabel: null,
      sampleType: null,
      conclusionStep: 'confidence',
      hypothesisConfidence: -1,
      importantPoints: [],
      ignoredPoints: [],
      importantWeighedEqually: false,
      ignoredConsideredEveryPoint: false,
      conclusionFreeResponse: '',
      surveyPage: 0,
      surveyAnswers: {},
    };
  }
  return {
    version: PROGRESS_VERSION,
    savedAt: Date.now(),
    sessionId: state.sessionId,
    route: isRoute(state.progressRoute) ? state.progressRoute : '/',
    submitted: false,
    introPage: state.introPage || 0,
    introCompleted: !!state.introCompleted,
    explanationEnabled: state.explanationEnabled == null ? null : !!state.explanationEnabled,
    explanationChoice: state.explanationChoice || null,
    dataVersion: state.dataVersion && state.dataVersion.local,
    objectives: copyList(step.objectives),
    resolutionMethod: step.resolutionMethod || 0,
    initialResolutionMethod: state.initialResolutionMethod || 0,
    userFeedbackState: step.userFeedbackState,
    step: step.step || 1,
    suggestionsReady: !!step.suggestionsReady,
    desiredWaypoint: step.desiredWaypoint ? { ...step.desiredWaypoint } : null,
    robotSuggestions: copyList(step.robotSuggestions),
    spatialReward: Array.isArray(step.spatialReward) ? step.spatialReward.slice() : [],
    variableReward: Array.isArray(step.variableReward) ? step.variableReward.slice() : [],
    discrepancyReward: Array.isArray(step.discrepancyReward) ? step.discrepancyReward.slice() : [],
    infoGaussian: Array.isArray(step.infoGaussian) ? step.infoGaussian.slice() : [],
    dispGaussian: Array.isArray(step.dispGaussian) ? step.dispGaussian.slice() : [],
    strategySuggestions: JSON.parse(JSON.stringify(step.strategySuggestions || [])),
    showRobotSuggestions: !!state.showRobotSuggestions,
    userSample: copySample(step.userSample),
    samples: Array.isArray(state.samples) ? state.samples.map(copySample) : [],
    currSampleIdx: state.currSampleIdx || 0,
    numImgClicks: state.numImgClicks || 0,
    userSteps: JSON.parse(JSON.stringify(state.userSteps || [])),
    rejectReasons: Array.isArray(step.rejectReasons) ? step.rejectReasons.slice() : [],
    rejectReasonsOptions: Array.isArray(step.rejectReasonsOptions) ? step.rejectReasonsOptions.slice() : [],
    rejectReasonFreeResponse: step.rejectReasonFreeResponse || '',
    decisionConfidence: typeof step.decisionConfidence === 'number' ? step.decisionConfidence : -1,
    suggestionOverlapNote: step.suggestionOverlapNote || '',
    hitSuggestion: !!step.hitSuggestion,
    matchedSuggestionLabel: step.matchedSuggestionLabel || null,
    sampleType: step.sampleType || null,
    conclusionStep: state.conclusionStep === 'important' || state.conclusionStep === 'ignored' ? state.conclusionStep : 'confidence',
    hypothesisConfidence: typeof state.hypothesisConfidence === 'number' ? state.hypothesisConfidence : -1,
    importantPoints: copyList(state.importantPoints),
    ignoredPoints: copyList(state.ignoredPoints),
    importantWeighedEqually: !!state.importantWeighedEqually,
    ignoredConsideredEveryPoint: !!state.ignoredConsideredEveryPoint,
    conclusionFreeResponse: state.conclusionFreeResponse || '',
    surveyPage: state.surveyPage || 0,
    surveyAnswers: state.surveyAnswers && typeof state.surveyAnswers === 'object' ? { ...state.surveyAnswers } : {},
  };
}

export function progressSignature(record: ProgressRecord): string {
  const { savedAt, ...rest } = record;
  return JSON.stringify(rest);
}

export function applyProgress(base: any, saved: ProgressRecord) {
  const next = {
    ...base,
    sessionId: saved.sessionId,
    progressRoute: saved.submitted ? '/complete' : saved.route,
    submitted: !!saved.submitted,
    introPage: saved.introPage || 0,
    introCompleted: !!saved.introCompleted || !!saved.submitted,
    explanationEnabled: saved.explanationEnabled == null ? null : !!saved.explanationEnabled,
    explanationChoice: saved.explanationChoice || null,
    initialResolutionMethod: saved.initialResolutionMethod || 0,
    conclusionStep: saved.conclusionStep || 'confidence',
    hypothesisConfidence: typeof saved.hypothesisConfidence === 'number' ? saved.hypothesisConfidence : -1,
    importantPoints: copyList(saved.importantPoints),
    ignoredPoints: copyList(saved.ignoredPoints),
    importantWeighedEqually: !!saved.importantWeighedEqually,
    ignoredConsideredEveryPoint: !!saved.ignoredConsideredEveryPoint,
    conclusionFreeResponse: saved.conclusionFreeResponse || '',
    surveyPage: saved.surveyPage || 0,
    surveyAnswers: saved.surveyAnswers && typeof saved.surveyAnswers === 'object' ? { ...saved.surveyAnswers } : {},
    showRobotSuggestions: !!saved.showRobotSuggestions,
    numImgClicks: saved.numImgClicks || 0,
    currSampleIdx: saved.currSampleIdx || 0,
    userSteps: JSON.parse(JSON.stringify(saved.userSteps || [])),
    chartSettings: { ...base.chartSettings, updateRequired: true },
    explanationChartSettings: { updateRequired: true },
  };
  if (saved.submitted) {
    return next;
  }
  if (Array.isArray(saved.samples) && saved.samples.length) {
    next.samples = saved.samples.map(copySample);
  }
  next.currUserStep = {
    ...base.currUserStep,
    step: saved.step || 1,
    userFeedbackState: typeof saved.userFeedbackState === 'number' ? saved.userFeedbackState : base.currUserStep.userFeedbackState,
    objectives: copyList(saved.objectives).length ? copyList(saved.objectives) : base.currUserStep.objectives,
    resolutionMethod: saved.resolutionMethod || 0,
    suggestionsReady: !!saved.suggestionsReady,
    desiredWaypoint: saved.desiredWaypoint ? { ...saved.desiredWaypoint } : null,
    robotSuggestions: copyList(saved.robotSuggestions),
    spatialReward: Array.isArray(saved.spatialReward) ? saved.spatialReward.slice() : [],
    variableReward: Array.isArray(saved.variableReward) ? saved.variableReward.slice() : [],
    discrepancyReward: Array.isArray(saved.discrepancyReward) ? saved.discrepancyReward.slice() : [],
    infoGaussian: Array.isArray(saved.infoGaussian) ? saved.infoGaussian.slice() : [],
    dispGaussian: Array.isArray(saved.dispGaussian) ? saved.dispGaussian.slice() : [],
    strategySuggestions: JSON.parse(JSON.stringify(saved.strategySuggestions || [])),
    userSample: copySample(saved.userSample),
    rejectReasons: Array.isArray(saved.rejectReasons) ? saved.rejectReasons.slice() : [],
    rejectReasonsOptions: Array.isArray(saved.rejectReasonsOptions) ? saved.rejectReasonsOptions.slice() : [],
    rejectReasonFreeResponse: saved.rejectReasonFreeResponse || '',
    decisionConfidence: typeof saved.decisionConfidence === 'number' ? saved.decisionConfidence : -1,
    suggestionOverlapNote: saved.suggestionOverlapNote || '',
    hitSuggestion: !!saved.hitSuggestion,
    matchedSuggestionLabel: saved.matchedSuggestionLabel || null,
    sampleType: saved.sampleType || null,
  };
  return next;
}
