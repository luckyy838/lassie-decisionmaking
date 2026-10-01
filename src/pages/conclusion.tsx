import * as React from 'react';
import { useState, useEffect } from 'react';
import { Box, Slider } from '@material-ui/core';
import { useHistory } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { useStateValue, Action, ConclusionPoint } from '../state';
import '../styles/conclusion.scss';
import ChartPanel from '../components/ChartPanel';
import { initializeCharts, updateCharts } from '../handlers/ChartHandler';
import { decisionConfidenceTexts } from '../constants';
import { conclusionPointKey, conclusionPointRing } from '../conclusionPointRing';
import '../styles/survey.scss';

const singleTransectNullHypothesis = require('../../assets/SingleTransectNullHypothesisbackup.png');

const IMPORTANT_RING = '#111111';
const IGNORED_RING = '#a6a6a6';

function samePoint(a: ConclusionPoint, b: ConclusionPoint) {
  return a.rowIndex === b.rowIndex && a.measurementIndex === b.measurementIndex;
}

function togglePoint(list: ConclusionPoint[], point: ConclusionPoint) {
  if (list.some(item => samePoint(item, point))) {
    return list.filter(item => !samePoint(item, point));
  }
  return list.concat(point);
}

export default function Conclusion() {
  const history = useHistory();
  const [globalState, dispatch] = useStateValue();
  const hypothesisConfidence = globalState.hypothesisConfidence == null ? -1 : globalState.hypothesisConfidence;
  const importantPoints = globalState.importantPoints || [];
  const ignoredPoints = globalState.ignoredPoints || [];
  const importantWeighedEqually = !!globalState.importantWeighedEqually;
  const confidenceMarks = decisionConfidenceTexts.map((label, i) => ({ value: i, label }));

  const [step, setStep] = useState<'confidence' | 'important' | 'ignored'>('confidence');
  const selectionRef = React.useRef({ step, importantPoints, ignoredPoints });
  selectionRef.current = { step, importantPoints, ignoredPoints };

  // Initialize charts on load
  useEffect(() => {
    initializeCharts(globalState, dispatch);
    setTimeout(() => updateCharts(globalState, dispatch), 100);
  }, []);

  useEffect(() => {
    const chart = globalState.chart && globalState.chart.shearMoistChart;
    const selecting = step === 'important' || step === 'ignored';
    const selected = step === 'ignored' ? ignoredPoints : importantPoints;
    conclusionPointRing.active = selecting;
    conclusionPointRing.color = step === 'ignored' ? IGNORED_RING : IMPORTANT_RING;
    conclusionPointRing.keys = {};
    if (selecting) {
      selected.forEach(point => {
        conclusionPointRing.keys[conclusionPointKey(point.rowIndex, point.measurementIndex)] = true;
      });
    }
    if (chart && chart.ctx && chart.canvas && document.body.contains(chart.canvas)) {
      chart.update();
    }
  }, [step, importantPoints, ignoredPoints, globalState.chart]);

  useEffect(() => {
    const chart = globalState.chart && globalState.chart.shearMoistChart;
    if (!chart || !chart.ctx || !chart.canvas || !document.body.contains(chart.canvas)) {
      return;
    }
    const selecting = step === 'important' || step === 'ignored';
    chart.options.onClick = selecting ? (evt) => {
      const hits = chart.getElementAtEvent(evt);
      const hit = hits && hits[0];
      if (!hit || hit._index == null) {
        return;
      }
      const raw = chart.data.datasets[hit._datasetIndex || 0].data[hit._index];
      if (!raw) {
        return;
      }
      const point: ConclusionPoint = {
        rowIndex: raw.rowIndex,
        measurementIndex: raw.measurementIndex,
        waypointIndex: raw.index,
        moisture: raw.x,
        strength: raw.y,
      };
      const live = selectionRef.current;
      const current = live.step === 'ignored' ? live.ignoredPoints : live.importantPoints;
      dispatch({
        type: live.step === 'ignored' ? Action.SET_IGNORED_POINTS : Action.SET_IMPORTANT_POINTS,
        value: togglePoint(current, point),
      });
    } : null;
    if (chart.canvas) {
      chart.canvas.style.cursor = selecting ? 'pointer' : 'default';
    }
    return () => {
      conclusionPointRing.active = false;
      conclusionPointRing.keys = {};
      if (chart.options) {
        chart.options.onClick = null;
      }
      if (chart.canvas) {
        chart.canvas.style.cursor = 'default';
      }
    };
  }, [step, globalState.chart]);

  const onSurveyClick = () => {
    history.push('/survey');
  };

  return (
    <div className="conclusionPage">
      <Grid container>
        {/* Left side - Chart remains the same */}
        <Grid item xs={12} md={6}>
          <ChartPanel fullSize={true} mode="ConclusionView" />
        </Grid>

        {/* Right side - Content changes based on showSecondPart */}
        <Grid item xs={12} md={6} className="rightDecisionPanel">
          <div className="rightDecisionPanelContainer">
            <div className="title" style={{ marginTop: '2%' }}>
              <h1>Conclusion</h1>
              <hr style={{ width: '90%' }} />
            </div>

           

            {step === 'confidence' ? (
              <>
                {/* First part of the conclusion (Original Content) */}
                 <img 
              src={singleTransectNullHypothesis} 
              className="nullHypothesisImg" 
              style={{ margin: '10px auto', maxWidth: '100%', height: 'auto' }} 
            />
                <div className="text" style={{ marginTop: '1%' }}>
                  <p>
                    Sand moisture should be highest (most wet) in the interdune and lowest (most dry) at the dune 
                    crest (see purple line). The hypothesis is that strength will increase as moisture 
                    increases until sand is saturated (somewhere along the stoss slope), at which point strength will 
                    be constant as moisture continues to increase (see blue line).
                  </p>
                </div>

                <div className="hypothesis-confidence">
                  <p><strong><i>How confident are you in the hypothesis now that you have this data?</i></strong></p>
                  <div className="slider-box">
                    <Box px={1}>
                      <Slider
                        value={hypothesisConfidence >= 0 ? hypothesisConfidence : 0}
                        min={0}
                        max={6}
                        step={1}
                        marks={confidenceMarks}
                        valueLabelDisplay="off"
                        onChange={(e, val) => {
                          const v = typeof val === 'number' ? val : val[0];
                          dispatch({ type: Action.SET_HYPOTHESIS_CONFIDENCE, value: v });
                        }}
                      />
                    </Box>
                  </div>
                </div>

                <div className="confirmButtonContainer">
                  <Button
                    className="nextButton"
                    variant="contained"
                    color="primary"
                    disabled={hypothesisConfidence < 0}
                    onClick={() => setStep('important')}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : step === 'important' ? (
              <>
                <div className="text" style={{ marginTop: '1%' }}>
                  <p><strong>Are there any data points that you considered <u>particularly important</u> when making your final judgment about the hypothesis?</strong></p>
                  <p>
                    Click points on the plot. Selected points are circled in black. Click a circled point again to remove it. You can continue without selecting any points. OR check the box below if every data point was weighed equally in your judgement.
                  </p>
                </div>
                <p>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={importantWeighedEqually}
                        onChange={(event) => {
                          dispatch({ type: Action.SET_IMPORTANT_WEIGHED_EQUALLY, value: event.target.checked });
                        }}
                        color="primary"
                      />
                    }
                    label="I considered every data point when making my decision about the hypothesis"
                  />
                </p>
                <div className="conclusionNav">
                  <Button variant="contained" color="primary" onClick={() => setStep('confidence')}>Previous</Button>
                  <Button variant="contained" color="primary" onClick={() => setStep('ignored')}>Next</Button>
                </div>
              </>
            ) : (
              <>
                <div className="text" style={{ marginTop: '1%' }}>
                  <p><strong>Are there any data points that you <u>ignored</u> when making your final judgment about the hypothesis?</strong></p>
                  <p>
                    Click points on the plot. Selected points are circled in gray. Click a circled point again to remove it. You can continue without selecting any points.
                  </p>
                </div>
                <div className="conclusionNav">
                  <Button variant="contained" color="primary" onClick={() => setStep('important')}>Previous</Button>
                  <Button variant="contained" color="primary" onClick={onSurveyClick}>Next</Button>
                </div>
              </>
            )}
          </div>
        </Grid>
      </Grid>
    </div>
  );
}

