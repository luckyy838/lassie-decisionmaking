//TODO: change objectives ranking thing to automatically fill in the other ranking (since there's only two )
//TODO: end button
//TODO: add resolution methods 

import * as React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import Button from '@material-ui/core/Button'

import HelpIcon from '@material-ui/icons/Help';
import { FormControl, Select, MenuItem, CircularProgress, Slider, Box } from '@material-ui/core';
import Popbox from '../components/Popbox';
import ClickableImage from '../components/ClickableImage';
import { ConfirmDialog, MultiStepDialog } from '../components/Dialogs';
import { getMeasurements, calculateRobotSuggestions, countUserChosenSamples, assignBalancedExplanation } from '../util';
import {
  PopboxTypeEnum, resolutionTexts, NUM_OF_HYPOS,
  UserFeedbackState, objectiveOptions, transitionOptions,
  MAX_USER_SAMPLES, decisionConfidenceTexts, NUM_MEASUREMENTS, sampleLocations,
} from '../constants';
import { instructionExamples, instructionPlanIndex } from '../data/instructionExample';
import { useStateValue, Action } from '../state';
import { returnToScenarioIntroduction } from './intro';
import ChartPanel from '../components/ChartPanel';
import ExplanationPanel from '../components/ExplanationPanel';
import TransectAlignGuides from '../components/TransectAlignGuides';
// import BarChart from '../components/BarChart';
import "../styles/decision.scss";
import { CurrUserStepData, UserStepsData, Sample, PreSample } from '../types';
import { initializeCharts } from '../handlers/ChartHandler';
import { initializeExplanationChart, applyExplanationChartLayout } from '../handlers/ExplanationChartHandler';
import RadioButtonGroup from '../components/RadioButtonGroup';
import RadioButtonGroupMultipleOptions from '../components/RadioButtonGroupMultipleOptions';
import RadioButtonGroupMultipleSelectionOptions from '../components/RadioButtonGroupMultipleSelectionOptions';
import { sampleRobotSuggestion } from '../sampleTemplates';
import Tooltip from '@material-ui/core/Tooltip';
import { isNumber } from 'lodash';


function ImgAlert({ open }) {
  return (
    <Popbox
      open={open}
      type={PopboxTypeEnum.ERROR}
      anchorEl={() => document.getElementById("pos-picker")}
    >
      Please click near the surface of stoss slope!
    </Popbox>
  );
}

export const rejectReasonOptionsGlobal:string[] = [];

