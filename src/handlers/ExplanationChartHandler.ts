import * as Chart from 'chart.js';
//import * as BarChart from chart
import { Action, IState, ExplanationChart } from '../state';
import { explanationChartOption } from '../constants';
import 'chartjs-plugin-annotation';


const BoldTickUnderlayPlugin = {
  id: 'boldTickUnderlay',
  afterDraw(chart) {
    const cfg = chart.options.highlightTicks || [];
    if (!cfg.length) return;
    const xScale = chart.scales['x-axis-0'];
    const ctx = chart.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    const fontSize = Chart.defaults.global.defaultFontSize || 12;
    ctx.font = `bold ${fontSize}px ${Chart.defaults.global.defaultFontFamily}`;

    cfg.forEach(h => {
      let idx = typeof h.index === 'number' ? h.index : -1;
      if (idx < 0 && h.value != null) {
        idx = (chart.data.labels || []).indexOf(h.value);
      }
      if (idx < 0) return;
      const x = xScale.getPixelForTick(idx);
      const y = xScale.bottom + (chart.options.scales?.xAxes?.[0]?.ticks?.padding || 10) + 8;
      const text = h.label != null ? h.label : chart.data.labels[idx];
      ctx.fillText(text, x, y);
    });

    ctx.restore();
  }
};

Chart.plugins.register(BoldTickUnderlayPlugin);

export function applyExplanationChartLayout(chart: any) {
  if (!chart || !chart.options || !chart.ctx) {
    return;
  }
  try {
  const parent = document.getElementById('explanationChartParent');
  const w = parent ? parent.clientWidth : 0;
  const h = parent ? parent.clientHeight : 0;
  if (w < 20 || h < 20) {
    return;
  }
  const prevW = chart._lassieLayoutW || 0;
  const prevH = chart._lassieLayoutH || 0;
  if (Math.abs(prevW - w) < 2 && Math.abs(prevH - h) < 2) {
    return;
  }
  chart._lassieLayoutW = w;
  chart._lassieLayoutH = h;

  chart.options.maintainAspectRatio = false;
  chart.options.responsive = false;

  const scale = Math.max(0.38, Math.min(1.05, Math.min(h / 220, w / 420)));
  const compact = h < 150;
  const tiny = h < 110;
  const titleSize = Math.max(tiny ? 7 : 8, Math.round(12 * scale));
  const legendSize = Math.max(tiny ? 6 : 7, Math.round(10 * scale));
  const boxW = Math.max(tiny ? 8 : 10, Math.round(12 * scale));
  const axisSize = Math.max(tiny ? 6 : 7, Math.round(9 * scale));

  chart.options.title = chart.options.title || {};
  chart.options.title.display = true;
  chart.options.title.fontSize = titleSize;
  chart.options.title.padding = tiny ? 0 : (compact ? 1 : 4);
  chart.options.title.text = 'Reward Value for Each Objective Across Transect';

  chart.options.legend = {
    display: true,
    position: 'top',
    fullWidth: true,
    labels: {
      fontSize: legendSize,
      fontStyle: 'normal',
      boxWidth: boxW,
      padding: tiny ? 2 : (compact ? 4 : 6),
      usePointStyle: false
    }
  };
  if (chart.options.plugins && chart.options.plugins.legend) {
    chart.options.plugins.legend.display = false;
  }

  chart.options.layout = chart.options.layout || {};
  chart.options.layout.padding = tiny
    ? { top: 0, right: 2, bottom: 0, left: 0 }
    : (compact ? { top: 0, right: 4, bottom: 0, left: 0 } : { top: 2, right: 6, bottom: 2, left: 2 });

  const xAxes = chart.options.scales && chart.options.scales.xAxes;
  if (xAxes && xAxes[0]) {
    xAxes[0].ticks = {
      ...(xAxes[0].ticks || {}),
      display: false,
      fontSize: axisSize,
      maxRotation: 0,
      minRotation: 0,
      padding: tiny ? 0 : 3
    };
    if (xAxes[0].scaleLabel) {
      xAxes[0].scaleLabel.display = !compact;
      xAxes[0].scaleLabel.fontSize = axisSize;
      xAxes[0].scaleLabel.padding = compact ? 0 : 4;
      xAxes[0].scaleLabel.labelString = 'Transect';
    }
  }
  const yAxes = chart.options.scales && chart.options.scales.yAxes;
  if (yAxes && yAxes[0]) {
    yAxes[0].ticks = {
      ...(yAxes[0].ticks || {}),
      display: !tiny,
      min: 0,
      max: 1.1,
      fontSize: axisSize
    };
    if (yAxes[0].scaleLabel) {
      yAxes[0].scaleLabel.display = !compact;
      yAxes[0].scaleLabel.fontSize = axisSize;
      yAxes[0].scaleLabel.padding = compact ? 0 : 4;
    }
  }

  if (chart.resize) {
    chart.resize();
  }
  if (chart.update) {
    chart.update(0);
  }
  } catch (err) {}
}



