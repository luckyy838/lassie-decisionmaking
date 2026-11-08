import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useStateValue, Action } from '../state';
import { initializeExplanationChart, updateExplanationChart, applyExplanationChartLayout } from '../handlers/ExplanationChartHandler';
import '../styles/explanationPanel.scss';

//TODO: add in modes to switch between types of charts

export default function ExplanationChartPanel() {
  const [globalState, dispatch] = useStateValue();
  const { explanationChartSettings, explanationChart, currUserStep } = globalState;
  const { spatialReward, discrepancyReward, robotSuggestions, userSample, userFeedbackState } = currUserStep;
  const explanationChartRef = useRef(explanationChart);
  explanationChartRef.current = explanationChart;
  const globalStateRef = useRef(globalState);
  globalStateRef.current = globalState;

  useEffect(() => {
      initializeExplanationChart(globalStateRef.current, dispatch);
  }, []);

  // Redraw from the reward arrays themselves. A boolean flag can stay true
  // across the suggestion response, so the chart kept the empty series.
  useEffect(() => {
    updateExplanationChart(globalStateRef.current, dispatch);
    if (explanationChartSettings.updateRequired) {
      dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: {updateRequired: false} });
    }
  }, [spatialReward, discrepancyReward, robotSuggestions, userSample, userFeedbackState, explanationChartSettings.updateRequired]);

  useEffect(() => {
    const parent = document.getElementById('explanationChartParent');
    if (!parent) {
      return;
    }
    let debounceId: any = null;
    const fit = () => {
      if (debounceId) {
        window.clearTimeout(debounceId);
      }
      debounceId = window.setTimeout(() => {
        applyExplanationChartLayout(explanationChartRef.current);
      }, 300);
    };
    const observer = typeof (window as any).ResizeObserver !== 'undefined'
      ? new (window as any).ResizeObserver(fit)
      : null;
    if (observer) {
      observer.observe(parent);
    }
    return () => {
      if (debounceId) {
        window.clearTimeout(debounceId);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);


  const onSaveClick = () => {
     // setShowOptions(false);
      dispatch({ type: Action.SET_EXPLANATION_CHART_SETTINGS, value: {updateRequired: true} });
  }


  const chartIDSuffix = "";

  // let tab = currentTab;
  // if (tab >= chartClassMap[props.mode].length || tab < 0) {
  //     setCurrentTab(0);
  //     tab = 0;
  // }
  //TODO: below, change display to "none" to see what that does

  return (
      <div className={`explanationPanelContainer`}>
          <div className={`explanationPanel`}>
              <div style={{height: "100%", display: "block"}}> 
                  {/* <div className="chartTabs">
                      {
                          chartTabMap[props.mode].map((text, i) => (
                              <div key={i} className={`chartTab ${tab === i && "chartTabSelected"}`} onClick={() => setCurrentTab(i)}>{ text }</div>
                          ))
                      }
                  </div> */}
                

                      <div className={"explanationParent"} id="explanationChartParent">
                          <canvas id={`explanationChart`} />
                      </div>

              </div>
          </div>
      </div>
  );

}
// import * as React from 'react';
// import { useEffect } from 'react';
// import { useStateValue, Action } from '../state';
// import { initializeExplanationChart, updateExplanationChart } from '../handlers/ExplanationChartHandler';

// const BarChart = () => {
//     const [globalState, dispatch] = useStateValue();
//     const { chartSettings } = globalState;

//     useEffect(() => {
//         initializeExplanationChart(globalState, dispatch);
//         updateExplanationChart(globalState, dispatch);
//     }, [chartSettings]);

//     return (
//         <div className="explanationChartContainer">
//             <canvas id="explanationChartCanvas" />
//         </div>
//     );
// }

// export default BarChart;