export default function Main() {
  const [showImgAlert, setImgAlert] = useState(false);
  const [focusedChart, setFocusedChart] = useState<'scatter' | 'dune' | 'transect' | null>(null);
  const [globalState, dispatch] = useStateValue();

  const { currSampleIdx, samples, currUserStep, userSteps, chart, chartSettings, explanationChart, explanationChartSettings,
    loadingRobotSuggestions, showRobotSuggestions, disableSubmitButton, numSubmitClicks, 
    imgClickEnabled, numImgClicks, transectIdx, explanationEnabled } = globalState;
  const chartRef = React.useRef(chart);
  const explanationChartRef = React.useRef(explanationChart);
  chartRef.current = chart;
  explanationChartRef.current = explanationChart;

  const { step, userFeedbackState, objectives, objectiveFreeResponse, sampleType,
    robotSuggestions, spatialReward, variableReward, discrepancyReward, acceptOrRejectOptions, acceptOrReject, 
    rejectReasonOptions, rejectReason, rejectReasons, rejectReasonsOptions, rejectReasonFreeResponse, userFreeSelection, userSample, rejectExplanationRating,
    resolutionMethod, transition, desiredWaypoint, decisionConfidence, suggestionOverlapNote, hitSuggestion, matchedSuggestionLabel } = currUserStep;

  const history = useHistory();

  //TODO: following code used to override all tutorial edits
  // useEffect(() => {
  //   console.log("Initial userFeedbackState:", userFeedbackState);
    
  //   if (userFeedbackState === 1) {  // Check if it's the unintended default
  //     dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: 5 }); // Set it to your intended start step
  //     console.log("Forced userFeedbackState to 1");
  //   }
  // }, []);

  useEffect(() => {
    if (userFeedbackState === UserFeedbackState.OBJECTIVE) {
      dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.TUTORIAL1 });
    }
  }, []);

  useEffect(() => {
    if (globalState.explanationEnabled != null && globalState.explanationChoice != null) {
      return;
    }
    let cancelled = false;
    assignBalancedExplanation().then((enabled) => {
      if (cancelled) return;
      dispatch({ type: Action.SET_EXPLANATION_ENABLED, value: enabled });
      dispatch({ type: Action.SET_EXPLANATION_CHOICE, value: 'random' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const chosenRewardLineOn = React.useRef(false);
  useEffect(() => {
    const showChosenLine = explanationEnabled === true && !!userSample && (
      userFeedbackState === UserFeedbackState.USER_LOCATION_SELECTION ||
      userFeedbackState === UserFeedbackState.REJECT_REASON ||
      userFeedbackState === UserFeedbackState.REJECT_REASON_FREE_RESPONSE ||
      userFeedbackState === UserFeedbackState.DECISION_CONFIDENCE
    );
    if (!showChosenLine && !chosenRewardLineOn.current) {
      return;
    }
    chosenRewardLineOn.current = showChosenLine;
    dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: { updateRequired: true } });
  }, [userSample, userFeedbackState, explanationEnabled]);

  const instructionExampleOn = React.useRef(false);
  useEffect(() => {
    const inInstruction =
      userFeedbackState === UserFeedbackState.TUTORIAL1 ||
      userFeedbackState === UserFeedbackState.TUTORIAL2 ||
      userFeedbackState === UserFeedbackState.TUTORIAL3 ||
      userFeedbackState === UserFeedbackState.TUTORIAL4;
    if (explanationEnabled === true && inInstruction) {
      const version = globalState.dataVersion.local === 0 ? 0 : 1;
      const example = instructionExamples[version];
      const plan = sampleLocations[instructionPlanIndex];
      unstable_batchedUpdates(() => {
        dispatch({ type: Action.SET_SPATIAL_REWARD, value: example.spatialReward });
        dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: example.discrepancyReward });
        dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: example.suggestions });
        dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: true });
        dispatch({
          type: Action.SET_DESIRED_WAYPOINT,
          value: {
            index: instructionPlanIndex,
            type: 'user',
            measurements: NUM_MEASUREMENTS,
            normOffsetX: plan[0],
            normOffsetY: plan[1],
            isHovered: false,
          },
        });
        dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: { updateRequired: true } });
      });
      instructionExampleOn.current = true;
      return;
    }
    if (!instructionExampleOn.current) {
      return;
    }
    unstable_batchedUpdates(() => {
      dispatch({ type: Action.SET_SPATIAL_REWARD, value: [] });
      dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: [] });
      dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: [] });
      dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: false });
      dispatch({ type: Action.SET_DESIRED_WAYPOINT, value: null });
      dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: { updateRequired: true } });
    });
    instructionExampleOn.current = false;
  }, [explanationEnabled, userFeedbackState]);

  useEffect(() => {
    if (
      userFeedbackState === UserFeedbackState.TUTORIAL1 ||
      userFeedbackState === UserFeedbackState.TUTORIAL2 ||
      userFeedbackState === UserFeedbackState.TUTORIAL3 ||
      userFeedbackState === UserFeedbackState.TUTORIAL4
    ) {
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
    }
    if (userFeedbackState === UserFeedbackState.EXPLANATION_CHOICE) {
      dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.TUTORIAL4 });
    }
  }, [userFeedbackState]);

  useEffect(() => {
    const resizeScatter = () => {
      try {
        const liveChart = chartRef.current as any;
        if (liveChart) {
          Object.keys(liveChart).forEach((key) => {
            const c = liveChart[key];
            if (c && c.resize) {
              c.resize();
            } else if (c && c.update) {
              c.update();
            }
          });
        }
      } catch (err) {}
    };
    resizeScatter();
    const t = window.setTimeout(resizeScatter, 80);
    let finished = false;
    const finishReward = () => {
      if (finished) {
        return;
      }
      finished = true;
      resizeScatter();
      applyExplanationChartLayout(explanationChartRef.current);
    };
    const main = document.querySelector('.decisionPage .decisionMain');
    const onTransitionEnd = (ev: any) => {
      const prop = ev && ev.propertyName ? String(ev.propertyName) : '';
      if (prop && prop.indexOf('grid-template') === -1) {
        return;
      }
      finishReward();
    };
    if (main) {
      main.addEventListener('transitionend', onTransitionEnd);
    }
    const fallback = window.setTimeout(finishReward, 320);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(fallback);
      if (main) {
        main.removeEventListener('transitionend', onTransitionEnd);
      }
    };
  }, [focusedChart]);
  
  
  // Initial page set up
  useEffect(() => {
    console.log({globalState}); // for debugging
    dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: false });
    // Make sure charts are ready for decision page
    initializeCharts(globalState, dispatch);
    // Make the charts update on first render
    dispatch({ type: Action.SET_CHART_SETTINGS, value: {...chartSettings, updateRequired: true} });

    //LUCKY starting this chart as well
    initializeExplanationChart(globalState, dispatch);
    dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: { updateRequired: true}});
  }, []);

  // Function to add next sample to the data plot
  const addDataToPlot = () => {
    dispatch({ type: Action.SET_CURR_SAMPLE_IDX, value: currSampleIdx + 1 });
    dispatch({ type: Action.SET_CHART_SETTINGS, value: {...chartSettings, updateRequired: true} });
  }

  // Automatically populate the charts with any remaining measurements from the transectSamples in the strategy (if the image hasn't been clicked)
  if (currSampleIdx < samples.length && numImgClicks === 0) {
    addDataToPlot();
  }

  // Function to add the latest user step data to the finalized set of userSteps 
  const updateUserSteps = () => {
    let matchedSuggestion = null as any;
    if (userSample && robotSuggestions) {
      matchedSuggestion = robotSuggestions.find(s => s.index === userSample.index) || null;
    }
    const inferredHit = !!matchedSuggestion;
    let acceptedRobotSuggestion = null as any;
    if (inferredHit && matchedSuggestion) {
      const { shearValues, moistureValues } = getMeasurements(globalState, transectIdx, matchedSuggestion.index, matchedSuggestion.measurements);
      acceptedRobotSuggestion = {...matchedSuggestion, shear: shearValues, moisture: moistureValues};
    }
    let newUserStep : UserStepsData = {
      step: step,
      objectives: JSON.parse(JSON.stringify(objectives)),
      objectiveFreeResponse: objectiveFreeResponse,
      sampleType: inferredHit ? 'robot' : sampleType,
      robotSuggestions: robotSuggestions,
      acceptOrReject: inferredHit
        ? ("Followed suggestion " + String.fromCharCode(robotSuggestions.findIndex(s => s.index === userSample!.index) + 65) + (matchedSuggestion.methodLabel ? (" (" + matchedSuggestion.methodLabel + ")") : ""))
        : "Did not follow a suggestion",
      acceptedRobotSuggestion: inferredHit ? acceptedRobotSuggestion : null,
      rejectReason: rejectReason === -1 ? null : rejectReasonOptions[rejectReason],
      rejectReasons: rejectReasons,//Add new change
      rejectReasonsOptions: rejectReasonsOptions, //Add new change
      rejectReasonFreeResponse: rejectReasonFreeResponse,
      userFreeSample: userSample,
      rejectExplanationRating: 0,
      resolutionMethod: resolutionTexts[resolutionMethod],
      samples: JSON.parse(JSON.stringify(samples)),
      transition: "Mark next desired waypoint",
      spatialReward: spatialReward,
      variableReward: variableReward,
      discrepancyReward: discrepancyReward,
      desiredWaypoint: desiredWaypoint,
      decisionConfidence: decisionConfidence >= 0 ? decisionConfidenceTexts[decisionConfidence] : null,
      suggestionOverlapNote: suggestionOverlapNote,
      hitSuggestion: inferredHit,
      matchedSuggestionLabel: inferredHit && matchedSuggestion ? (matchedSuggestion.methodLabel || null) : null,
    }
    dispatch({ type: Action.ADD_USER_STEP, value: newUserStep }); 
  }

  const [confirmConcludeOpen, setConfirmConcludeOpen] = useState(false);
  const [helperOpen, setHelperOpen] = useState(true);

  const goToConclusion = () => {
    if (chart) {
      Object.values(chart).forEach(c => {
        if (!c) return;
        c.data.datasets.forEach(dataset => { dataset.data = []; });
        c.update();
        c.clear();
      });
    }
    history.push('/conclusion');
  };

  const onConcludeClick = () => {
      setConfirmConcludeOpen(true);
  };

  const onQuit = () => {
    if (userSample || desiredWaypoint) {
      updateUserSteps();
    }
    goToConclusion();
    console.log({globalState});
  };
  // Disable submit button if the user has selected no objectives during the OBJECTIVE step
  useEffect(() => {
    if (userFeedbackState === UserFeedbackState.OBJECTIVE) {
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: objectives.length === 0 });
    }
  }, [objectives]);

  
  // In the RANK_OBJECTIVES step, automatically disable the submit button until the user fills out a valid set of rankings for each selected objective
  // Example of set two group of user input buttons 6/12/2022
  useEffect(() => {
    if (userFeedbackState === UserFeedbackState.RANK_OBJECTIVES) {

      let objectivesRankings : number[] = [];
      let disable = false;
      for (let i = 0; i < objectives.length; i++) {
        if (objectives[i].ranking === -1 || objectivesRankings.includes(objectives[i].ranking)) {
          disable = true;
          break;
        } else {
          objectivesRankings.push(objectives[i].ranking);
        }
      }
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: disable });
    }

    if (userFeedbackState === UserFeedbackState.REJECT_REASON) {
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: rejectReasons.length == 0 });
    }

    if (userFeedbackState === UserFeedbackState.DESIRED_WAYPOINT) {
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: !desiredWaypoint });
    }

    if (userFeedbackState === UserFeedbackState.USER_LOCATION_SELECTION) {
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: !userSample });
    }

    if (userFeedbackState === UserFeedbackState.DECISION_CONFIDENCE) {
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: decisionConfidence < 0 });
    }

  }, [objectives, userFeedbackState, rejectReasons, desiredWaypoint, userSample, decisionConfidence, explanationEnabled]);


  const searchObjective = (target : string) => {
    for (let obj = 0; obj < objectives.length; obj++) {
      if (objectives[obj].objective === target) {
        return true;
      }
    }
    return false;
  }

  let objectiveOptionsLinked = objectiveOptions.map((obj, i) => {
    // Add option 0 and 1 by Zeyu 6/7/2022
    // if (i === 0) {
    //   return (
    //   <span>objectiveOptions[i]</span>
    //   );
    // } else if (i === 1) {
    //   return (
    //   <span>objectivesOptions[i]</span>
    //   );
    // } else if (i === 2) {
    //   return (
    //     <span>There is a discrepancy between the data and the <span style={{color: 'blue', textDecorationLine: 'underline', cursor: 'pointer'}}><strong><a onClick={() => setHypothesisOpen(true)}>hypothesis</a></strong></span> that needs additional evaluation</span>
    //   );
    // } else if (i === 3) {
    //   return (
    //     <span>
    //       The data seems to be supporting the <span style={{color: 'blue', textDecorationLine: 'underline', cursor: 'pointer'}}><strong><a onClick={() => setHypothesisOpen(true)}>hypothesis</a></strong></span> so far but additional evaluation is needed
    //     </span>
    //   );
    // } else {
      return <span>{obj}</span>;
    
  });

  const objectiveQuestions = 
    <div className="objective-questions">
      <p><strong>Based on the data collected so far, select which of the following beliefs you currently hold (you may select multiple).</strong></p>
      <RadioButtonGroupMultipleOptions options={objectiveOptionsLinked} searchObjective={(target) => searchObjective(target)} onChange={i => {
        let objectivesTemp = [...objectives]; // objectives: [0, 1, 2]
        if (searchObjective(objectiveOptions[i])) {
          objectivesTemp = objectivesTemp.filter(obj => obj.objective !== objectiveOptions[i]);
        } else {
          let newObjective = {
            objective: objectiveOptions[i],
            ranking: -1,
          };
          objectivesTemp.push(newObjective);
        }
        dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });

        // Clear the user's previous rejectReasons because the user want to update their beliefs
        let resetRejectReasons:number[] = [...rejectReasons];
        resetRejectReasons.splice(0, resetRejectReasons.length);

        let resetRejectReasonsOptions:string[] = [...rejectReasonsOptions];
        resetRejectReasonsOptions.splice(0, resetRejectReasonsOptions.length);

        dispatch({ type: Action.SET_REJECT_REASONS, value: resetRejectReasons });
        dispatch({ type: Action.SET_REJECT_REASONS_OPTIONS, value: resetRejectReasonsOptions });
      }}/>
    </div>

  const objectivesToRank = 
    <table className="dropDownMenuGroup" style={{marginBottom: '2vh'}}>
      <tbody>
          {
            objectives.map((obj, i) => (
                <tr key={obj.objective}>
                  <td>
                    <FormControl>
                      <Select
                        id="objectives-select"
                        value={obj.ranking}
                        onChange={(e) => {
                          let objectivesTemp = [...objectives];
                          if (typeof e.target.value === 'number') objectivesTemp[i].ranking = e.target.value;
                          dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });
                        }}
                      >
                        {Array.from({length: objectives.length}, (_, i) => i + 1).map((rank) => (
                          <MenuItem key={obj.objective + rank} value={rank}>{rank}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </td>
                  <td>
                      { obj.objective }
                  </td>
                </tr>
            ))
          }
      </tbody>
    </table>

  const objectiveRankings =
    <div className="objective-rankings">
     <div className="resolutionMethodTitle"><strong>Prioritize Objectives</strong></div>

      <p>Please rank the following objectives based on initial data collected so far. Spirit will use this ranking to inform its suggestions. 1 is the objective you agree with the most.</p>
      {objectivesToRank}
    </div>

  const updateObjectiveRankings =
  <div className="objective-rankings">
    <div className="objectiveRankingTitle"><strong>Update Objective Rankings</strong></div>
      <p>Your current ranking of the objectives is selected below. If you have changed the order in which you agree with each of the selected beliefs, please change below. (1 being the strongest agreement)</p>
      {objectivesToRank}
    </div>

          
//LUCKY the next two consts are irrelevant (inaccessible to user)
const onObjectiveTextChange = e => {
    dispatch({ type: Action.SET_OBJECTIVES_FREE_RESPONSE, value: e.target.value });
  }
  const objectiveFreeResponseQuestion = 
    <div className="objective-free-response-question" style={{marginBottom: '2vh'}}>
      <p><strong>Please describe your belief about the data collected so far:</strong></p>
      <textarea onChange={onObjectiveTextChange} rows={5} cols={85}/>
    </div>

  useEffect(() => {
    let acceptOrRejectTemp : string[] = robotSuggestions.map((suggestion, index) => "Accept suggested location " + String.fromCharCode(index + 65));
    acceptOrRejectTemp.push("Reject suggestions");
    dispatch({ type: Action.SET_ACCEPT_OR_REJECT_OPTIONS, value: acceptOrRejectTemp });
  }, [robotSuggestions]);
  
  const acceptOrRejectQuestions = 
    <div className="accept-or-reject-questions">
      <p><strong>Based on your belief rankings, RHex suggests sampling from one of the lettered locations marked on the dune cross-section above.</strong></p>
      <RadioButtonGroup options={acceptOrRejectOptions} selectedIndex={acceptOrReject} onChange={i => {
        dispatch({ type: Action.SET_ACCEPT_OR_REJECT, value: i });
        dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
      }}/>
    </div>

// Apply new changes by Zeyu 6/21/2022
  useEffect(() => {
    dispatch({
      type: Action.SET_REJECT_REASON_OPTIONS,
      value: [
        "I did not consider Spirit's suggestions when choosing a location.",
        "I considered Spirit's suggestions, but thought another location would better improve information coverage.",
        "I considered Spirit's suggestions, but thought another location would better enable testing of the hypothesis.",
        "Spirit's suggestions influenced where I chose to go, even though I did not select one of the suggested locations.",
        "I rejected the suggested locations for a different reason.",
      ],
    });
  }, []);

  // Apply new changes by Zeyu 6/19/2022
  const rejectReasonQuestions = 
    <div className="reject-reason-questions">
      <p><strong>Why did you reject Spirit's suggested locations?</strong></p>
      <RadioButtonGroupMultipleSelectionOptions options={rejectReasonOptions}
      selectedIndexs = {rejectReasons}
      onChange={i => {
        const label = rejectReasonOptions[i];
        let selectIndexTemp:number[] = [...rejectReasons];
        let rejectReasonsOptionsTemp:string[] = [...rejectReasonsOptions];
        if (selectIndexTemp.includes(i)) {
          selectIndexTemp = selectIndexTemp.filter(n => n !== i);
          rejectReasonsOptionsTemp = rejectReasonsOptionsTemp.filter(text => text !== label);
        } else {
          selectIndexTemp.push(i);
          if (!rejectReasonsOptionsTemp.includes(label)) rejectReasonsOptionsTemp.push(label);
        }
        dispatch({ type: Action.SET_REJECT_REASONS_OPTIONS, value: rejectReasonsOptionsTemp })
        dispatch({ type: Action.SET_REJECT_REASONS, value: selectIndexTemp })
        dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: selectIndexTemp.length === 0 });
      }
    }/>
    </div>
  
  const onRejectReasonTextChange = e => {
    dispatch({ type: Action.SET_REJECT_REASON_FREE_RESPONSE, value: e.target.value });
  }

  const rejectReasonFreeResponseQuestion = 
    <div className="reject-reason-free-response-question" style={{marginBottom: '2vh'}}>
      <p><strong>Please state your reason for rejecting the suggestion:</strong></p>
      <textarea onChange={onRejectReasonTextChange} rows={5} cols={85}/>
    </div>

  const userLocationSelectionQuestion = 
    <div className="user-location_selection-question">
      <p><strong>Spirit's suggestions now appear on the dune cross-section along with your planned location.</strong></p>
      <p><strong>You may choose your original planned location or one of the suggested locations by clicking on the corresponding {robotSuggestions && robotSuggestions.length
        ? robotSuggestions.map((_, index) => String.fromCharCode(65 + index)).join(', ')
        : 'A, B, C'} on the dune cross-section.</strong></p>
      <p><strong>Alternatively, you may choose a different location by clicking anywhere along the dune cross-section.</strong></p>
    </div>

  const desiredWaypointQuestion =
    <div className="desired-waypoint-question">
      <p><strong>Select a location where you would prefer to collect data next by clicking on the dune cross-section. An orange star will mark the location you select before you see Spirit's suggestions.</strong></p>
    </div>

  const confidenceMarks = decisionConfidenceTexts.map((label, i) => ({ value: i, label }));

  const decisionConfidenceQuestion = (
    <div className="decision-confidence-question decision-confidence-slider">
      <p><strong><i>How confident are you in your decision to collect data at the location you selected?</i></strong></p>
      <div className="slider-box">
        <Box px={4}>
          <Slider
            value={decisionConfidence >= 0 ? decisionConfidence : 0}
            min={0}
            max={6}
            step={1}
            marks={confidenceMarks}
            valueLabelDisplay="off"
            onChange={(e, val) => {
              const v = typeof val === 'number' ? val : val[0];
              dispatch({ type: Action.SET_DECISION_CONFIDENCE, value: v });
              dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
            }}
          />
        </Box>
      </div>
    </div>
  )

  // Hook for displaying hypothesis popup
  // Apply new changes 6/7/2022 by Zeyu
  const singleTransectNullHypothesis = require('../../assets/SingleTransectNullHypothesisbackup.png');
  const [hypothesisOpen, setHypothesisOpen] = useState(false);
  const decisionHypothesisDialog =
    <MultiStepDialog
      open={hypothesisOpen}
      setOpen={setHypothesisOpen}
      title={""}
      allowCancel={false}
      steps={[
        [
          "Sand moisture should be highest (most wet) in the interdune and lowest (most dry) at the dune crest (see blue line). Spirit is testing the hypothesis that strength will increase as moisture increases until sand is saturated (somewhere along the stoss slope), at which point strength will be constant as moisture continues to increase (see blue line)."
        ]
      ]}
      img={singleTransectNullHypothesis}
    />;
  // const [updateButton, setUpdateButton] = useState(true);
  // function handleUpdateButton(e) {
  //   setUpdateButton(false);

  // }

  const updateResolutionMethod =
  <div className='update-resolution-method'>
     <div className="resolutionMethodtext">
        {/* //const prevMethod = resolutionTexts */}
        <div className="resolutionMethodTitle"><strong>Update Resolution Method</strong></div>
        <p>Your current objective resolution method is selected below. If you wish to change it, please do so below:</p>
     </div>
    <RadioButtonGroup options={resolutionTexts} selectedIndex={resolutionMethod} onChange={i => {
        dispatch({ type: Action.SET_RES_METHOD, value: i });
        // onNextFreeResponse(i);
        dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
    }}/>
  </div>
  
  const transitionQuestions = 
    <div className="reject-reason-questions"> 
      <p><strong>What would you like to do next?</strong></p>
      <RadioButtonGroup 
        options={transitionOptions.slice((!userFreeSelection) ? 0 : 1)} 
        selectedIndex={transition} 
        onChange={i => {
          dispatch({ type: Action.SET_TRANSITION, value: i });
          }}/>
    </div>