/** Build annotation objects (Chart.js v2) for vertical lines at selected x's */
function buildAnnotations(highlights: Array<{ index?: number; value?: number | string; lineColor?: string; lineWidth?: number; insideLabel?: string }>, labels?: Array<string | number>) {
  return (highlights || [])
    .map(h => {
      let xVal: number | string | undefined;
      if (typeof h.index === 'number') {
        xVal = h.index;
      } else if (h.value != null) {
        xVal = h.value;
      } else {
        return null;
      }
      
      return {
        type: 'line',
        mode: 'vertical',
        scaleID: 'x-axis-0',
        value: xVal,
        borderColor: h.lineColor || 'black',
        borderWidth: h.lineWidth || 2,
        label: h.insideLabel
          ? {
              enabled: true,
              content: h.insideLabel,
              position: 'top',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              fontColor: '#fff'
            }
          : {}
      };
    })
    .filter(Boolean) as any[];
}

/** Apply highlights to the chart: both under-tick bold labels and vertical lines */
function setHighlights(explanationChart: any, highlights: Array<{ index?: number; value?: number; label?: string; lineColor?: string; lineWidth?: number; insideLabel?: string }>) {
  if (!explanationChart) return;

  // 1) Custom under-axis bold labels (consumed by BoldTickUnderlayPlugin)
  (explanationChart.options as any).highlightTicks = highlights;

  // 2) Vertical annotation lines + in-chart labels
  (explanationChart.options as any).annotation = (explanationChart.options as any).annotation || {};
  (explanationChart.options as any).annotation.annotations = buildAnnotations(highlights);

  // leave space for under-axis labels
  (explanationChart.options as any).layout = (explanationChart.options as any).layout || {};
  (explanationChart.options as any).layout.padding = { ...(explanationChart.options as any).layout.padding, bottom: 24 };
}


