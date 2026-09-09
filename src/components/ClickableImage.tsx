import * as React from 'react';
import { useState, useCallback, useLayoutEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { NORMALIZED_HEIGHT, POPOVER_TIME, PopboxTypeEnum, NORMALIZED_WIDTH, NUM_MEASUREMENTS, sampleLocations } from '../constants';
import { Sample } from '../types';
import { getNearestIndex, getMeasurements } from '../util';
import { useStateValue, Action } from '../state';
import AddSamplePopup from './AddSamplePopup';
import PositionIndicator from './PositionIndicator';
import PositionIndicatorRhex from './PositionIndicatorRhex';

const diagram = require('../../assets/diagram_scalebar.png');

const useStyles = makeStyles({
  cross: {
    cursor: 'crosshair'
  },
  image: {
    borderRadius: 4,
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.3)",
    width: '70vw',
    display: 'block',
    margin: 'auto',
  },
  imageDecision: {
    borderRadius: 4,
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.3)",
    width: '45vw',
    display: 'block',
    margin: 'auto',
  },
  tick: {
    position: 'absolute',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: '50%',
    border: '2px solid #114B5F',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    zIndex: 3,
    padding: 0,
    minWidth: 10,
    appearance: 'none',
    WebkitAppearance: 'none',
    outline: 'none',
  },
  tickEnabled: {
    cursor: 'pointer',
  },
  tickHover: {
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    backgroundColor: '#e0f4f7',
    borderColor: '#028090',
  },
  tickVisited: {
    backgroundColor: '#d0d0d0',
    borderColor: '#888',
  },
});

const RHEX_BASE_W = 60;
const RHEX_BASE_H = 48;

function getRhexPlacement(
  sampleIndex: number,
  renderHeight: number,
  fitContainer: boolean,
  normOffsetX: number,
  normOffsetY: number,
) {
  const scale = renderHeight / NORMALIZED_HEIGHT;
  if (fitContainer) {
    const [nx, ny] = sampleLocations[sampleIndex];
    const w = RHEX_BASE_W * scale;
    const h = RHEX_BASE_H * scale;
    return {
      left: (nx - 7) * scale,
      top: (ny - 50) * scale,
      width: w,
      height: h,
    };
  }
  return {
    left: (normOffsetX - 7) * scale,
    top: (normOffsetY - 50) * scale,
    width: undefined as number | undefined,
    height: undefined as number | undefined,
  };
}

interface IProps {
  enabled: boolean,
  addDataFunc: (sample: Sample) => void,
  setPopOver: (popoverContent : any) => void,
  width?: number,
  clickMode?: 'intent' | 'sample',
  fitContainer?: boolean
}