// {/* <div className="resolutionMethodtext">
//         {/* //const prevMethod = resolutionTexts */}
//         <div className="resolutionMethodTitle"><strong>Update Resolution Method</strong></div>
//         <p>Your current objective resolution method is selected below. If you wish to change it, please do so below:</p>
//      </div>
//      */}

const resMethod = 
<div className='choose-resolution-method'>
     <div className="resolutionMethodtext">
        {/* //const prevMethod = resolutionTexts */}
        <div className="resolutionMethodTitle"><strong>Choose Method for Resolving Objectives</strong></div>
        <p>Please choose your preferred method of balancing the objectives. Spirit will use this preference to inform its suggestions.</p>
     </div>
    <RadioButtonGroup options={resolutionTexts} selectedIndex={resolutionMethod} onChange={i => {
        dispatch({ type: Action.SET_RES_METHOD, value: i });
        // onNextFreeResponse(i);
        dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
    }}/>
  </div>
    
    const tutorial2 = 
    <div className = 'tutorial2'>
      <p>A cross-section of the dune is displayed here that will be used for selecting measurement locations. Spirit’s suggestions will be labeled with letters (e.g., A, B, C).</p>
      <p>Once data has been collected at a location, the location will be marked with a color corresponding to the data in the data panel.</p>
    </div>

  const tutorial3 = 
<div className = 'tutorial3'>
  <p>A reward function corresponding to Spirit’s suggested locations along the dune is displayed under the dune cross-section. Reward is displayed on the y-axis, location along the dune transect is displayed on the x-axis.</p>
  <p>Spirit’s suggestions represent locations it deems highly rewarding based on the balancing of two objectives: information coverage (displayed in purple) and hypothesis evaluation (displayed in green).</p>
  <p>The curves and the lettered mark on the dune are an example of what appears after a plan is marked. In this example, the plan is the orange star on the red sample near the crest.</p>
</div>

const tutorial1 = 
<div className = 'tutorial1'>
  <p>Spirit will take 3 measurements at each location, and collected data will be visualized here. Initial measurements are currently displayed.</p>
  <p>Soil penetration strength is plotted on the y-axis. Soil moisture (%) is plotted on the x-axis.</p>
</div>

const tutorial4 = 
<div className = 'tutorial4'>
  <p>You will evaluate the collected data against the <span style={{color: 'blue', textDecorationLine: 'underline', cursor: 'pointer'}}><strong><a onClick={() => setHypothesisOpen(true)}>hypothesis</a></strong></span>. 
  </p>
  <p>You may choose up to {MAX_USER_SAMPLES} sampling locations. You do not have to choose {MAX_USER_SAMPLES}. This maximum is constrained by Spirit battery life.
  </p>
  <p>Once you feel you have collected enough data to evaluate the hypothesis, select the “End Collection at Transect” button. This button will appear after you have collected your first sample.
  </p>