export const updateExplanationChart = (globalState: IState, dispatch: any) => {
    const { explanationChartSettings, currUserStep } = globalState;
    const { variableReward, spatialReward, discrepancyReward, robotSuggestions} = currUserStep;

    console.log(robotSuggestions);
    console.log("robotSuggestions from explanation chart ");
    let { explanationChart } = globalState;
  
    if (!explanationChart) return;
    
    clearExplanationChart(explanationChart);
    explanationChart = initializeExplanationChart(globalState, dispatch);
  
    if (explanationChart === null) {
      return;
    }
  
    // const shearDataPoints = [] as any[];
    // const moistureDataPoints = [] as any[];
    // const shearMoistureDataPoints = [] as any[];
  
    // for (let rowIndex = 0; rowIndex < samples.length; rowIndex++) {
    //   const row = samples[rowIndex];
    //   const { index, moisture, shear } = row;
  
    //   // Create data for shear to moisture chart
    //   let shearMoisture : any[] = [];
    //   for (let i = 0; i < moisture.length; i++) {
    //     shearMoisture.push({shear: shear[i], moisture: moisture[i]});
    //   }
  
    //   // Map x value from just the section of the slope to [0, 1]
    //   const xVal = (row.normOffsetX - NORMALIZED_CREST_RANGE.min) / (NORMALIZED_CREST_RANGE.max - NORMALIZED_CREST_RANGE.min);
    //   //const { shearValues, moistureValues, shearMoistureValues } = getMeasurements(globalState, transectIdx, index, measurements);
    //   const averageShearValue = mean(shear);
    //   const averageMoistureValue = mean(moisture);
  
    //   if (chartSettings.mode === ChartDisplayMode.RAW) {
    //     shear.forEach(value => pushChartArrayValue(shearDataPoints, Math.min(xVal, 1), value, rowIndex, currSampleIdx, index));
    //     moisture.forEach(value => pushChartArrayValue(moistureDataPoints, Math.min(xVal, 1), value, rowIndex, currSampleIdx, index));
    //     shearMoisture.forEach(value => pushChartArrayValue(shearMoistureDataPoints, value.moisture, value.shear, rowIndex, currSampleIdx, index));
    //   } else if (chartSettings.mode === ChartDisplayMode.AVERAGE) {
    //     pushChartArrayValue(shearDataPoints, Math.min(xVal, 1), averageShearValue, rowIndex, currSampleIdx,index);
    //     pushChartArrayValue(moistureDataPoints, Math.min(xVal, 1), averageMoistureValue, rowIndex, currSampleIdx, index);
    //     pushChartArrayValue(shearMoistureDataPoints, averageMoistureValue, averageShearValue, rowIndex, currSampleIdx, index);
    //   }
    // }
    console.log("update explanation chart called");
  
    if (explanationChart) {
      console.log(spatialReward);
      console.log("logged spatial reward from explanation chart");
      console.log(currUserStep);
      //spatial
      const spatialRewardFormat = (spatialReward && spatialReward.length)
        ? spatialReward.map((j,i) => ({x: i, y: j}))
        : [];
      explanationChart.data.datasets[0].data = spatialRewardFormat;

      console.log("data 0 from explanation chart handler" + explanationChart.data.datasets[0].data)
   // discrepancy - green

   console.log("logging discrepancy reward from explanation chart");
   console.log(discrepancyReward);
   const discrepancyRewardFormat = (discrepancyReward && discrepancyReward.length)
     ? discrepancyReward.map((j,i) => ({x: i, y: j}))
     : [];
      console.log("formatted discrepancy reward" + discrepancyRewardFormat);

    explanationChart.data.datasets[1].data = discrepancyRewardFormat;

    const xMax = Math.max(
      spatialRewardFormat.length ? spatialRewardFormat[spatialRewardFormat.length - 1].x : 21,
      discrepancyRewardFormat.length ? discrepancyRewardFormat[discrepancyRewardFormat.length - 1].x : 21
    );
    if (explanationChart.options && explanationChart.options.scales && explanationChart.options.scales.xAxes && explanationChart.options.scales.xAxes[0]) {
      explanationChart.options.scales.xAxes[0].ticks = {
        ...(explanationChart.options.scales.xAxes[0].ticks || {}),
        min: 0,
        max: xMax
      };
    }

    const dynamicHighlights = Array.isArray(robotSuggestions)
  ? robotSuggestions.map((s, k) => (
    
     {
      index: s.index, //supposed to be s.index TODO
      lineColor: '#000',
      lineWidth: 2,
      insideLabel: `${String.fromCharCode(k + 65)}`
    }))
  : [];

//setHighlights(explanationChart, dynamicHighlights); NOTE 5/20 uncomment later
     
    } else {
      //console.log("chart.shearChart undefined");
    }
  
    // if (chart.shearChartMap) {
    //   chart.shearChartMap.data.datasets[0].data = shearDataPoints;
    //   chart.moistChartMap.data.datasets[0].data = moistureDataPoints;
    //   chart.shearMoistChartMap.data.datasets[0].data = shearMoistureDataPoints;
    // } else {
    //   //console.log("chart.shearChartMap undefined");
    // }
  
    applyExplanationChartLayout(explanationChart);
    dispatch({
        type: Action.SET_EXPLANATION_CHART,
        value: explanationChart
    });
  }



