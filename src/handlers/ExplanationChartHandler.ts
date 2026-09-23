import * as Chart from 'chart.js';
//import * as BarChart from chart
import { Action, IState, ExplanationChart } from '../state';
import { explanationChartOption, sampleLocations, NORMALIZED_HEIGHT } from '../constants';
import { notifyTransectGuides } from '../components/TransectAlignGuides';
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

const SuggestionLabelPlugin = {
  id: 'suggestionLabels',
  afterDraw(chart) {
    const anns = (chart.options.annotation && chart.options.annotation.annotations) || [];
    if (!anns.length) {
      return;
    }
    const xScale = chart.scales['x-axis-0'];
    const area = chart.chartArea;
    if (!xScale || !area) {
      return;
    }
    const ctx = chart.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#111';
    const fontSize = Math.max(9, Math.round((Chart.defaults.global.defaultFontSize || 12) * 0.95));
    ctx.font = `bold ${fontSize}px ${Chart.defaults.global.defaultFontFamily}`;
    const labelY = area.bottom + 3;
    anns.forEach(a => {
      const content = a && (a.insideLabel || (a.label && a.label.content));
      if (!a || a.value == null || !content) {
        return;
      }
      const x = xScale.getPixelForValue(a.value);
      ctx.fillText(String(content), x, labelY);
    });
    ctx.restore();
  }
};

Chart.plugins.register(SuggestionLabelPlugin);

const REWARD_X_MAX = 99;
const MARKER_BOTTOM_PAD = 18;
const NUM_WAYPOINTS = 22;

function waypointToRewardX(waypointIndex: number) {
  if (NUM_WAYPOINTS <= 1) {
    return 0;
  }
  return (waypointIndex * REWARD_X_MAX) / (NUM_WAYPOINTS - 1);
}