</div>

  // Match the order of UserFeedbackStates in 'constants.ts'
  const userFeedbackStateMap = [
    objectiveQuestions,
    tutorial1,
    tutorial2,
    tutorial3,
    tutorial4,
    null,
    objectiveRankings,
    resMethod,
    desiredWaypointQuestion,
    userLocationSelectionQuestion,
    rejectReasonQuestions,
    rejectReasonFreeResponseQuestion,
    decisionConfidenceQuestion,
  ]

  // useEffect(() => {
  //   console.log({robotSuggestions});
  // }, [robotSuggestions]);

  const rankObjectives = () => {
    let objectivesTemp = [...objectives];
    objectivesTemp.sort((a, b) => (a.ranking > b.ranking) ? 1 : -1);
    return objectivesTemp;
  }

  const startDesiredWaypointRound = () => {
    dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: false });
    dispatch({ type: Action.SET_DESIRED_WAYPOINT, value: null });
    dispatch({ type: Action.SET_USER_SAMPLE, value: null });
    dispatch({ type: Action.SET_DECISION_CONFIDENCE, value: -1 });
    dispatch({ type: Action.SET_HIT_SUGGESTION, value: false });
    dispatch({ type: Action.SET_MATCHED_SUGGESTION_LABEL, value: null });
    dispatch({ type: Action.SET_SUGGESTION_OVERLAP_NOTE, value: "" });
    dispatch({ type: Action.SET_REJECT_REASON, value: -1 });
    dispatch({ type: Action.SET_REJECT_REASONS, value: [] });
    dispatch({ type: Action.SET_REJECT_REASONS_OPTIONS, value: [] });
    dispatch({ type: Action.SET_REJECT_REASON_FREE_RESPONSE, value: "" });
    dispatch({ type: Action.SET_ACCEPT_OR_REJECT, value: -1 });
    dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: true });
    dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
    dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.DESIRED_WAYPOINT });
  };

  const goToDecisionConfidence = () => {
    dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: false });
    dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
    dispatch({ type: Action.SET_DECISION_CONFIDENCE, value: -1 });
    dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.DECISION_CONFIDENCE });
  };

  const onPrevious = () => {
    if (userFeedbackState === UserFeedbackState.TUTORIAL1) {
      returnToScenarioIntroduction();
      history.push('/');
      return;
    }
    if (userFeedbackState === UserFeedbackState.DESIRED_WAYPOINT && countUserChosenSamples(samples) > 0) {
      return;
    }
    const previousState = {
      [UserFeedbackState.TUTORIAL2]: UserFeedbackState.TUTORIAL1,
      [UserFeedbackState.TUTORIAL3]: UserFeedbackState.TUTORIAL2,
      [UserFeedbackState.TUTORIAL4]: explanationEnabled === true
        ? UserFeedbackState.TUTORIAL3
        : UserFeedbackState.TUTORIAL2,
      [UserFeedbackState.RANK_OBJECTIVES]: UserFeedbackState.TUTORIAL4,
      [UserFeedbackState.RES_METHOD]: UserFeedbackState.RANK_OBJECTIVES,
      [UserFeedbackState.DESIRED_WAYPOINT]: UserFeedbackState.RES_METHOD,
    }[userFeedbackState];
    if (previousState == null) {
      return;
    }
    if (previousState === UserFeedbackState.RES_METHOD) {
      dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
    }
    dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: previousState });
  };

  const inTutorial =
    userFeedbackState === UserFeedbackState.TUTORIAL1 ||
    userFeedbackState === UserFeedbackState.TUTORIAL2 ||
    userFeedbackState === UserFeedbackState.TUTORIAL3 ||
    userFeedbackState === UserFeedbackState.TUTORIAL4;

  const onSubmit = async () => {
    dispatch({ type: Action.SET_NUM_SUBMIT_CLICKS, value: numSubmitClicks + 1 });
    switch (userFeedbackState) {
      case UserFeedbackState.TUTORIAL1: {
        dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.TUTORIAL2 });
        return;
      }
      case UserFeedbackState.TUTORIAL2: {
        dispatch({
          type: Action.SET_USER_FEEDBACK_STATE,
          value: explanationEnabled === true ? UserFeedbackState.TUTORIAL3 : UserFeedbackState.TUTORIAL4,
        });
        return;
      }
      case UserFeedbackState.TUTORIAL3: {
        dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.TUTORIAL4 });
        return;
      }
      case UserFeedbackState.TUTORIAL4: {
        dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.RANK_OBJECTIVES });
        return;
      }
      case UserFeedbackState.OBJECTIVE: {
        dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.RANK_OBJECTIVES });
        return;
      }
      case UserFeedbackState.RANK_OBJECTIVES: {
        let objectivesTemp = rankObjectives();
        dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });
        dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.RES_METHOD});
        return;
      }
      case UserFeedbackState.RES_METHOD: {
        startDesiredWaypointRound();
        return;
      }
      case UserFeedbackState.DESIRED_WAYPOINT: {
        dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: false });
        dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: true });
        try {
          let robotResults = await calculateRobotSuggestions(samples, globalState, objectives);
          const { results, spatialReward, variableReward, discrepancyReward } = robotResults;
          dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: results });
          dispatch({ type: Action.SET_SUGGESTION_OVERLAP_NOTE, value: robotResults.overlapNote || "" });
          dispatch({ type: Action.SET_SPATIAL_REWARD, value: spatialReward });
          dispatch({ type: Action.SET_VARIABLE_REWARD, value: variableReward });
          dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: discrepancyReward });
          dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: true });
          dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: {updateRequired: true}});
          dispatch({ type: Action.SET_USER_SAMPLE, value: null });
          dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
          dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: true });
          dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.USER_LOCATION_SELECTION });
        } catch (err) {
          console.log(err);
          dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: true });
          dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: !desiredWaypoint });
        } finally {
          dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: false });
        }
        return;
      }
      case UserFeedbackState.USER_LOCATION_SELECTION: {
        if (!userSample) {
          return;
        }
        dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: false });
        const matched = robotSuggestions.find(s => s.index === userSample.index);
        dispatch({ type: Action.SET_HIT_SUGGESTION, value: !!matched });
        dispatch({ type: Action.SET_MATCHED_SUGGESTION_LABEL, value: matched ? (matched.methodLabel || null) : null });
        dispatch({ type: Action.SET_SAMPLE_TYPE, value: matched ? 'robot' : 'user' });
        if (matched) {
          goToDecisionConfidence();
        } else {
          dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
          dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.REJECT_REASON });
        }
        return;
      }
      case UserFeedbackState.REJECT_REASON: {
        if (rejectReasonsOptions.includes(rejectReasonOptions[rejectReasonOptions.length - 1])) {
          dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.REJECT_REASON_FREE_RESPONSE });
        } else {
          goToDecisionConfidence();
        }
        return;
      }
      case UserFeedbackState.REJECT_REASON_FREE_RESPONSE: {
        goToDecisionConfidence();
        return;
      }
      case UserFeedbackState.DECISION_CONFIDENCE: {
        dispatch({ type: Action.SET_NUM_IMG_CLICKS, value: 0 });
        updateUserSteps();
        dispatch({ type: Action.SET_USER_STEP_IDX, value: step + 1});
        dispatch({ type: Action.SET_OBJECTIVES_FREE_RESPONSE, value: ""});
        dispatch({ type: Action.SET_ACCEPT_OR_REJECT, value: -1 });
        dispatch({ type: Action.SET_REJECT_REASON, value: -1 });
        dispatch({ type: Action.SET_REJECT_REASONS, value: [] });
        dispatch({ type: Action.SET_REJECT_REASONS_OPTIONS, value: [] });
        dispatch({ type: Action.SET_REJECT_REASON_FREE_RESPONSE, value: ""});
        dispatch({ type: Action.SET_USER_SAMPLE, value: null });
        dispatch({ type: Action.SET_DECISION_CONFIDENCE, value: -1 });
        if (countUserChosenSamples(samples) >= MAX_USER_SAMPLES) {
          goToConclusion();
          return;
        }
        startDesiredWaypointRound();
        return;
      }
    }
  }


  const clickableImageTip = "Please select a location on the transect to sample from between the crest and interdune";
  const clickableImageTipStyle = {
      fontSize: '12px'
  }
  const userChosenSampleCount = countUserChosenSamples(samples);
  const showPrevious = inTutorial
    ? true
    : (
      userFeedbackState === UserFeedbackState.RANK_OBJECTIVES ||
      userFeedbackState === UserFeedbackState.RES_METHOD ||
      (userFeedbackState === UserFeedbackState.DESIRED_WAYPOINT && userChosenSampleCount === 0)
    );
  const clickIsForMap = userFeedbackState === UserFeedbackState.USER_LOCATION_SELECTION || userFeedbackState === UserFeedbackState.DESIRED_WAYPOINT;
  const showExplanationChart = explanationEnabled === true;

  useEffect(() => {
    if (!showExplanationChart && focusedChart === 'transect') {
      setFocusedChart(null);
    }
    if (showExplanationChart && focusedChart === 'dune') {
      setFocusedChart('transect');
    }
  }, [showExplanationChart, focusedChart]);

  const toggleChartFocus = (id: 'scatter' | 'dune' | 'transect') => {
    setFocusedChart(prev => prev === id ? null : id);
  };

  const chartExpandButton = (id: 'scatter' | 'dune' | 'transect') => (
    <button
      type="button"
      className={`chartExpandBtn ${focusedChart === id ? 'isOpen' : ''}`}
      title={focusedChart === id ? 'Restore chart size' : 'Enlarge chart'}
      aria-label={focusedChart === id ? 'Restore chart size' : 'Enlarge chart'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleChartFocus(id);
      }}
    >
      {focusedChart === id ? (
        <span aria-hidden="true">×</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      )}
    </button>
  );

  const userFeedbackPanel = !loadingRobotSuggestions ? (
      <div className={numSubmitClicks === 0 ? "user-feedback-flashing" : "user-feedback"}>
        <div key={userFeedbackState}>
        {userFeedbackStateMap[userFeedbackState]}
        </div>
        <div className="submit-user-feedback-button">
          {showPrevious && (
            <Button variant="contained" color="primary" onClick={onPrevious}>Previous</Button>
          )}
          <Button disabled={!inTutorial && disableSubmitButton} variant="contained" color="primary" onClick={onSubmit}>
            Next
          </Button>
        </div>
        <br></br>
        { userChosenSampleCount >= 1 && (
        <div className="quit">
          <Button className="quitButton" variant="contained" color="primary" onClick={onConcludeClick}>
            End Collection At Transect
          </Button>
        </div>
      )}
      </div>
  ) : (
      <div className="loading-screen">
        <div className="loading-section">
          <i>
            RHex is determining where to sample from next. This may take 15-30 seconds...
          </i>
        </div>
        <div className="loading-section">
          <CircularProgress 
            color="secondary"
            size={100}
          />
        </div>
      </div>
  );

  // Popup for displaying instructions on the decision page
  const [decisionHelpOpen, setDecisionHelpOpen] = useState(true);
  const decisionHelpDialog =
    <MultiStepDialog
      open={decisionHelpOpen}
      setOpen={setDecisionHelpOpen}
      title={""}
      allowCancel={false}
      steps={[
        [
          "Before starting data collection, familiarize yourself with the features of the interface.",
        // "Top-right displays the dune cross-section with previously sampled locations with explanations underneath. The top-left displays corresponding data",
        // "You will be asked a few questions to determine where RHex should sample next.",
        // "If at any point you feel you have collected enough data to make a judgment about the hypothesis, select \"End Collection at Transect.\""
        ]
      ]}
    />;

  function Helper() {
    const onClick = () => {
      setDecisionHelpOpen(true);
    };
  
    return (
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 40,
        display: 'none'
      }}>
        <HelpIcon
          id="helper"
          onClick={onClick}
          color="primary"
          fontSize="large"
        />
      </div>
    );
  }

  return (
    <div id="app" className="decisionPage layout-new">
      { helperOpen && <Helper /> }
      { decisionHypothesisDialog }
      { decisionHelpDialog }

      <div className="decisionTopBar">
        <div className="decisionTopBarCount">
          Samples collected: {userChosenSampleCount} of {MAX_USER_SAMPLES}
        </div>
        { userChosenSampleCount >= 1 && (
          <Button className="quitButton" variant="contained" color="primary" onClick={onConcludeClick}>
            End Collection At Transect
          </Button>
        )}
      </div>

      {userFeedbackState === UserFeedbackState.TUTORIAL1 && (
  <div className="tutorial-arrow" style={{ transform: 'rotate(225deg)' }} />  
)}
 {userFeedbackState === UserFeedbackState.TUTORIAL3 && (
          <div className="tutorial-arrow2"/>
        )}

      <ConfirmDialog
        open={confirmConcludeOpen}
        title={""}
        text={"Are you sure you are ready to quit data collection at this transect? Press GO BACK to collect more data. Press CONTINUE to move on to a few final survey questions."}
        okText="CONTINUE"
        cancelText="GO BACK"
        allowCancel={true}
        onClose={() => setConfirmConcludeOpen(false)}
        onCancel={() => setConfirmConcludeOpen(false)}
        onOk={onQuit}
      />

      <div className={`decisionMain chartFocus-${focusedChart || 'none'}${showExplanationChart ? '' : ' no-reward'}`}>
        <React.Fragment>
          <div className={`chartCard chartCard-scatter${userFeedbackState === UserFeedbackState.TUTORIAL1 ? ' tutorial-oval' : ''}`}>
            {chartExpandButton('scatter')}
            <ChartPanel fullSize={true} mode={"TransectView"}/>
          </div>
          {showExplanationChart ? (
            <div className="chartStack-transect">
              {chartExpandButton('transect')}
              <div className={`chartCard chartCard-dune${userFeedbackState === UserFeedbackState.TUTORIAL2 ? ' tutorial-oval' : ''}`}>
                <ImgAlert open={!!showImgAlert} />
                <Tooltip title={!clickIsForMap ? "" : <span style={clickableImageTipStyle}>{clickableImageTip}</span>} placement="bottom">
                  <div className={`clickableImageContainer ${userFeedbackState === UserFeedbackState.TUTORIAL2 ? 'flashing-red-border' : ''}`}>
                    <ClickableImage
                      width={750}
                      enabled={imgClickEnabled}
                      addDataFunc={() => addDataToPlot()}
                      setPopOver={setImgAlert}
                      clickMode={userFeedbackState === UserFeedbackState.DESIRED_WAYPOINT ? 'intent' : 'sample'}
                      fitContainer={true}
                    />
                  </div>
                </Tooltip>
              </div>
              <div className={`chartCard chartCard-reward${userFeedbackState === UserFeedbackState.TUTORIAL3 ? ' tutorial-oval' : ''}`}>
                <ExplanationPanel/>
              </div>
              <TransectAlignGuides />
            </div>
          ) : (
            <div className={`chartCard chartCard-dune${userFeedbackState === UserFeedbackState.TUTORIAL2 ? ' tutorial-oval' : ''}`}>
              {chartExpandButton('dune')}
              <ImgAlert open={!!showImgAlert} />
              <Tooltip title={!clickIsForMap ? "" : <span style={clickableImageTipStyle}>{clickableImageTip}</span>} placement="bottom">
                <div className={`clickableImageContainer ${userFeedbackState === UserFeedbackState.TUTORIAL2 ? 'flashing-red-border' : ''}`}>
                  <ClickableImage
                    width={750}
                    enabled={imgClickEnabled}
                    addDataFunc={() => addDataToPlot()}
                    setPopOver={setImgAlert}
                    clickMode={userFeedbackState === UserFeedbackState.DESIRED_WAYPOINT ? 'intent' : 'sample'}
                    fitContainer={true}
                  />
                </div>
              </Tooltip>
            </div>
          )}
        </React.Fragment>
      </div>
      { userFeedbackPanel }
    </div>
  );
}