export const initializeExplanationChart = (globalState: IState, dispatch: any) : ExplanationChart => {

    let { explanationChart } = globalState;
    try {
      clearExplanationChart(explanationChart);
    } catch (e) {
      console.log(e);
    }
  
  
    const { currUserStep } = globalState;
    const { variableReward, discrepancyReward, robotSuggestions } = currUserStep;
    console.log("initialized chart");
    // const minReward = 0;
    // const maxReward = 1;
  
    // explanationChartOption.options.scales.xAxes[0].ticks = { min: 0, max: 21};
    // explanationChartOption.options.scales.yAxes[0].ticks = { min:0, max: 1 };

    // const onHoverFunc = (ev, activeElements) => {
    //   if (activeElements.length === 0) {
    //     dispatch({
    //       type: Action.SET_HOVER,
    //       value: { isHovered: false }
    //     });
    //     return;
    //   }
    //   const {_datasetIndex, _index, _chart} = activeElements[0];
    //   if (_datasetIndex === undefined || _index === undefined ) { return; }
    //   const rowIndex = _chart.data.datasets[_datasetIndex].data[_index].rowIndex;
    //   dispatch({
    //     type: Action.SET_HOVER,
    //     value: { index: rowIndex, isHovered: true }
    //   });
    // };

    // shearChartOption.options.onHover = onHoverFunc;
    // moistChartOption.options.onHover = onHoverFunc;
  
  
    // Assume that if one chart is in DOM, the others also are.
    if (document.getElementById('explanationChart')) {
      const explanationCtx = (document.getElementById('explanationChart') as HTMLCanvasElement).getContext('2d');

  
      if (explanationCtx) {
        explanationChart = new Chart(explanationCtx, explanationChartOption as any);
        applyExplanationChartLayout(explanationChart);
      }
    }

    if (explanationChart && explanationChart.options) {
      (explanationChart.options as any).scales = (explanationChart.options as any).scales || {};
      (explanationChart.options as any).scales.xAxes = (explanationChart.options as any).scales.xAxes || [{ id: 'x-axis-0' }];
      if (!(explanationChart.options as any).scales.xAxes[0]) {
        (explanationChart.options as any).scales.xAxes[0] = { id: 'x-axis-0' };
      }
    }
//(explanationChart.options as any).scales.xAxes[0].type = 'linear'; //5/20 NOTE Commented to test 

// (explanationChart.options as any).scales.xAxes[0].ticks = {
//   ...(explanationChart.options as any).scales.xAxes[0].ticks,
//   min: 0,
//   max: 99,
//   padding: 10
// };// 5/20 NOTE  uncomment for line chart

// Optional: y range you expect
// (explanationChart.options as any).scales.yAxes = (explanationChart.options as any).scales.yAxes || [{}];
// (explanationChart.options as any).scales.yAxes[0].ticks = {
//   ...(explanationChart.options as any).scales.yAxes[0].ticks,
//   min: 0,
//   max: 5
// };

// Initial highlights (e.g., from robotSuggestions if present)
// const { currUserStep } = globalState;
// const { robotSuggestions } = currUserStep || {};
const initialHighlights = Array.isArray(robotSuggestions) && robotSuggestions.length
  ? robotSuggestions.map((s) => ({
      index: s.index,   // text under the tick
      lineColor: '#000',
      lineWidth: 2,
      insideLabel: `#${String.fromCharCode(s.index + 65)}` // in-chart label above the line (optional)
    }))
  : [
      // fallback if robotSuggestions is empty
      { index: 2,  label: 'Site A', lineColor: '#000', lineWidth: 2, insideLabel: 'A' },
      { index: 11, label: 'Hub',    lineColor: '#000', lineWidth: 2, insideLabel: 'Hub' },
      { index: 15, label: 'Peak',   lineColor: '#000', lineWidth: 2, insideLabel: 'Peak' }
    ];

//setHighlights(explanationChart, initialHighlights); //5/20 NOTE uncomment for highlights again
    // explanationChart.data.datasets[0].data = [{
    //     x: 10,
    //     y: 0.6
    // }, {
    //     x: 15,
    //     y: 0.8
    // }, {
    //     x: 5,
    //     y: 0.3
    // }]; NOTE 5/20 uncomment

  
    // if (document.getElementById('shearChartMap')) {
    //   const shearMapCtx = (document.getElementById('shearChartMap') as HTMLCanvasElement).getContext('2d');
    //   const moistMapCtx = (document.getElementById('moistChartMap') as HTMLCanvasElement).getContext('2d');
    //   const shearMoistMapCtx = (document.getElementById('shearMoistChartMap') as HTMLCanvasElement).getContext('2d');
  
    //   if (shearMapCtx && moistMapCtx && shearMoistMapCtx) {
    //     shearChartMap = new Chart(shearMapCtx, shearChartOption as any);
    //     moistChartMap = new Chart(moistMapCtx, moistChartOption as any);
    //     shearMoistChartMap = new Chart(shearMoistMapCtx, shearMoistChartOption as any);
    //   }
    // }
  
    // const charts : Charts = {
    //   shearChart, moistChart, shearMoistChart, shearChartMap, moistChartMap, shearMoistChartMap
    // };
    applyExplanationChartLayout(explanationChart);
    dispatch({
      type: Action.SET_EXPLANATION_CHART,
      value: explanationChart
    });
    return explanationChart;
  }


