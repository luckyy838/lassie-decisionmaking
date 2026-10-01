import * as React from 'react';
import "../styles/positionIndicatorRhex.scss";

const rhexImage = require('../../assets/sprint_symbol.png');

interface RhexProps {
  left: number;
  top: number;
  width?: number;
  height?: number;
}

export default function PositionIndicatorRhex({ left, top, width, height }: RhexProps) {
  const usePixelSize = width != null && height != null;
  return (
      <div className="rhex-icon" style={{ left, top, zIndex: 8 }}>
          <img
            className="rhex-icon"
            src={rhexImage}
            style={usePixelSize ? { width, height, objectFit: 'contain' } : undefined}
            {...(!usePixelSize ? { width: '25vw', height: '20vh' } : {})}
          />
      </div>
  );
}