// import * as React from 'react';
// import { useState, useEffect } from 'react';
// import { useHistory } from 'react-router-dom';
// import Button from '@material-ui/core/Button'
// import Grid from '@material-ui/core/Grid';

// import HelpIcon from '@material-ui/icons/Help';
// import { FormControl, Select, MenuItem, CircularProgress, Box, Slider } from '@material-ui/core';
// import Popbox from '../components/Popbox';
// import ClickableImage from '../components/ClickableImage';
// import { ConfirmDialog, MultiStepDialog } from '../components/Dialogs';
// import { getMeasurements, calculateRobotSuggestions } from '../util';
// import {
//   PopboxTypeEnum, confidenceTexts, NUM_OF_HYPOS,
//   UserFeedbackState, objectiveOptions, transitionOptions,
// } from '../constants';
// import { useStateValue, Action } from '../state';
// import ChartPanel from '../components/ChartPanel';
// import "../styles/decision.scss";
// import { CurrUserStepData, UserStepsData, Sample, PreSample } from '../types';
// import { initializeCharts } from '../handlers/ChartHandler';
// import RadioButtonGroup from '../components/RadioButtonGroup';
// import RadioButtonGroupMultipleOptions from '../components/RadioButtonGroupMultipleOptions';
// import RadioButtonGroupMultipleSelectionOptions from '../components/RadioButtonGroupMultipleSelectionOptions';
// import { sampleRobotSuggestion } from '../sampleTemplates';
// import Tooltip from '@material-ui/core/Tooltip';
// import { isNumber } from 'lodash';

// function ImgAlert({ open }) {
//   return (
//     <Popbox
//       open={open}
//       type={PopboxTypeEnum.ERROR}
//       anchorEl={() => document.getElementById("pos-picker")}
//     >
//       Please click near the surface of stoss slope!   
//     </Popbox>
//   );
// }

// export const rejectReasonOptionsGlobal:string[] = [];

// export default function Main() {
//   const [showImgAlert, setImgAlert] = useState(false);
//   const [globalState, dispatch] = useStateValue();

//   const { currSampleIdx, samples, currUserStep, userSteps, chart, chartSettings, 
//     loadingRobotSuggestions, showRobotSuggestions, disableSubmitButton, numSubmitClicks, 
//     imgClickEnabled, numImgClicks, transectIdx } = globalState;

//   const { step, userFeedbackState, objectives, objectiveFreeResponse, sampleType,
//     robotSuggestions, spatialReward, variableReward, discrepancyReward, acceptOrRejectOptions, acceptOrReject, 
//     rejectReasonOptions, rejectReason, rejectReasons, rejectReasonsOptions, rejectReasonFreeResponse, userFreeSelection, userSample, 
//     hypoConfidence, transition } = currUserStep;

//   const history = useHistory();

//   // Initial page set up
//   useEffect(() => {
//     console.log({globalState}); // for debugging
//     dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: false });
//     // Make sure charts are ready for decision page
//     initializeCharts(globalState, dispatch);
//     // Make the charts update on first render
//     dispatch({ type: Action.SET_CHART_SETTINGS, value: {...chartSettings, updateRequired: true} });
//   }, []);

//   // Function to add next sample to the data plot
//   const addDataToPlot = () => {
//     dispatch({ type: Action.SET_CURR_SAMPLE_IDX, value: currSampleIdx + 1 });
//     dispatch({ type: Action.SET_CHART_SETTINGS, value: {...chartSettings, updateRequired: true} });
//   }

//   // Automatically populate the charts with any remaining measurements from the transectSamples in the strategy (if the image hasn't been clicked)
//   if (currSampleIdx < samples.length && numImgClicks === 0) {
//     addDataToPlot();
//   }

//   // Function to add the latest user step data to the finalized set of userSteps 
//   const updateUserSteps = () => {
//     let acceptedRobotSuggestion;
//     if (acceptOrReject !== -1 && acceptOrReject !== acceptOrRejectOptions.length - 1) {
//       let robotSuggestionFinal = robotSuggestions[acceptOrReject]; 
//       const { shearValues, moistureValues } = getMeasurements(globalState, transectIdx, robotSuggestionFinal.index, robotSuggestionFinal.measurements);
//       acceptedRobotSuggestion = {...robotSuggestionFinal, shear: shearValues, moisture: moistureValues};
//     }
//     let transitionAdj = (!userFreeSelection) ? transition : transition + 1;
//     let newUserStep : UserStepsData = {
//       step: step,
//       objectives: JSON.parse(JSON.stringify(objectives)),
//       objectiveFreeResponse: objectiveFreeResponse,
//       sampleType: sampleType,
//       robotSuggestions: robotSuggestions,
//       acceptOrReject: acceptOrReject === -1 ? null : acceptOrRejectOptions[acceptOrReject],
//       acceptedRobotSuggestion: (acceptOrReject !== -1 && acceptOrReject !== acceptOrRejectOptions.length - 1) ? acceptedRobotSuggestion : null,
//       rejectReason: rejectReason === -1 ? null : rejectReasonOptions[rejectReason],
//       rejectReasons: rejectReasons,//Add new change
//       rejectReasonsOptions: rejectReasonsOptions, //Add new change
//       rejectReasonFreeResponse: rejectReasonFreeResponse,
//       userFreeSample: userSample,
//       hypoConfidence: confidenceTexts[hypoConfidence + 3],
//       samples: JSON.parse(JSON.stringify(samples)),
//       transition: transitionOptions[transitionAdj],
//       spatialReward: spatialReward,
//       variableReward: variableReward,
//       discrepancyReward: discrepancyReward,
//     }
//     dispatch({ type: Action.ADD_USER_STEP, value: newUserStep }); 
//   }