export const clearExplanationChart = (chart) => {
    resetCanvas(); // reset the chart canvases
    if (!chart) return;
    chart.destroy();
    // Object.values(chart).forEach((c: any) => {
    //   if (!c) return; 
    //   c.destroy();
    // });
  }
  

var resetCanvas = function(){
    const parent = document.getElementById('explanationChartParent');
    if (!parent) {
      return;
    }
    let explanationCanvas = document.getElementById('explanationChart') as HTMLCanvasElement | null;
    if (!explanationCanvas || explanationCanvas.parentNode !== parent) {
      explanationCanvas = document.createElement('canvas');
      explanationCanvas.id = 'explanationChart';
      parent.appendChild(explanationCanvas);
    }
    explanationCanvas.style.display = 'block';
    explanationCanvas.style.width = '100%';
    explanationCanvas.style.height = '100%';
    const w = parent.clientWidth || 600;
    const h = parent.clientHeight || 200;
    explanationCanvas.width = w;
    explanationCanvas.height = h;
  };


// import * as Chart from 'chart.js';
// import { IState, Action, Charts } from '../state';
// import {clearCharts} from './ChartHandler';


// export const initializeExplanationChart = (globalState: IState, dispatch: any) : Charts => {
//     let { chart } = globalState;
//     try {
//         clearCharts(chart);
//     } catch (e) {
//         console.log(e);
//     }

//     // Assuming your chart data and configurations
//     const explanationChartOptions = {
//         type: 'bar',
//         data: {
//             labels: ['Label1', 'Label2', 'Label3', 'Label4'],
//             datasets: [{
//                 label: 'Example Data',
//                 data: [12, 19, 3, 5],
//                 backgroundColor: 'rgba(75, 192, 192, 0.2)',
//                 borderColor: 'rgba(75, 192, 192, 1)',
//                 borderWidth: 1,
//             }]
//         },
//         options: {
//             scales: {
//                 x: { beginAtZero: true },
//                 y: { beginAtZero: true },
//             }
//         }
//     };

//     let explanationChart: any;

//     if (document.getElementById('explanationChartCanvas')) {
//         const ctx = (document.getElementById('explanationChartCanvas') as HTMLCanvasElement).getContext('2d');
//         if (ctx) {
//             explanationChart = new Chart(ctx, explanationChartOptions as any);
//         }
//     }

//     const charts : any = {
//         explanationChart
//     };
//     dispatch({
//         type: Action.SET_EXPLANATION_CHART,
//         value: charts
//     });
//     return charts;
// }

// export const updateExplanationChart = (globalState: IState, dispatch: any) => {
//     let { explanationChart } = globalState;

//     if (!explanationChart) return;

//     explanationChart.update();  
// }

// export const clearExplanationCharts = (chart) => {
//     if (!chart) return;
//     Object.values(chart).forEach((c: any) => {
//         if (!c) return; 
//         c.destroy();
//     });
// }
