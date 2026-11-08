import * as React from 'react';
import { useEffect, useRef } from 'react';
import { makeStyles, createTheme, ThemeProvider } from '@material-ui/core/styles';
import { HashRouter as Router, Route, Switch, Redirect, useHistory, useLocation } from "react-router-dom";
import { StateProvider, useStateValue, Action } from './state';
import Intro from './pages/intro';
import Decision from './pages/decision';
import Conclusion from './pages/conclusion';
import Survey from './pages/survey';
import { GlobalDialog } from './components/GlobalDialog';
import Complete from './pages/complete';
import { logTrace } from './logger';
import { TraceType } from './types';
import { getMoistureData, getShearData } from './util';
import { initialSamplesSet } from './sampleTemplates';
import { buildProgress, progressSignature, writeProgress } from './progress';

const theme = createTheme({
  palette: {
    primary: { main: '#114B5F' },
    secondary: { main: '#028090' },
  },
});

const useStyles = makeStyles(theme => {
  return {
    body: {
      margin: 0
    }
  };
});

let currentPathname = '', currentSearch = '';

// A wrapper in order to access the state value
function RouteWrapper() {
  const [globalState, dispatch] = useStateValue();
  const { dataVersion, transectIdx } = globalState;
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    history.listen((newLocation, action) => {
      logTrace(TraceType.ENTER_PAGE, newLocation.pathname);
      // This will activate anytime any extension is pushed to the URL (e.g., "geo", "strategy", "decision", etc.)
      if (action === "PUSH") {
        if (
          newLocation.pathname !== currentPathname ||
          newLocation.search !== currentSearch
        ) {
          // Save new location
          currentPathname = newLocation.pathname;
          currentSearch = newLocation.search;
  
          // Clone location object and push it to history
          history.push({
            pathname: newLocation.pathname,
            search: newLocation.search
          });
        }
      } else {
        // Send user back to current page if they try to navigate back to previous page.
        history.go(1);
      }
    });
  }, [history]);

  const savedSignature = useRef('');

  // Dataset is static. Keep samples that were restored from progress.
  useEffect(() => {
    dispatch({ type: Action.SET_MOISTURE_DATA, value: getMoistureData() });
    dispatch({ type: Action.SET_FULL_DATA, value: getShearData(dataVersion.local) });
    if (!globalState.samples || globalState.samples.length === 0) {
      dispatch({ type: Action.SET_SAMPLES, value: initialSamplesSet[dataVersion.local] });
      dispatch({ type: Action.SET_CURR_SAMPLE_IDX, value: 0 });
    }
    dispatch({ type: Action.SET_CHART_SETTINGS, value: { mode: globalState.chartSettings.mode, updateRequired: true } });
    dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: { updateRequired: true } });
  }, []);

  useEffect(() => {
    const target = globalState.submitted ? '/complete' : (globalState.progressRoute || '/');
    if (location.pathname !== target) {
      history.replace(target);
    }
  }, []);

  useEffect(() => {
    try {
      const record = buildProgress(globalState);
      const signature = progressSignature(record);
      if (signature === savedSignature.current) return;
      savedSignature.current = signature;
      writeProgress(record);
    } catch (err) {}
  });

  if (globalState.submitted && location.pathname !== '/complete') {
    return <Redirect to="/complete" />;
  }

  // Page router - Redirect the user to the intro section if the user has not yet completed it yet
  return (
    <div>
      <Switch>
        <Route exact path="/" component={Intro}/>
        <Route path="/decision" render={props => (
          globalState.introCompleted ? <Decision/> : <Redirect to={{ pathname: '/'}}/> )} />
        <Route path="/conclusion" render={props => (
          globalState.introCompleted ? <Conclusion/> : <Redirect to={{ pathname: '/'}}/> )} />
        <Route path="/survey" render={props => (
          globalState.introCompleted ? <Survey/> : <Redirect to={{ pathname: '/'}}/> )} />
        <Route path="/complete" component={Complete}/>
      </Switch>
      <GlobalDialog />
    </div>
  );
}

export function App(){
  const classes = useStyles();
  document.title = "Geologic Field Decision Making";
 
  return (
    <ThemeProvider theme={theme}>
      <div className={classes.body}>
        <StateProvider>
          <Router>
            <RouteWrapper />
          </Router>
        </StateProvider>
      </div>
    </ThemeProvider>
  );
}