//   const [confirmConcludeOpen, setConfirmConcludeOpen] = useState(false);
//   const [helperOpen, setHelperOpen] = useState(true);

//   const onConcludeClick = () => {
//       setConfirmConcludeOpen(true);
//   };

//   const onQuit = () => {
//     updateUserSteps(); // Update userSteps 
//     if (chart) {
//       Object.values(chart).forEach(c => {
//         if (!c) return;
//         c.data.datasets.forEach(dataset => { dataset.data = []; });
//         c.update();
//         c.clear();
//       });
//     }
//     history.push('/conclusion');
//     console.log({globalState});
//   };
//   const handleHypoResponse = (value: any) => {
//     dispatch({ type: Action.SET_HYPO_CONFIDENCE, value: value });
//   }

//   // Disable submit button if the user has selected no objectives during the OBJECTIVE step
//   useEffect(() => {
//     if (userFeedbackState === UserFeedbackState.OBJECTIVE) {
//       dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: objectives.length === 0 });
//     }
//   }, [objectives]);

//   // In the RANK_OBJECTIVES step, automatically disable the submit button until the user fills out a valid set of rankings for each selected objective
//   // Example of set two group of user input buttons 6/12/2022
//   //TODO: need this to be in intro new objective screen instead
//   useEffect(() => {
//     if (userFeedbackState === UserFeedbackState.RANK_OBJECTIVES) {

//       let objectivesRankings : number[] = [];
//       let disable = false;
//       for (let i = 0; i < objectives.length; i++) {
//         if (objectives[i].ranking === -1 || objectivesRankings.includes(objectives[i].ranking)) {
//           disable = true;
//           break;
//         } else {
//           objectivesRankings.push(objectives[i].ranking);
//         }
//       }
//       dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: disable });
//     }

//     if (userFeedbackState === UserFeedbackState.REJECT_REASON) {
//       dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: rejectReasons.length == 0 });
//     }

//   }, [objectives]);


//   const searchObjective = (target : string) => {
//     for (let obj = 0; obj < objectives.length; obj++) {
//       if (objectives[obj].objective === target) {
//         return true;
//       }
//     }
//     return false;
//   }

//   let objectiveOptionsLinked = objectiveOptions.map((obj, i) => {
//     // Add option 0 and 1 by Zeyu 6/7/2022
//     if (i === 0) {
//       return (
//       <span>There are areas along the dune transect (between crest and interdune) where data is needed (spatial reward)</span>
//       ); }
//     // } else if (i === 1) {
//     //   return (
//     //   <span>There are portions of the dynamic range of the moisture variable (x axis of the data plot) where data is needed</span>
//     //   );
//     // }
//      else if (i === 1) {
//       return (
//         <span>There is either a discrepancy or a correlation between the data and the <span style={{color: 'blue', textDecorationLine: 'underline', cursor: 'pointer'}}><strong><a onClick={() => setHypothesisOpen(true)}>hypothesis</a></strong></span> that needs additional evaluation (discrepancy reward) </span>
//       );
//     } else if (i === 2) {
//       return (
//         <span>{obj}</span>
//         // <span>
//         //   The data seems to be supporting the <span style={{color: 'blue', textDecorationLine: 'underline', cursor: 'pointer'}}><strong><a onClick={() => setHypothesisOpen(true)}>hypothesis</a></strong></span> so far but additional evaluation is needed
//         // </span>
//       );
//     } else {
//       return <span>{obj}</span>;
//     }
//   });


//   //TODO: remove objective questions bc we are assuming they will always hold both objectives, but may change their rankings
//   const objectiveQuestions = 
//     <div className="objective-questions">
//       <p><strong>Based on the data collected so far, select which of the following beliefs you currently hold (you may select multiple).</strong></p>
//       <RadioButtonGroupMultipleOptions options={objectiveOptionsLinked} searchObjective={(target) => searchObjective(target)} onChange={i => {
//         let objectivesTemp = [...objectives]; // objectives: [0, 1, 2]
//         if (searchObjective(objectiveOptions[i])) {
//           objectivesTemp = objectivesTemp.filter(obj => obj.objective !== objectiveOptions[i]);
//         } else {
//           let newObjective = {
//             objective: objectiveOptions[i],
//             ranking: -1,
//             addressedRating: 1
//           };
//           objectivesTemp.push(newObjective);
//         }
//         dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });

//         // Clear the user's previous rejectReasons because the user want to update their beliefs
//         let resetRejectReasons:number[] = [...rejectReasons];
//         resetRejectReasons.splice(0, resetRejectReasons.length);

//         let resetRejectReasonsOptions:string[] = [...rejectReasonsOptions];
//         resetRejectReasonsOptions.splice(0, resetRejectReasonsOptions.length);

//         dispatch({ type: Action.SET_REJECT_REASONS, value: resetRejectReasons });
//         dispatch({ type: Action.SET_REJECT_REASONS_OPTIONS, value: resetRejectReasonsOptions });
//       }}/>
//     </div>

//   const objectivesToRank = 
//     <table className="dropDownMenuGroup" style={{marginBottom: '2vh'}}>
//       <tbody>
//           {
//             objectives.map((obj, i) => (
//                 <tr key={obj.objective}>
//                   <td>
//                     <FormControl>
//                       <Select
//                         id="objectives-select"
//                         value={obj.ranking}
//                         onChange={(e) => {
//                           let objectivesTemp = [...objectives];
//                           if (typeof e.target.value === 'number') objectivesTemp[i].ranking = e.target.value;
//                           dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });
//                         }}
//                       >
//                         {Array.from({length: objectives.length}, (_, i) => i + 1).map((rank) => (
//                           <MenuItem key={obj.objective + rank} value={rank}>{rank}</MenuItem>
//                         ))}
//                       </Select>
//                     </FormControl>
//                   </td>
//                   <td>
//                       { obj.objective }
//                   </td>
//                 </tr>
//             ))
//           }
//       </tbody>
//     </table>

//   const objectiveRankings =
//     <div className="objective-rankings">
//       <p><strong>Now choose the order in which you agree with each of the selected beliefs, with 1 being the strongest agreement. You must assign a unique number to each belief:</strong></p>
//       {objectivesToRank}
//     </div>

//   const onObjectiveTextChange = e => {
//     dispatch({ type: Action.SET_OBJECTIVES_FREE_RESPONSE, value: e.target.value });
//   }
//   const objectiveFreeResponseQuestion = 
//     <div className="objective-free-response-question" style={{marginBottom: '2vh'}}>
//       <p><strong>Please describe your belief about the data collected so far:</strong></p>
//       <textarea onChange={onObjectiveTextChange} rows={5} cols={85}/>
//     </div>

//   useEffect(() => {
//     let acceptOrRejectTemp : string[] = robotSuggestions.map((suggestion, index) => "Accept suggested location " + String.fromCharCode(index + 65));
//     acceptOrRejectTemp.push("Reject suggestions");
//     dispatch({ type: Action.SET_ACCEPT_OR_REJECT_OPTIONS, value: acceptOrRejectTemp });
//   }, [robotSuggestions]);
  
//   const acceptOrRejectQuestions = 
//     <div className="accept-or-reject-questions">
//       <p><strong>Based on your belief rankings, RHex suggests sampling from one of the lettered locations marked on the dune cross-section above.</strong></p>
//       <RadioButtonGroup options={acceptOrRejectOptions} selectedIndex={acceptOrReject} onChange={i => {
//         dispatch({ type: Action.SET_ACCEPT_OR_REJECT, value: i });
//         dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
//       }}/>
//     </div>

//   // Handler for setting the user's rating for how well the latest sample addressed the current objective
//   const handleSliderChange = (event, newValue, index) => {
//     if (typeof newValue === 'number') {
//       let objectivesTemp = [...objectives];
//       objectivesTemp[index].addressedRating = newValue / 20 + 1;
//       dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });
//     }
//   }

//   const marks = [
//     { value: 0, label: '1-Unsure' },
//     { value: 20, label: ['2-Did Not', <br/>, 'Influence'] },
//     { value: 40, label: ['3-Barely', <br/>, 'Influenced'] },
//     { value: 60, label: ['4-Somewhat', <br/>, 'Influenced'] },
//     { value: 80, label: '5-Influenced' },
//     { value: 100, label: ['6-Definitely', <br/>, 'Influenced'] },
//   ];

//   function valueLabelFormat(value) {
//     return marks.findIndex((mark) => mark.value === value) + 1;
//   }

//   const acceptFollowUpQuestions = 
//     <div className="accept-follow-up-questions">
//       <p><strong>How much did the visual explanation provided positively influence your decision to accept the robot's suggestions?</strong></p>
//       { objectives.map((obj, index) => (
//         <div key={obj.objective.slice(0, 10) + index}>
//           <p><i><strong>Please provide your rating for the visual explanation #{index + 1}:</strong> {obj.objective}</i></p>
//           <div className="slider-box">
//             <Box>
//               <Slider
//                 aria-label="Restricted values"
//                 value={(obj.addressedRating - 1) * 20}
//                 valueLabelFormat={valueLabelFormat}
//                 valueLabelDisplay="auto"
//                 step={20}
//                 marks={marks}
//                 onChange={(event, value) => handleSliderChange(event, value, index)}
//               />
//             </Box>
//           </div>
//         </div>
//       ))}
//     </div>  

// // Apply new changes by Zeyu 6/21/2022
//   useEffect(() => {
//     const prefix:string = "The suggested location did not address my selected belief #";

//     const rejectReasonOptionsTemp = objectives.map((obj, i) => prefix + (i+1) + ": " + obj.objective);

//     const lastOption = "I rejected the suggested location for a different reason.";
//     rejectReasonOptionsTemp.push(lastOption);

//     dispatch({ type: Action.SET_REJECT_REASON_OPTIONS, value: rejectReasonOptionsTemp });

//   }, [objectives]);

//   // Apply new changes by Zeyu 6/19/2022
//   const rejectReasonQuestions = 
//     <div className="reject-reason-questions">
//       <p><strong>Why did you reject RHex's suggested locations?</strong></p>
//       <RadioButtonGroupMultipleSelectionOptions options={rejectReasonOptions}
//       selectedIndexs = {rejectReasons}
//       onChange={i => {
//         let selectIndexTemp:number[] = [...rejectReasons];
        