function readRewardYRange(chart: any) {
  let lo = Infinity;
  let hi = -Infinity;
  const datasets = (chart.data && chart.data.datasets) || [];
  datasets.forEach((ds) => {
    (ds.data || []).forEach((pt) => {
      const y = typeof pt === 'number' ? pt : (pt && pt.y);
      if (typeof y === 'number' && isFinite(y)) {
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
    });
  });
  if (!isFinite(lo) || !isFinite(hi)) {
    return { min: 0, max: 1, stepSize: 0.1 };
  }
  const base = Math.min(lo, 0);
  const span = Math.max(hi - base, 0.1);
  const pad = Math.max(span * 0.08, 0.04);
  const min = lo >= 0 ? 0 : Math.floor((lo - pad) * 10) / 10;
  let max = Math.ceil((hi + pad) * 10) / 10;
  if (max <= min) {
    max = min + 0.1;
  }
  const range = max - min;
  let stepSize = 0.1;
  if (range > 2) {
    stepSize = 0.5;
  } else if (range > 1.2) {
    stepSize = 0.2;
  } else if (range <= 0.4) {
    stepSize = 0.05;
  }
  return { min, max, stepSize };
}

function readPadding(chart: any) {
  const pad = (chart.options.layout && chart.options.layout.padding) || {};
  if (typeof pad === 'number') {
    return { top: pad, right: pad, bottom: pad, left: pad };
  }
  return {
    top: pad.top || 0,
    right: pad.right || 0,
    bottom: pad.bottom || 0,
    left: pad.left || 0
  };
}

function alignRewardPlotToDune(chart: any) {
  const img = document.getElementById('pos-picker');
  const host = document.getElementById('clickable-image') || img;
  const canvas = chart.canvas as HTMLCanvasElement;
  if (!img || !host || !canvas || !chart.chartArea) {
    return false;
  }
  const imgRect = img.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  if (imgRect.height < 40 || canvasRect.width < 40) {
    return false;
  }
  const first = sampleLocations[0];
  const last = sampleLocations[sampleLocations.length - 1];
  // Same overlay mapping as ClickableImage: loc[0] * height / NORMALIZED_HEIGHT
  const overlayScale = imgRect.height / NORMALIZED_HEIGHT;
  const crestX = hostRect.left + first[0] * overlayScale;
  const endX = hostRect.left + last[0] * overlayScale;
  const desiredLeftCss = crestX - canvasRect.left;
  const desiredRightCss = endX - canvasRect.left;
  if (desiredRightCss - desiredLeftCss < 60) {
    return false;
  }

  const chartW = chart.width || canvasRect.width;
  const cssToChart = chartW / canvasRect.width;
  const desiredLeft = desiredLeftCss * cssToChart;
  const desiredRight = desiredRightCss * cssToChart;

  const area = chart.chartArea;
  const pad = readPadding(chart);
  let newL = pad.left + (desiredLeft - area.left);
  let newR = pad.right + (area.right - desiredRight);
  const minPlot = 80;
  const maxTotal = chartW - minPlot;
  newL = Math.max(0, newL);
  newR = Math.max(0, newR);
  if (newL + newR > maxTotal) {
    const scale = maxTotal / (newL + newR);
    newL *= scale;
    newR *= scale;
  }
  if (Math.abs(newL - pad.left) < 1 && Math.abs(newR - pad.right) < 1) {
    return false;
  }
  chart.options.layout = chart.options.layout || {};
  chart.options.layout.padding = {
    top: pad.top,
    bottom: pad.bottom,
    left: newL,
    right: newR
  };
  return true;
}

function setSuggestionMarkers(chart: any, robotSuggestions: any[]) {
  if (!chart || !chart.options) {
    return;
  }
  const grouped: { [index: number]: string[] } = {};
  (robotSuggestions || []).forEach((s, k) => {
    if (!s || typeof s.index !== 'number') {
      return;
    }
    if (!grouped[s.index]) {
      grouped[s.index] = [];
    }
    grouped[s.index].push(String.fromCharCode(k + 65));
  });
  const highlights = Object.keys(grouped).map((key) => {
    const idx = Number(key);
    return {
      value: waypointToRewardX(idx),
      lineColor: '#111',
      lineWidth: 1.5,
      insideLabel: grouped[idx].join('/')
    };
  });
  chart.options.annotation = chart.options.annotation || {};
  chart.options.annotation.annotations = buildAnnotations(highlights);
  const pad = readPadding(chart);
  if (highlights.length && pad.bottom < MARKER_BOTTOM_PAD) {
    chart.options.layout = chart.options.layout || {};
    chart.options.layout.padding = {
      ...pad,
      bottom: MARKER_BOTTOM_PAD
    };
  }
}

export function applyExplanationChartLayout(chart: any) {
  if (!chart || !chart.options || !chart.ctx) {
    return;
  }
  try {
  if (!chart.options.events || !chart.options.events.length) {
    chart.options.events = ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove', 'touchend'];
    if (chart.bindEvents) {
      chart.bindEvents();
    }
  }
  chart.options.hover = chart.options.hover || {};
  chart.options.hover.animationDuration = 0;
  if (chart.options.elements && chart.options.elements.point) {
    chart.options.elements.point.hoverRadius = 4;
    chart.options.elements.point.hoverBorderWidth = 1;
  }
  if (chart.data && chart.data.datasets) {
    chart.data.datasets.forEach((ds) => {
      ds.pointHoverRadius = 4;
    });
  }
  const parent = document.getElementById('explanationChartParent');
  const w = parent ? parent.clientWidth : 0;
  const h = parent ? parent.clientHeight : 0;
  if (w < 20 || h < 20) {
    return;
  }
  const prevW = chart._lassieLayoutW || 0;
  const prevH = chart._lassieLayoutH || 0;
  const sizeChanged = Math.abs(prevW - w) >= 4 || Math.abs(prevH - h) >= 4;
  if (sizeChanged) {
    chart._lassieLayoutW = w;
    chart._lassieLayoutH = h;

  chart.options.maintainAspectRatio = false;
  chart.options.responsive = false;
  chart.options.hover = { animationDuration: 0 };
  if (chart.options.elements && chart.options.elements.point) {
    chart.options.elements.point.hoverRadius = 4;
    chart.options.elements.point.hoverBorderWidth = 1;
  }

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
  chart.options.title.padding = tiny ? 0 : (compact ? 1 : 2);
  chart.options.title.text = 'Reward Value for Each Objective Across Transect';

  chart.options.legend = {
    display: true,
    position: 'top',
    fullWidth: true,
    labels: {
      fontSize: legendSize,
      fontStyle: 'normal',
      boxWidth: boxW,
      padding: tiny ? 2 : (compact ? 3 : 4),
      usePointStyle: false
    }
  };
  if (chart.options.plugins && chart.options.plugins.legend) {
    chart.options.plugins.legend.display = false;
  }

  const hasMarkers = !!(chart.options.annotation && chart.options.annotation.annotations && chart.options.annotation.annotations.length);
  const bottomPad = hasMarkers ? (tiny ? 14 : MARKER_BOTTOM_PAD) : (tiny ? 0 : (compact ? 0 : 2));
  const pad = readPadding(chart);
  chart.options.layout = chart.options.layout || {};
  chart.options.layout.padding = {
    top: tiny ? 0 : (compact ? 1 : 2),
    bottom: bottomPad,
    left: pad.left,
    right: pad.right
  };

  const xAxes = chart.options.scales && chart.options.scales.xAxes;
  if (xAxes && xAxes[0]) {
    xAxes[0].ticks = {
      ...(xAxes[0].ticks || {}),
      display: false,
      min: 0,
      max: REWARD_X_MAX,
      fontSize: axisSize,
      maxRotation: 0,
      minRotation: 0,
      padding: tiny ? 0 : 3
    };
    xAxes[0].gridLines = {
      ...(xAxes[0].gridLines || {}),
      display: false
    };
    if (xAxes[0].scaleLabel) {
      xAxes[0].scaleLabel.display = !compact && !hasMarkers;
      xAxes[0].scaleLabel.fontSize = axisSize;
      xAxes[0].scaleLabel.padding = compact ? 0 : 4;
      xAxes[0].scaleLabel.labelString = 'Transect';
    }
  }
  const yAxes = chart.options.scales && chart.options.scales.yAxes;
  if (yAxes && yAxes[0]) {
    const yRange = readRewardYRange(chart);
    yAxes[0].ticks = {
      ...(yAxes[0].ticks || {}),
      display: !tiny,
      min: yRange.min,
      max: yRange.max,
      stepSize: yRange.stepSize,
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
  }
  const yAxesLive = chart.options.scales && chart.options.scales.yAxes;
  if (yAxesLive && yAxesLive[0]) {
    const yRange = readRewardYRange(chart);
    yAxesLive[0].ticks = {
      ...(yAxesLive[0].ticks || {}),
      min: yRange.min,
      max: yRange.max,
      stepSize: yRange.stepSize
    };
  }
  let aligned = false;
  if (alignRewardPlotToDune(chart) && chart.update) {
    aligned = true;
    chart.update(0);
    if (alignRewardPlotToDune(chart) && chart.update) {
      chart.update(0);
    }
  }
  if (sizeChanged || aligned) {
    notifyTransectGuides();
  }
  } catch (err) {}
}



/** Build annotation objects (Chart.js v2) for vertical lines at selected x's */
function buildAnnotations(highlights: Array<{ index?: number; value?: number | string; lineColor?: string; lineWidth?: number; insideLabel?: string }>, labels?: Array<string | number>) {
  return (highlights || [])
    .map(h => {
      let xVal: number | string | undefined;
      if (h.value != null) {
        xVal = h.value;
      } else if (typeof h.index === 'number') {
        xVal = h.index;
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
        insideLabel: h.insideLabel || '',
        label: {
          enabled: false,
          content: h.insideLabel || ''
        }
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
    const { currUserStep } = globalState;
    const { spatialReward, discrepancyReward, robotSuggestions} = currUserStep;

    let { explanationChart } = globalState;
    const canvas = document.getElementById('explanationChart') as HTMLCanvasElement | null;
    const chartIsLive = explanationChart && explanationChart.ctx && canvas && explanationChart.canvas === canvas;
    if (!chartIsLive) {
      explanationChart = initializeExplanationChart(globalState, dispatch);
    }
    if (!explanationChart) {
      return;
    }

    const spatialRewardFormat = (spatialReward && spatialReward.length)
      ? spatialReward.map((j,i) => ({x: i, y: j}))
      : [];
    const discrepancyRewardFormat = (discrepancyReward && discrepancyReward.length)
      ? discrepancyReward.map((j,i) => ({x: i, y: j}))
      : [];
    explanationChart.data.datasets[0].data = spatialRewardFormat;
    explanationChart.data.datasets[1].data = discrepancyRewardFormat;

    if (explanationChart.options && explanationChart.options.scales && explanationChart.options.scales.xAxes && explanationChart.options.scales.xAxes[0]) {
      explanationChart.options.scales.xAxes[0].ticks = {
        ...(explanationChart.options.scales.xAxes[0].ticks || {}),
        min: 0,
        max: REWARD_X_MAX
      };
    }

    setSuggestionMarkers(explanationChart, robotSuggestions);
    applyExplanationChartLayout(explanationChart);
    if (explanationChart.update) {
      explanationChart.update(0);
    }
    dispatch({
        type: Action.SET_EXPLANATION_CHART,
        value: explanationChart
    });
  }
  


export const initializeExplanationChart = (globalState: IState, dispatch: any) : ExplanationChart => {

    let { explanationChart } = globalState;
    const existingCanvas = document.getElementById('explanationChart') as HTMLCanvasElement | null;
    if (explanationChart && explanationChart.ctx && existingCanvas && explanationChart.canvas === existingCanvas) {
      applyExplanationChartLayout(explanationChart);
      return explanationChart;
    }
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
        explanationChart = new Chart(explanationCtx, {
          type: explanationChartOption.type,
          data: {
            labels: [],
            datasets: explanationChartOption.data.datasets.map((ds: any) => ({
              ...ds,
              data: []
            }))
          },
          options: explanationChartOption.options
        } as any);
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
    if (chart) {
      try {
        chart.destroy();
      } catch (e) {}
    }
    const canvas = document.getElementById('explanationChart') as HTMLCanvasElement | null;
    if (canvas && (Chart as any).instances) {
      const instances = (Chart as any).instances;
      Object.keys(instances).forEach((key) => {
        const inst = instances[key];
        if (inst && inst.canvas === canvas) {
          try {
            inst.destroy();
          } catch (e) {}
        }
      });
    }
    resetCanvas();
  }
  

var resetCanvas = function(){
    const parent = document.getElementById('explanationChartParent');
    if (!parent) {
      return;
    }
    const oldCanvas = document.getElementById('explanationChart');
    if (oldCanvas && oldCanvas.parentNode) {
      oldCanvas.parentNode.removeChild(oldCanvas);
    }
    const explanationCanvas = document.createElement('canvas');
    explanationCanvas.id = 'explanationChart';
    explanationCanvas.style.display = 'block';
    explanationCanvas.style.width = '100%';
    explanationCanvas.style.height = '100%';
    parent.appendChild(explanationCanvas);
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
