import * as Chart from 'chart.js';
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
      const spatialRewardFormat = spatialReward.map((j,i) => ({x:i, y:j}));
      console.log("formatted spatial reward" + spatialRewardFormat);

      // explanationChart.data.datasets[0].data = spatialRewardFormat;
      
      
     
      explanationChart.data.datasets[0].data =
      [
        { x: 0, y: 0.7429797155009306 },
        { x: 1, y: 0.43861608620107184 },
        { x: 2, y: 0.7429797155009306 },
        { x: 3, y: 0.9753345122421678 },
        { x: 4, y: 0.9995038341283518 },
        { x: 5, y: 0.9999979060678188 },
        { x: 6, y: 0.9999979060678188 },
        { x: 7, y: 0.9995038341283518 },
        { x: 8, y: 0.9753345122418252 },
        { x: 9, y: 0.7429797136518924 },
        { x: 10, y: 0.4386139941179287 },
        { x: 11, y: 0.7424835496296249 },
        { x: 12, y: 0.9506690244843357 },
        { x: 13, y: 0.7424835496292823 },
        { x: 14, y: 0.43861399226889053 },
        { x: 15, y: 0.7429776215687494 },
        { x: 16, y: 0.9748383463705196 },
        { x: 17, y: 0.9748383463708622 },
        { x: 18, y: 0.7429776234177874 },
        { x: 19, y: 0.4386160843520337 },
        { x: 20, y: 0.742979715500588 },
        { x: 21, y: 0.9753345122421678 }
    ];
   // discrepancy - green

   console.log("logging discrepancy reward from explanation chart");
   console.log(discrepancyReward);
   const discrepancyRewardFormat = discrepancyReward.map((j,i) => ({x:i, y:j}));
      console.log("formatted discrepancy reward" + discrepancyRewardFormat);

    // explanationChart.data.datasets[1].data = discrepancyRewardFormat;
    // console.log("checking that data is assigned" + explanationChart.data.datasets[1].data[0])
    explanationChart.data.datasets[1].data = 
    [
        { x: 0, y: 0.3154091199969593 },
        { x: 1, y: 0.2838104103438007 },
        { x: 2, y: 0.264149394170256 },
        { x: 3, y: 0.24484835963150375 },
        { x: 4, y: 0.22554732509275158 },
        { x: 5, y: 0.20624629055399937 },
        { x: 6, y: 0.18694525601524728 },
        { x: 7, y: 0.16764422147649513 },
        { x: 8, y: 0.1483431869377429 },
        { x: 9, y: 0.1291622211682804 },
        { x: 10, y: 0.13026312607811671 },
        { x: 11, y: 0.18016271759208138 },
        { x: 12, y: 0.23357978352283973 },
        { x: 13, y: 0.2870782718242321 },
        { x: 14, y: 0.339743653685639 },
        { x: 15, y: 0.3460147117399505 },
        { x: 16, y: 0.34759080041423723 },
        { x: 17, y: 0.34919553274652965 },
        { x: 18, y: 0.35668745798119095 },
        { x: 19, y: 0.36725129317627575 },
        { x: 20, y: 0.37752276015714054 },
        { x: 21, y: 0.3805363782074797 },
        

    ]
    ;

//     const dynamicHighlights = Array.isArray(robotSuggestions)
//   ? robotSuggestions.map((s, k) => (
    
//      {
//       index: s.index, //supposed to be s.index TODO
//       lineColor: '#000',
//       lineWidth: 2,
//       insideLabel: `${String.fromCharCode(k + 65)}`
//     }))
//   : [];

// setHighlights(explanationChart, dynamicHighlights);
//12/3 testing commenting this out
     
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
  
    explanationChart.update();
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
      }
    }

    (explanationChart.options as any).scales = (explanationChart.options as any).scales || {};
(explanationChart.options as any).scales.xAxes = (explanationChart.options as any).scales.xAxes || [{ id: 'x-axis-0' }];
if (!(explanationChart.options as any).scales.xAxes[0]) {
  (explanationChart.options as any).scales.xAxes[0] = { id: 'x-axis-0' };
}
(explanationChart.options as any).scales.xAxes[0].type = 'linear';
(explanationChart.options as any).scales.xAxes[0].ticks = {
  ...(explanationChart.options as any).scales.xAxes[0].ticks,
  min: 0,
  max: 100,
  padding: 10
};

// Optional: y range you expect
(explanationChart.options as any).scales.yAxes = (explanationChart.options as any).scales.yAxes || [{}];
(explanationChart.options as any).scales.yAxes[0].ticks = {
  ...(explanationChart.options as any).scales.yAxes[0].ticks,
  min: 0,
  max: 10 //trying to see if setting it higher works TODO (change to be scaled)
};

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
      // { index: 2,  label: 'Site A', lineColor: '#000', lineWidth: 2, insideLabel: 'A' },
      // { index: 11, label: 'Hub',    lineColor: '#000', lineWidth: 2, insideLabel: 'Hub' },
      // { index: 15, label: 'Peak',   lineColor: '#000', lineWidth: 2, insideLabel: 'Peak' }
    ];

setHighlights(explanationChart, initialHighlights);
    explanationChart.data.datasets[0].data = [{
        x: 10,
        y: 0.6
    }, {
        x: 15,
        y: 0.8
    }, {
        x: 5,
        y: 0.3
    }];

  
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
    document.getElementById('explanationChart')?.remove();
    
  
    let explanationCanvas = document.createElement('canvas');
    explanationCanvas.id = 'explanationChart';
    explanationCanvas.width = 600;
    explanationCanvas.height = 200;
    document.getElementById('explanationChartParent')?.appendChild(explanationCanvas);
    //TODO: make sure to add everything under a parent div in ExplanationChart file with the right title
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