//         if (!selectIndexTemp.includes(i)) selectIndexTemp.push(i);
        
//         let rejectReasonsOptionsTemp:string[] = [...rejectReasonsOptions];

//         if (!rejectReasonsOptionsTemp.includes(rejectReasonOptions[i])) rejectReasonsOptionsTemp.push(rejectReasonOptions[i]);
    
//         dispatch({ type: Action.SET_REJECT_REASONS_OPTIONS, value: rejectReasonsOptionsTemp })
//         dispatch({ type: Action.SET_REJECT_REASONS, value: selectIndexTemp })
//         dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false });
//       }
//     }/>
//     </div>
  
//   const onRejectReasonTextChange = e => {
//     dispatch({ type: Action.SET_REJECT_REASON_FREE_RESPONSE, value: e.target.value });
//   }

//   const rejectReasonFreeResponseQuestion = 
//     <div className="reject-reason-free-response-question" style={{marginBottom: '2vh'}}>
//       <p><strong>Please state your reason for rejecting the suggestion:</strong></p>
//       <textarea onChange={onRejectReasonTextChange} rows={5} cols={85}/>
//     </div>

//   const userLocationSelectionQuestion = 
//     <div className="user-location_selection-question">
//       <p><strong>Please select the next location you'd like to sample from by clicking anywhere along the transect surface in the dune cross-section above. When you have finalized your selection and are ready to collect data from that location, click "Submit."</strong></p>
//     </div>

//   // Hook for displaying hypothesis popup
//   // Apply new changes 6/7/2022 by Zeyu
//   const singleTransectNullHypothesis = require('../../assets/SingleTransectNullHypothesis.png');
//   const [hypothesisOpen, setHypothesisOpen] = useState(false);
//   const decisionHypothesisDialog =
//     <MultiStepDialog
//       open={hypothesisOpen}
//       setOpen={setHypothesisOpen}
//       title={""}
//       allowCancel={false}
//       steps={[
//         [
//           "Sand moisture should be highest (most wet) in the interdune and lowest (most dry) at the dune crest (see blue line). Spirit is testing the hypothesis that strength will increase as moisture increases until sand is saturated (somewhere along the stoss slope), at which point strength will be constant as moisture continues to increase (see blue line)."
//         ]
//       ]}
//       img={singleTransectNullHypothesis}
//     />;
//   // const [updateButton, setUpdateButton] = useState(true);
//   // function handleUpdateButton(e) {
//   //   setUpdateButton(false);
//   // }
//   const updateHypothesisConfidence = 
//   <div className="update-hypothesis-confidence">
//     <div className="hypothesisBlock">
//         <div className="hypothesisTitle"><strong>Updated Hypothesis Confidence</strong></div>
//         <div className="hypothesisText">
//           <div>
//             If your confidence in the hypothesis has changed, please provide a new ranking of your certainty that the <span style={{color: 'blue', textDecorationLine: 'underline', cursor: 'pointer'}}><strong><a onClick={() => setHypothesisOpen(true)}>hypothesis</a></strong></span> will be supported or refuted.
//           </div>
//         </div>
//         <FormControl style={{border: '2.5px solid red', animation: 'blinker 2s linear infinite'}}>
//             <Select
//                 style={{fontSize: '1.5vh'}}
//                 value={hypoConfidence + 3}
//                 onChange={event => {
//                   handleHypoResponse(Number(event.target.value) - 3);
//                   dispatch({type: Action.SET_DISABLE_SUBMIT_BUTTON, value: false});
//                   }}>
//                 {
//                     confidenceTexts.map((text, i) => (<MenuItem key={i} value={i}>{text}</MenuItem>))
//                 }
//             </Select>
//         </FormControl>

        
//     </div>
//   </div>

//   const transitionQuestions = 
//     <div className="reject-reason-questions">
//       <p><strong>What would you like to do next?</strong></p>
//       <RadioButtonGroup 
//         options={transitionOptions.slice((!userFreeSelection) ? 0 : 1)} 
//         selectedIndex={transition} 
//         onChange={i => {
//           dispatch({ type: Action.SET_TRANSITION, value: i });
//           }}/>
//     </div>

//   // Match the order of UserFeedbackStates in 'constants.ts'
//   const userFeedbackStateMap = [
//     objectiveQuestions,
//     objectiveRankings,
//     objectiveFreeResponseQuestion,
//     acceptOrRejectQuestions,
//     acceptFollowUpQuestions,
//     rejectReasonQuestions,
//     rejectReasonFreeResponseQuestion,
//     userLocationSelectionQuestion,
//     updateHypothesisConfidence,
//     transitionQuestions,
//   ]

//   // useEffect(() => {
//   //   console.log({robotSuggestions});
//   // }, [robotSuggestions]);

//   const rankObjectives = () => {
//     let objectivesTemp = [...objectives];
//     objectivesTemp.sort((a, b) => (a.ranking > b.ranking) ? 1 : -1);
//     return objectivesTemp;
//   }

//   const onSubmit = async () => {
//     dispatch({ type: Action.SET_NUM_SUBMIT_CLICKS, value: numSubmitClicks + 1 });
//     switch (userFeedbackState) {
//       case UserFeedbackState.OBJECTIVE: {
//         if (objectives.length === 1) {

//           // Set the rank of the single objective to 1
//           let objectivesTemp = [...objectives];
//           objectivesTemp[0].ranking = 1;
//           dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });

//           if (objectives[0].objective === objectiveOptions[2]) {
//             dispatch({ type: Action.SET_OBJECTIVES_FREE_RESPONSE, value: "" });
//             dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.OBJECTIVE_FREE_RESPONSE });
//           } else {
            
//             dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: true });

//             let robotResults = await calculateRobotSuggestions(samples, globalState, objectives);
//             const { results, spatialReward, variableReward, discrepancyReward } = robotResults;
//             dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: results });
//             dispatch({ type: Action.SET_SPATIAL_REWARD, value: spatialReward });
//             dispatch({ type: Action.SET_VARIABLE_REWARD, value: variableReward });
//             dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: discrepancyReward });

//             dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: true });
//             dispatch({ type: Action.SET_ACCEPT_OR_REJECT, value: 0 });
//             dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.ACCEPT_OR_REJECT_SUGGESTION });
//             dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: false });
//           }
//         } else {
//           dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.RANK_OBJECTIVES });
//         } 
//         console.log({globalState}); // for debugging
//         return;
//       }
//       case UserFeedbackState.RANK_OBJECTIVES: {
//         // Order the objectives by ranking
//         let objectivesTemp = rankObjectives();
//         dispatch({ type: Action.SET_OBJECTIVES, value: objectivesTemp });
//         // Check if objectives contains free response option and if this option is ranked the highest
//         let freeResponseRankedHighest = false; 
//         for (let i = 0; i < objectives.length; i++) {
//           if (objectives[i].objective === objectiveOptions[4] && objectives[i].ranking === 1) {
//             freeResponseRankedHighest = true;
//           }
//         }
//         if (freeResponseRankedHighest) {
//           dispatch({ type: Action.SET_OBJECTIVES_FREE_RESPONSE, value: "" });
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.OBJECTIVE_FREE_RESPONSE });
//         } else {
//           dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: true });

//           let robotResults = await calculateRobotSuggestions(samples, globalState, objectivesTemp);
//           const { results, spatialReward, variableReward, discrepancyReward } = robotResults;
//           dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: results });
//           dispatch({ type: Action.SET_SPATIAL_REWARD, value: spatialReward });
//           dispatch({ type: Action.SET_VARIABLE_REWARD, value: variableReward });
//           dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: discrepancyReward });

//           dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: true });
//           dispatch({ type: Action.SET_ACCEPT_OR_REJECT, value: 0 });
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.ACCEPT_OR_REJECT_SUGGESTION });
//           dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: false });
//         }
//         console.log({globalState}); // for debugging
//         return;
//       }
//       case UserFeedbackState.OBJECTIVE_FREE_RESPONSE: {
//         dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
//         dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: true });
//         dispatch({ type: Action.SET_USER_FREE_SELECTION, value: true });
//         dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.USER_LOCATION_SELECTION });
//         dispatch({ type: Action.SET_NUM_IMG_CLICKS, value: 0 });
//         console.log({globalState}); // for debugging
//         return;
//       }

