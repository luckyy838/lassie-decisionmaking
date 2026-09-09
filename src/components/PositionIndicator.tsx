import * as React from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { useStateValue, Action } from '../state';
import { RowType, locationColors } from '../constants';

const useStyles = makeStyles(theme => ({
  indicator: {
    display: 'inline-block',
    position: 'absolute',
    cursor: 'default',
    fontSize: '1.2rem',
    fontWeight: 700,
    color: theme.palette.secondary.main,
    '& .dot': {
      content: '""',
      display: 'inline-block',
      //backgroundColor: theme.palette.secondary.main,
      width: 12,
      height: 12,
      borderRadius: 5,
      position: 'absolute'
    },
    '& .triangle': {
      content: '""',
      display: 'inline-block',
      width: 0,
      height: 0,
      borderLeft: '10px solid transparent',
      borderRight: '10px solid transparent',
      borderBottom: `10px solid ${theme.palette.secondary.main}`,
    },
    '& .content': {
      borderRadius: '50%',
      border: '1px solid transparent',
      width: '0.9rem',
      height: '0.9rem',
      lineHeight: '0.85rem',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      backgroundColor: '#fff',
      boxShadow: '0 1px 1px rgba(0,0,0,0.18)',
    }
  },
  current: {
    '& .content': {
      borderColor: 'black',
    }
  },
  hover: {
    '& .content': {
      borderColor: theme.palette.secondary.main,
    }
  },
  selected: {
    '& .content': {
      borderColor: '#cc0000',
      backgroundColor: '#fff',
      color: '#cc0000',
      boxShadow: 'none',
      borderWidth: 1.5,
    },
    '& .dot': {
      display: 'none',
    }
  },
  [RowType.DEVIATE]: {
    '& .dot': {
      // backgroundColor: theme.palette.secondary.main
    },
    '& .content': {
      // color: theme.palette.secondary.main,
      // borderColor: theme.palette.secondary.main
    }
  },
  [RowType.NORMAL]: {

  },
  [RowType.DISCARDED]: {
    '& .content': {
      textDecoration: 'line-through',
    }
  },
  [RowType.ROBOT_SUGGESTION]: {
    '& .dot': {
      backgroundColor: '#cc0000'
    },
    '& .content': {
      color: '#cc0000',
    }
  },
}));

export default function PositionIndicator({ left, top, type, rowIndex, isHovered, locationIndex, robot, selected = false }) {
  const classes = useStyles();
  const theme = useTheme();
  const [globalState, dispatch] = useStateValue();
  const { currSampleIdx } = globalState;
  const isSelected = !!selected;

  const onHover = enterOrLeave => {
    dispatch({
      type: Action.SET_HOVER,
      value: {
        index: rowIndex,
        isHovered: enterOrLeave
      }
    });
  };

  return (
    <span onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}
      className={`${classes.indicator} ${classes[type]}
                  ${rowIndex === currSampleIdx - 1 && type !== RowType.DISCARDED ? classes.current : ''} 
                  ${isHovered ? classes.hover : ''}
                  ${isSelected ? classes.selected : ''}`}
      style={robot
        ? { left, top, transform: 'translate(-50%, 1px)', zIndex: 7, pointerEvents: 'none' }
        : { left, top }}
    >
      {!robot && <span className="dot" style={{ backgroundColor: locationColors[locationIndex] }}></span>}
      {robot && (
        <span
          className="content"
          style={{
            color: isSelected ? '#cc0000' : theme.palette.secondary.main,
            fontSize: 10,
            fontWeight: 700,
            borderColor: isSelected ? '#cc0000' : locationColors[locationIndex],
          }}
        >
          {String.fromCharCode(rowIndex + 65)}
        </span>
      )}
    </span>
  );
}