// import * as React from 'react';
// import { useState, useEffect } from 'react';
// import { useHistory } from 'react-router-dom';
// import Button from '@material-ui/core/Button';
// import Grid from '@material-ui/core/Grid';
// import FormControl from '@material-ui/core/FormControl';
// import Select from '@material-ui/core/Select';
// import MenuItem from '@material-ui/core/MenuItem';
// import { useStateValue, Action } from '../state';
// import '../styles/conclusion.scss';
// import ChartPanel from '../components/ChartPanel';
// import { initializeCharts, updateCharts } from '../handlers/ChartHandler';
// import { confidenceTexts } from '../constants';
// import '../styles/survey.scss';

// const singleTransectNullHypothesis = require('../../assets/SingleTransectNullHypothesis.png');

// export default function Conclusion() {
//   const history = useHistory();
//   const [globalState, dispatch] = useStateValue();
//   const { finalHypo, conclusionFreeResponse } = globalState;

//   // Set the textarea as reqiured for users
//   const [disable, setDisable] = useState(true);

//   function handleChange(e) {
//     setDisable(e.target.value === '');
//   }

//   // Display the charts when the conclusion screen is first loaded
//   useEffect(() => {
//     // Re-initialize the charts
//     initializeCharts(globalState, dispatch);
//     setTimeout(() => {updateCharts(globalState, dispatch)}, 100);
//   }, []);