export default function ClickableImage({ enabled, addDataFunc, setPopOver, width, clickMode, fitContainer } : IProps) {
  const [clickPosition, setClickPosition] = useState({
    left: 0,
    top: 0,
    normOffsetX: 0,
    normOffsetY: 0
  });
  width = width || NORMALIZED_WIDTH;
  const [clickIndex, setClickIndex] = useState(0);
  const [hoveredTick, setHoveredTick] = useState(-1);
  const [imgEl, setImgEl] = useState<HTMLImageElement>();
  // Obtain DOM element
  // It's wrong to store the height/width only
  // since the DOMRect would have 0 height initially (don't know why)
  const imgHeightRef = useCallback((node : HTMLImageElement) => {
    if (node) {
      setImgEl(node);
    }
  }, []);
  const [globalState, dispatch] = useStateValue();
  const classes = useStyles();

  const { samples, currUserStep, numImgClicks, transectIdx, showRobotSuggestions, showNOMInput } = globalState;
  const { robotSuggestions, desiredWaypoint, userSample } = currUserStep;
  const mode = clickMode || 'sample';
  const suggestionIndexes = (robotSuggestions || []).map(s => s.index);
  const visitedIndexes = samples.map(s => s.index);
  const planIsSelected = showRobotSuggestions
    && !!desiredWaypoint
    && !!userSample
    && userSample.index === desiredWaypoint.index;

  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    if (!imgEl) {
      return;
    }
    const el = imgEl;
    const parent = el.closest('.clickableImageContainer') as HTMLElement | null;
    const apply = () => {
      if (fitContainer && parent) {
        const box = parent.getBoundingClientRect();
        const ar = NORMALIZED_WIDTH / NORMALIZED_HEIGHT;
        const maxW = Math.max(0, box.width);
        const maxH = Math.max(0, box.height);
        let w = maxW;
        let h = w / ar;
        if (h > maxH && maxH > 0) {
          h = maxH;
          w = h * ar;
        }
        el.style.setProperty('width', `${w}px`, 'important');
        el.style.setProperty('height', `${h}px`, 'important');
        setHeight(h);
      } else {
        el.style.removeProperty('width');
        el.style.removeProperty('height');
        setHeight(el.getBoundingClientRect().height);
      }
    };
    apply();
    const timeoutId = window.setTimeout(apply, 50);
    const timeoutId2 = window.setTimeout(apply, 320);
    window.addEventListener('resize', apply);
    let observer: any;
    if (fitContainer && parent && typeof (window as any).ResizeObserver !== 'undefined') {
      observer = new (window as any).ResizeObserver(apply);
      observer.observe(parent);
    }
    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(timeoutId2);
      window.removeEventListener('resize', apply);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [imgEl, fitContainer]);

  
  const onImageClick = ev => {
    if (!enabled) {
      return;
    }
    
    // ev.clientX gets the x coordinate of the mouse click position on the viewport
    // ev.clientY gets the y coordinate of the mouse click position on the viewport
    const { clientX, clientY } = ev;

    // imgEl.getBoundingClientRect().x gets the x coordinate of the left boundary of the image
    // imgEl.getBoundingClientRect().y gets the y coordinate of the top boundary of the image
    // imgEl.getBoundingClientRect().height gets the height of the image
    const { x, y, height } = imgEl!.getBoundingClientRect();
  
    // offsetX and offsetY represent the coordinates of the mouse click position with the whitespace to the left and top
    // and of the image (between the image and the edges of the viewport) removed
    const offsetX = clientX - x; 
    const offsetY = clientY - y;
    const normOffsetX = offsetX * NORMALIZED_HEIGHT / height; 
    const normOffsetY = offsetY * NORMALIZED_HEIGHT / height;
    
    const index = getNearestIndex([normOffsetX, normOffsetY]);

    // console.log({index, offsetX, offsetY, normOffsetX, normOffsetY, height, NORMALIZED_HEIGHT, width, NORMALIZED_WIDTH}); // for debugging

    if (index == -1) {
      dispatch({ 
        type: Action.SET_SHOW_NOM_INPUT, 
        value: false 
      });
      setPopOver({
        content: 'Please click near the surface of stoss slope!',
        type: PopboxTypeEnum.ERROR
      });
      setTimeout(() => setPopOver(null), POPOVER_TIME);
      return;
    }
    selectLocation(index, offsetX, offsetY, normOffsetX, normOffsetY);
  }

  const selectLocation = (index, offsetX, offsetY, normOffsetX, normOffsetY) => {
    setPopOver(null);
    setClickIndex(index);
    if (offsetX != null) {
      setClickPosition({ left: offsetX, top: offsetY, normOffsetX, normOffsetY });
    }

    if (mode === 'intent') {
      const intentPoint : any = {
        index: index,
        type: 'user',
        measurements: NUM_MEASUREMENTS,
        normOffsetX: sampleLocations[index][0],
        normOffsetY: sampleLocations[index][1],
        isHovered: false
      };
      dispatch({
        type: Action.SET_DESIRED_WAYPOINT,
        value: intentPoint
      });
      dispatch({
        type: Action.SET_DISABLE_SUBMIT_BUTTON,
        value: false
      });
      return;
    }

    if (numImgClicks > 0) {
      dispatch({ 
        type: Action.DELETE_SAMPLE, 
        value: samples.length - 1 
      }); // delete the old row
    }

    dispatch({ 
      type: Action.SET_NUM_IMG_CLICKS, 
      value: numImgClicks + 1 
    });

    const matchedSuggestion = showRobotSuggestions && robotSuggestions
      ? robotSuggestions.find(s => s.index === index)
      : null;
    const matchedPlan = !!(desiredWaypoint && desiredWaypoint.index === index);
    const snappedX = matchedSuggestion
      ? matchedSuggestion.normOffsetX
      : (matchedPlan && desiredWaypoint ? desiredWaypoint.normOffsetX : sampleLocations[index][0]);
    const snappedY = matchedSuggestion
      ? matchedSuggestion.normOffsetY
      : (matchedPlan && desiredWaypoint ? desiredWaypoint.normOffsetY : sampleLocations[index][1]);

    const { shearValues, moistureValues } = getMeasurements(globalState, transectIdx, index, NUM_MEASUREMENTS);
    const newSample : Sample = {
      index: index,
      type: matchedSuggestion ? 'robot' : 'user',
      measurements: NUM_MEASUREMENTS,
      normOffsetX: snappedX,
      normOffsetY: snappedY,
      isHovered: false,
      moisture: moistureValues,
      shear: shearValues
    };
    // Add the new sample to the state
    dispatch({ 
      type: Action.ADD_SAMPLE, 
      value: newSample 
    }); 
    dispatch({
      type: Action.SET_USER_SAMPLE,
      value: newSample
    });
    
    dispatch({ 
      type: Action.SET_DISABLE_SUBMIT_BUTTON, 
      value: false 
    });
  }

  const onTickClick = (ev, index) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!enabled) {
      return;
    }
    const left = sampleLocations[index][0] * height / NORMALIZED_HEIGHT;
    const top = sampleLocations[index][1] * height / NORMALIZED_HEIGHT;
    selectLocation(index, left, top, sampleLocations[index][0], sampleLocations[index][1]);
  }

  return (
    <div id="clickable-image" style={{ position: 'relative' }} >
      <img
        ref={imgHeightRef}
        className={`${fitContainer ? '' : classes.imageDecision} ${enabled ? classes.cross : ''}`}
        id="pos-picker"
        src={diagram}
        onClick={onImageClick}
      />
      {imgEl && height > 0 && sampleLocations.map((loc, index) => {
        const isVisited = visitedIndexes.indexOf(index) !== -1;
        const isHovered = hoveredTick === index;
        return (
          <button
            key={'tick-' + index}
            type="button"
            title={'Sampling location ' + (index + 1)}
            className={`${classes.tick} ${enabled ? classes.tickEnabled : ''} ${isVisited ? classes.tickVisited : ''} ${isHovered ? classes.tickHover : ''}`}
            style={{
              left: loc[0] * height / NORMALIZED_HEIGHT,
              top: loc[1] * height / NORMALIZED_HEIGHT,
            }}
            disabled={!enabled}
            onClick={ev => onTickClick(ev, index)}
            onMouseEnter={() => setHoveredTick(index)}
            onMouseLeave={() => setHoveredTick(-1)}
          />
        );
      })}
      {
        showNOMInput && <AddSamplePopup clickPosition={clickPosition} clickIndex={clickIndex} onAddData={addDataFunc} />
      }
      {
        samples.map((sample, sampleIdx) => {
          if (!imgEl) {
            return null;
          }

          const { index, type, normOffsetX, normOffsetY, isHovered } = sample;
          const isPendingSuggestionPick = showRobotSuggestions
            && userSample
            && sampleIdx === samples.length - 1
            && userSample.index === index
            && suggestionIndexes.indexOf(index) !== -1;
          const isPendingPlanPick = showRobotSuggestions
            && desiredWaypoint
            && userSample
            && sampleIdx === samples.length - 1
            && userSample.index === index
            && desiredWaypoint.index === index;
          if (isPendingSuggestionPick || isPendingPlanPick) {
            return null;
          }
          
          return <PositionIndicator
            key={sampleIdx}
            left={normOffsetX * height / NORMALIZED_HEIGHT}
            top={normOffsetY * height / NORMALIZED_HEIGHT}
            rowIndex={sampleIdx}
            isHovered={isHovered}
            type={type}
            locationIndex={index}
            robot={false}
          />;
        })
      }
      {
        samples.length > 0 && height > 0 && (() => {
          const last = samples[samples.length - 1];
          const placement = getRhexPlacement(
            last.index,
            height,
            !!fitContainer,
            last.normOffsetX,
            last.normOffsetY,
          );
          return (
            <PositionIndicatorRhex
              left={placement.left}
              top={placement.top}
              width={placement.width}
              height={placement.height}
            />
          );
        })()
      }
      {showRobotSuggestions && robotSuggestions &&
        robotSuggestions.map((suggestion, rowIndex) => (
          <PositionIndicator
            key={Number(suggestion.index) + suggestion.normOffsetX + suggestion.normOffsetY}
            left={suggestion.normOffsetX * height / NORMALIZED_HEIGHT}
            top={suggestion.normOffsetY * height / NORMALIZED_HEIGHT}
            rowIndex={rowIndex}
            isHovered={suggestion.isHovered}
            type={suggestion.type}
            locationIndex={suggestion.index}
            robot={true}
            selected={!!userSample && userSample.index === suggestion.index}
          />
        )) 
      }
      {desiredWaypoint && imgEl &&
        <span
          style={{
            position: 'absolute',
            left: desiredWaypoint.normOffsetX * height / NORMALIZED_HEIGHT,
            top: desiredWaypoint.normOffsetY * height / NORMALIZED_HEIGHT,
            transform: 'translate(-50%, -85%)',
            pointerEvents: 'none',
            zIndex: 6,
          }}
          title="Your planned location"
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: planIsSelected ? '2.2rem' : undefined,
              height: planIsSelected ? '2.2rem' : undefined,
              borderRadius: '50%',
              border: planIsSelected ? '2px solid #cc0000' : 'none',
              boxShadow: planIsSelected ? '0 0 0 2px #cc0000' : undefined,
              backgroundColor: planIsSelected ? '#fff' : undefined,
              fontSize: '1.8rem',
              color: '#e65100',
              textShadow: '0 0 3px #fff'
            }}
          >
            ★
          </span>
        </span>
      }
    </div>
  );
}