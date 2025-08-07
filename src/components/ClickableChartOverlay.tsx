// components/ClickableChartOverlay.tsx
import * as React from 'react';
import { useState, useLayoutEffect, useCallback } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { useStateValue, Action } from '../state';
import PositionIndicator from './PositionIndicator';
import { NORMALIZED_HEIGHT } from '../constants';

const useStyles = makeStyles({
  image: {
    borderRadius: 4,
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.3)",
    width: '100%',
    display: 'block',
    margin: 'auto',
  },
  overlay: {
    position: 'relative',
    width: '70vw',
    margin: 'auto',
    cursor: 'crosshair',
  }
});

export default function ClickableChartOverlay() {
  const classes = useStyles();
  const [imgEl, setImgEl] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  const [{ userSamples }, dispatch] = useStateValue();

  const handleRef = useCallback((node: HTMLDivElement) => {
    if (node) setImgEl(node);
  }, []);

  useLayoutEffect(() => {
    if (imgEl) {
      setHeight(imgEl.getBoundingClientRect().height);
    }
  }, [imgEl]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgEl) return;

    const { x, y, height } = imgEl.getBoundingClientRect();
    const offsetX = e.clientX - x;
    const offsetY = e.clientY - y;

    const normOffsetX = offsetX * NORMALIZED_HEIGHT / height;
    const normOffsetY = offsetY * NORMALIZED_HEIGHT / height;

    // Store or process clicked point
    dispatch({
      type: Action.SET_SELECTED_POINT_FROM_CHART,
      value: { normOffsetX, normOffsetY }
    });
  };

  // You can later replace this with chart-derived points
  const mockPoints = userSamples.map((sample, i) => ({
    ...sample,
    left: sample.normOffsetX * height / NORMALIZED_HEIGHT,
    top: sample.normOffsetY * height / NORMALIZED_HEIGHT
  }));

  return (
    <div className={classes.overlay} ref={handleRef} onClick={onClick}>
      <div style={{ position: 'relative', height: height || '500px' }}>
        {mockPoints.map((pt, idx) => (
          <PositionIndicator
            key={idx}
            left={pt.left}
            top={pt.top}
            rowIndex={idx}
            isHovered={false}
            type={'user'}
            locationIndex={pt.index}
            robot={false}
          />
        ))}
      </div>
    </div>
  );
}