//   // Apply new chanegs by Zeyu 6/13/2022
//   const onConclusionFreeResponse = (e) => {
//     dispatch({ 
//       type: Action.SET_CONCLUSION_FREE_RESPONSE, 
//       value: e.target.value });
//   }
//   console.log(globalState);//for debugging
//   const onContinueClick = () => {
//     history.push('/survey');
//   };

//   const continueButton = (
//     <Button
//       className="continueButton"
//       variant="contained"
//       color="primary"
//       onClick={onContinueClick} disabled={disable}>
//       Continue
//     </Button>
//   );

//   const handleResponse = (value: any) => {
//     dispatch({ 
//         type: Action.SET_FINAL_HYPO_CONFIDENCE, 
//         value: value 
//     });
//   }

//   const responsePage = (
//     <Grid container>
//       <Grid item xs={12} md={6}>
//         <ChartPanel fullSize={true} mode="ConclusionView"/>
//       </Grid>
//       <Grid item xs={12} md={6} className="rightDecisionPanel">
//         <div className="rightDecisionPanelContainer">
//           <div className="title" style={{marginTop:'2%'}}>
//               <h1>Conclusion</h1>
//               <hr style={{width: '90%'}}/>
//           </div>
//           <img src={singleTransectNullHypothesis} className="nullHypothesisImg" style={{marginTop: '-12.5px', marginBottom: '10px', marginRight:'78px', marginLeft:'58px', maxWidth: '100%', height: 'auto'}}/> 
//           <div className="text" style={{marginTop: '1%'}}>
//               <p>
//                   Sand moisture should be highest (most wet) in the interdune and lowest (most dry) at the dune 
//                   crest (see purple line). RHex is testing the hypothesis that strength will increase as moisture 
//                   increases until sand is saturated (somewhere along the stoss slope), at which point strength will 
//                   be constant as moisture continues to increase (see blue line).
//               </p>
//           </div>
//           <div className="hypothesisBlock">
//               <div className="hypothesisTitle" style={{marginTop: '1px'}}><strong>Final Hypothesis Confidence</strong></div>
//               <div className="hypothesisText">
//                 Provide a final ranking of your certainty that the hypothesis has been supported or refuted:
//               </div>
//               <FormControl style={{border: '2.5px solid red', animation: 'blinker 2s linear infinite'}}>
//                   <Select
//                       style={{fontSize: '1.5vh'}}
//                       value={finalHypo + 3}
//                       onChange={event => handleResponse(Number(event.target.value) - 3)}>
//                       {
//                           confidenceTexts.map((text, i) => (<MenuItem key={i} value={i}>{text}</MenuItem>))
//                       }
//                   </Select>
//               </FormControl>
//               {/* Apply new chanegs by Zeyu 6/8/2022 */}
//               {/* 1. Create a state varaible to save the input */}
//               <div className="hypothesisTitle" style={{marginTop: '2.5%'}}>
//                 <strong>Explain your reasoning for making this judgment about the hypothesis</strong>
//               </div>
//               <textarea 
//               style={{marginTop: '1%', marginBottom: '1%', width: '100%', height: '40%', padding: '5px', outline: 'none', border: 'solid 1px gray'}} 
//               placeholder="Type N/A, if not applicable."
//               onChange={e => {onConclusionFreeResponse(e); handleChange(e)} }
//               ></textarea>
//           </div>
//           <div>
//             <div>
//               <Grid item xs={12}>
//                 <div className="confirmButtonContainer">
//                   { continueButton }
//                 </div>
//               </Grid>
//             </div> 
//           </div>
//         </div>
//       </Grid>
//     </Grid>
//   )

//   return (
//     <div className="conclusionPage">
//       {responsePage}
//     </div> 
//   );
// }
