import * as React from 'react';
import { useState, useEffect } from 'react';
import TextField from '@material-ui/core/TextField';
import { useHistory } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { useStateValue, Action } from '../state';
import '../styles/conclusion.scss';
import ChartPanel from '../components/ChartPanel';
import { initializeCharts, updateCharts } from '../handlers/ChartHandler';
import { confidenceTexts } from '../constants';
import '../styles/survey.scss';

const singleTransectNullHypothesis = require('../../assets/SingleTransectNullHypothesisbackup.png');

export default function Conclusion() {
  const history = useHistory();
  const [globalState, dispatch] = useStateValue();
  const [coordText, setCoordText] = useState('');

  const { finalHypo, conclusionFreeResponse } = globalState;

  // State for navigating between parts
  const [showSecondPart, setShowSecondPart] = useState(false);
  const [disable, setDisable] = useState(true);
  const [consideredAllData, setConsideredAllData] = useState(false);

  function handleChange(e) {
    setDisable(e.target.value === '');
  }

  // Initialize charts on load
  useEffect(() => {
    initializeCharts(globalState, dispatch);
    setTimeout(() => updateCharts(globalState, dispatch), 100);
  }, []);

  const onConclusionFreeResponse = (e) => {
    dispatch({ type: Action.SET_CONCLUSION_FREE_RESPONSE, value: e.target.value });
  };

  const handleResponse = (value: any) => {
    dispatch({ type: Action.SET_FINAL_HYPO_CONFIDENCE, value: value });
  };

  const onContinueClick = () => {
    history.push('/survey'); // Move to the survey page
  };

  const onNextClick = () => {
    setShowSecondPart(true); // Switch to the second part of the conclusion page
  };

  const handleCheckboxChange = (event) => {
    setConsideredAllData(event.target.checked);
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

           

            {!showSecondPart ? (
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

                <div className="hypothesisBlock">
                  <div className="hypothesisTitle" style={{ marginTop: '1px' }}>
                    <strong>Final Hypothesis Confidence</strong>
                  </div>
                  <div className="hypothesisText">
                    Provide a final ranking of your certainty that the hypothesis has been supported or refuted:
                  </div>

                  <FormControl style={{ border: '2.5px solid red', animation: 'blinker 2s linear infinite' }}>
                    <Select
                      style={{ fontSize: '1.5vh' }}
                      value={finalHypo + 3}
                      onChange={event => handleResponse(Number(event.target.value) - 3)}
                    >
                      {confidenceTexts.map((text, i) => (
                        <MenuItem key={i} value={i}>{text}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* <div className="hypothesisTitle" style={{ marginTop: '2.5%' }}>
                    <strong>Explain your reasoning for making this judgment about the hypothesis</strong>
                  </div>
                  <textarea
                    style={{
                      marginTop: '1%', marginBottom: '1%', width: '100%', height: '40%', 
                      padding: '5px', outline: 'none', border: 'solid 1px gray'
                    }}
                    placeholder="Type N/A, if not applicable."
                    onChange={e => { onConclusionFreeResponse(e); handleChange(e); }}
                  ></textarea> */}
                </div>

                <div className="confirmButtonContainer">
                  <Button
                    className="nextButton"
                    variant="contained"
                    color="primary"
                    onClick={onNextClick}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Second part of the conclusion */}
                <div className="text" style={{ marginTop: '1%' }}>
                  <p><strong>Are there any data points that you considered particularly important when making your final judgment about the hypothesis?</strong></p>
                  <p>
                    Please write the data point coordinates in the textbox (hover over points on plot to get exact coordinates) OR check the box below if every data point was weighed equally in your judgement.                  </p>
                  
                </div>

                                    <TextField
                    label="Coordinates"
                    variant="outlined"
                    placeholder="(6.14, 4.59), (5.34, 2.34)"
                    multiline
                    rows={3}
                    fullWidth
                    value={coordText}
                    // onChange={}
                  />

                {/* Checkbox for considering all data points */}
                <p>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={consideredAllData}
                      onChange={handleCheckboxChange}
                      color="primary"
                    />
                  }
                  label="I considered every data point when making my decision about the hypothesis"
                />
                  </p>
                <div className="confirmButtonContainer">
                  <Button
                    className="continueButton"
                    variant="contained"
                    color="primary"
                    onClick={onContinueClick}
                  >
                    Continue
                  </Button>
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