//       case UserFeedbackState.ACCEPT_OR_REJECT_SUGGESTION: {
//         if (acceptOrReject !== acceptOrRejectOptions.length - 1) {
//           let robotSample = robotSuggestions[acceptOrReject]; 
//           const { shearValues, moistureValues } = getMeasurements(globalState, transectIdx, robotSample.index, robotSample.measurements);
//           let newSample : Sample = {...robotSample, shear: shearValues, moisture: moistureValues};
//           dispatch({ type: Action.ADD_SAMPLE, value: newSample }); // add the new sample to the StateContext
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.ACCEPT_FOLLOW_UP });
//           dispatch({ type: Action.SET_SAMPLE_TYPE, value: 'robot'});
//         } else {
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.REJECT_REASON });
//         }
//         dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: false });
//         console.log({globalState}); // for debugging
//         return;
//       }
//       case UserFeedbackState.ACCEPT_FOLLOW_UP: {
//         dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.HYPOTHESIS_CONFIDENCE });
//         dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true }); // Disable update hypothesis confidence button unless the user made a selection. by Zeyu 7/7/2022
//         return;
//       }
//       // Select the reason why the use reject their belefs
//       case UserFeedbackState.REJECT_REASON: {
//         // [0,1,2] convert to -> str[0,1,2]
//         // Apply new chanegs by Zeyu 6/13/2022
//         // if the user select first option, then they will redirect to the following dispatch action, which will lead them to user free selection
//         if (rejectReasonsOptions.includes(rejectReasonOptions[rejectReasonOptions.length - 1])) { // Otherwise, the user will select 'I rejected the suggested location for a different reason.', there will be textbox for the user
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.REJECT_REASON_FREE_RESPONSE });
//         } else {
//           dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
//           dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: true });
//           dispatch({ type: Action.SET_USER_FREE_SELECTION, value: true });
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.USER_LOCATION_SELECTION });
//           dispatch({ type: Action.SET_NUM_IMG_CLICKS, value: 0 });
//         }
//         console.log({globalState}); // for debugging
//         return;
//       }
//       case UserFeedbackState.REJECT_REASON_FREE_RESPONSE: {
//         dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
//         dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: true });
//         dispatch({ type: Action.SET_USER_FREE_SELECTION, value: true });
//         dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.USER_LOCATION_SELECTION });
//         dispatch({ type: Action.SET_NUM_IMG_CLICKS, value: 0 });
//         console.log({globalState}); // for debugging
//         return;
//       }
//       case UserFeedbackState.USER_LOCATION_SELECTION: {
//         dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: false });
//         dispatch({ type: Action.SET_NUM_IMG_CLICKS, value: 0 }); // load the next Sample into the charts and strategy 
//         dispatch({ type: Action.SET_SAMPLE_TYPE, value: 'user'});
//         dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.HYPOTHESIS_CONFIDENCE });
//         dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true }); // Disable update hypothesis confidence button unless the user made a selection. by Zeyu 7/7/2022
//         console.log({globalState}); // for debugging
//         return;
//       }
//       case UserFeedbackState.HYPOTHESIS_CONFIDENCE: {
//         dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.TRANSITION });
//         dispatch({ type: Action.SET_TRANSITION, value: userFreeSelection ? 0 : 1 }); // Add this for transition adjustment by Zeyu 5/18/2022
//         console.log({globalState}); // for debugging
//         return;
//       }
//       case UserFeedbackState.TRANSITION: {
//         let transitionAdj = (!userFreeSelection) ? transition : transition + 1;
//         console.log({globalState, transitionAdj});
//         // **Transition Adjustment** is used to align the transition options from transition variabite in constant.ts between 
//         // userFreeSelection being true or false, and thus we can apply the same logic for the functions below - Zeyu & Steven 5/18/2022

//         // Move to the next round with the same objectives as the previous round and automatically run
//         // the robot calculation 

//         // Move to the next round with the same objectives as the previous round and automatically run
//         // the robot calculation 
//         if (transitionAdj === 0) {
//           dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: true });

//           let robotResults = await calculateRobotSuggestions(samples, globalState, objectives);
//           const { results, spatialReward, variableReward, discrepancyReward } = robotResults;
//           dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: results });
//           dispatch({ type: Action.SET_SPATIAL_REWARD, value: spatialReward });
//           dispatch({ type: Action.SET_VARIABLE_REWARD, value: variableReward });
//           dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: discrepancyReward });

//           dispatch({ type: Action.SET_SHOW_ROBOT_SUGGESTIONS, value: true });
//           dispatch({ type: Action.SET_USER_FREE_SELECTION, value: false });
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.ACCEPT_OR_REJECT_SUGGESTION });
//           dispatch({ type: Action.SET_LOADING_ROBOT_SUGGESTIONS, value: false });
//           dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
          
//         // Move to the next round with the objectives reset and ask the user to reselect the objectives
//         } else if (transitionAdj === 1) {
//           dispatch({ type: Action.SET_OBJECTIVES, value: [] });
//           dispatch({ type: Action.SET_USER_FREE_SELECTION, value: false });
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.OBJECTIVE });
//           dispatch({ type: Action.SET_SAMPLE_TYPE, value: null});
//           dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: [] });
//           dispatch({ type: Action.SET_SPATIAL_REWARD, value: [] });
//           dispatch({ type: Action.SET_VARIABLE_REWARD, value: [] });
//           dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: [] });

//         // Move to the next round enabling the user to freely select the next sample location
//         } else if (transitionAdj === 2) {
//           dispatch({ type: Action.SET_OBJECTIVES, value: [] });
//           dispatch({ type: Action.SET_DISABLE_SUBMIT_BUTTON, value: true });
//           dispatch({ type: Action.SET_IMG_CLICK_ENABLED, value: true });
//           dispatch({ type: Action.SET_USER_FREE_SELECTION, value: true });// **Set the default opton pointing to "ignore" if the user selected it. - Zeyu & Steven 5/18/2022
//           dispatch({ type: Action.SET_USER_FEEDBACK_STATE, value: UserFeedbackState.USER_LOCATION_SELECTION });
//           dispatch({ type: Action.SET_NUM_IMG_CLICKS, value: 0 });
//           dispatch({ type: Action.SET_SAMPLE_TYPE, value: 'user'});
//           dispatch({ type: Action.SET_ROBOT_SUGGESTIONS, value: [] });
//           dispatch({ type: Action.SET_SPATIAL_REWARD, value: [] });
//           dispatch({ type: Action.SET_VARIABLE_REWARD, value: [] });
//           dispatch({ type: Action.SET_DISCREPANCY_REWARD, value: [] });

//         // Bring up the quit screen
//         } else if (transitionAdj === 3) {
//           onConcludeClick();
//         }

//         // If the user selects any option besides the quit screen, then automatically add the data
//         // from the current step to the finalized userSteps and reset some of the currUserStep data
//         if (transitionAdj !== 3) {
//           dispatch({ type: Action.SET_USER_STEP_IDX, value: step + 1});
//           dispatch({ type: Action.SET_OBJECTIVES_FREE_RESPONSE, value: ""});
//           dispatch({ type: Action.SET_ACCEPT_OR_REJECT, value: -1 });
//           dispatch({ type: Action.SET_REJECT_REASON, value: -1 });
//           dispatch({ type: Action.SET_REJECT_REASON_FREE_RESPONSE, value: ""});
//           dispatch({ type: Action.SET_USER_SAMPLE, value: null });
//           dispatch({ type: Action.SET_TRANSITION, value: 1 }); // Set default option pointing to if the user didn't choose *ignore*. - Zeyu 5/18/2022
//           // console.log("hello"); for debugging
//           updateUserSteps();
//         }
//         console.log({globalState}); // for debugging
//         return;
//       }
//     }
//   }

//   const clickableImageTip = "Please select a location on the transect to sample from between the crest and interdune";
//   const clickableImageTipStyle = {
//       fontSize: '12px'
//   }

//   // Right panel to display when collecting data, sampleState != FINISH_TRANSECT
//   const collectionRightPanel = (
//     <div className="collectionRightPanel">
//       <ImgAlert open={!!showImgAlert} />
//       <Tooltip title={userFeedbackState !== UserFeedbackState.USER_LOCATION_SELECTION ? "" : <span style={clickableImageTipStyle}>{clickableImageTip}</span>} placement="bottom">
//           <div className="clickableImageContainer">
//             <ClickableImage width={750} enabled={imgClickEnabled} addDataFunc={() => addDataToPlot()} setPopOver={setImgAlert} />  
//           </div>
//       </Tooltip>
//       {!loadingRobotSuggestions && <div className={numSubmitClicks === 0 ? "user-feedback-flashing" : "user-feedback"}>
//         {userFeedbackStateMap[userFeedbackState]}
//         <div className="submit-user-feedback-button">
//           <Button disabled={disableSubmitButton} variant="contained" color="secondary" onClick={onSubmit}>
//             Submit
//           </Button>
//         </div>
//       </div>}
//       {loadingRobotSuggestions && <div className="loading-screen">
//         <div className="loading-section">
//           <i>
//             RHex is determining where to sample from next. This should take at most 5-10 seconds...
//           </i>
//         </div>
//         <div className="loading-section">
//           <CircularProgress 
//             color="secondary"
//             size={100}
//           />
//         </div>
//       </div>}
//       <div className="quit">
//         <Button className="quitButton" variant="contained" color="primary" onClick={onConcludeClick}>
//           End Collection At Transect
//         </Button>
//       </div>
//     </div>
//   );

//   // Popup for displaying instructions on the decision page
//   const [decisionHelpOpen, setDecisionHelpOpen] = useState(true);
//   const decisionHelpDialog =
//     <MultiStepDialog
//       open={decisionHelpOpen}
//       setOpen={setDecisionHelpOpen}
//       title={""}
//       allowCancel={false}
//       steps={[
//         ["RHex will always take 3 measurements of moisture and strength at each location visited.",
//         "The dune cross-section on the right displays the locations where RHex has already sampled and the charts on the left display the corresponding data.",
//         "You will be asked a few questions to determine where RHex should sample next.",
//         "If at any point you feel you have collected enough data to make a judgment about the hypothesis, select \"End Collection at Transect.\""
//         ]
//       ]}
//     />;

//   function Helper() {
//     const onClick = () => {
//       setDecisionHelpOpen(true);
//     };
  
//     return (
//       <div style={{
//         position: 'fixed',
//         bottom: 20,
//         right: 40
//       }}>
//         <HelpIcon
//           id="helper"
//           onClick={onClick}
//           color="primary"
//           fontSize="large"
//         />
//       </div>
//     );
//   }

//   return (
//     <div id="app" className="decisionPage">
//       { helperOpen && <Helper /> }
//       { decisionHypothesisDialog }
//       { decisionHelpDialog }

//       <ConfirmDialog
//         open={confirmConcludeOpen}
//         title={""}
//         text={"Are you sure you are ready to quit data collection at this transect? Press GO BACK to collect more data. Press CONTINUE to move on to a few final survey questions."}
//         okText="CONTINUE"
//         cancelText="GO BACK"
//         allowCancel={true}
//         onClose={() => setConfirmConcludeOpen(false)}
//         onCancel={() => setConfirmConcludeOpen(false)}
//         onOk={onQuit}
//       />

//       <Grid container>
//         <Grid container>
//           <Grid item xs={12} md={6}>
//             <ChartPanel fullSize={true} mode={"TransectView"}/>
//           </Grid>
//           <Grid item xs={12} md={6} className="rightDecisionPanel">
//             <div className="rightDecisionPanelContainer">
//               { collectionRightPanel }
//             </div>
//           </Grid>
//         </Grid>
//       </Grid>
//     </div>
//   );
// }
