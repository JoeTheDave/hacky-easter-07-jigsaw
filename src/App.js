import React, { Component } from 'react';
import injectSheet from 'react-jss';
import logo from './logo.svg';
import data from './data.json';
import Segment from './Segment';

const arrowStyles = {
  position: 'absolute',
  width: 0,
  height: 0,
  borderTop: 'solid 15px black',
  borderLeft: 'solid 15px transparent',
  borderRight: 'solid 15px transparent',
  borderBottom: 'solid 0px transparent',
  zIndex: 200,
  cursor: 'pointer',
};

const styles = {
  app: {
    textAlign: 'center',
  },
  appLogo: {
    animation: 'app-logo-spin infinite 20s linear',
    height: 80,
  },
  appHeader: {
    backgroundColor: '#222',
    height: 150,
    padding: 20,
    color: 'white',
  },
  appTitle: {
    fontSize: 20,
  },
  '@keyframes app-logo-spin': {
    'from': { transform: 'rotate(0deg)' },
    'to': { transform: 'rotate(360deg)' },
  },
  imgContainer: {
    border: 'solid 1px gray',
    width: data.imgSegmentsWide * data.segmentSize,
    height: data.imgSegmentsTall * data.segmentSize,
    margin: [20, 'auto'],
    position: 'relative',
  },
  legend: {
    border: 'solid 2px white',
    width: 70,
    position: 'absolute',
    top: 20,
    left: 20,
    textAlign: 'left',
    padding: 20,
  },
  shiftUp: {
    ...arrowStyles,
    top: -20,
    left: 625,
    transform: 'rotate(180deg)',
  },
  shiftRight: {
    ...arrowStyles,
    top: 352,
    left: 1278,
    transform: 'rotate(-90deg)',
  },
  shiftDown: {
    ...arrowStyles,
    top: 726,
    left: 625,
  },
  shiftLeft: {
    ...arrowStyles,
    top: 352,
    left: -28,
    transform: 'rotate(90deg)',
  },
};

data.imgAnalysis.forEach(seg => {
  seg.xPos = (data.imgSegmentsWide * data.segmentSize / 2);
  seg.yPos = (data.imgSegmentsTall * data.segmentSize / 2);
  seg.highlight = 'transparent';
  seg.selected = false;
  seg.refSelected = false;
  seg.matchConfidence = null;
});

class App extends Component {
  state = data;

  componentDidMount() {
    setTimeout(() => {
      const segments = this.state.imgAnalysis;
      this.setState({
        imgAnalysis: segments.map(seg => ({
          ...seg,
          xPos: seg.x * data.segmentSize,
          yPos: seg.y * data.segmentSize,
      }))});
    }, 500)
  }

  segmentClickHandler = (id, isShiftClicked) => {
    const newState = this.state;
    console.log(newState);
    if (isShiftClicked) {
      newState.imgAnalysis.forEach((seg) => {
        if (seg.id === id) {
          seg.refSelected = !seg.refSelected;
          seg.highlight = seg.refSelected ? 'purple' : 'transparent';
        } else {
          seg.refSelected = false;
          seg.highlight = 'transparent';
        }
      });
      const target = newState.imgAnalysis[id];
      const setNeighbors = (neighbors, color) => { neighbors.forEach((neighbor) => { newState.imgAnalysis[neighbor.id].highlight = color; }) };
      if (target.refSelected) {
        setNeighbors(target.bestNorthNeighbors, 'yellow');
        setNeighbors(target.bestEastNeighbors, 'blue');
        setNeighbors(target.bestSouthNeighbors, 'orange');
        setNeighbors(target.bestWestNeighbors, 'cyan');
      }
    } else {
      if (newState.imgAnalysis[id].selected) {
        newState.imgAnalysis[id].selected = false;
      } else {
        newState.imgAnalysis[id].selected = true;
        const altSelection = newState.imgAnalysis.find(seg => seg.selected & seg.id !== id);
        if (altSelection) {
          const x = newState.imgAnalysis[id].xPos;
          const y = newState.imgAnalysis[id].yPos;
          newState.imgAnalysis[id].xPos = newState.imgAnalysis[altSelection.id].xPos;
          newState.imgAnalysis[id].yPos = newState.imgAnalysis[altSelection.id].yPos;
          newState.imgAnalysis[altSelection.id].xPos = x;
          newState.imgAnalysis[altSelection.id].yPos = y;
          newState.imgAnalysis[id].selected = false;
          newState.imgAnalysis[altSelection.id].selected = false;
        }
      }
    }
    this.setState(newState);
  }

  shiftUp = () => {
    const newState = this.state;
    newState.imgAnalysis.forEach((seg) => {
      seg.yPos -= 40;
      if (seg.yPos < 0) { seg.yPos = 680; }
    });
    this.setState(newState);
  };

  shiftRight = () => {
    const newState = this.state;
    newState.imgAnalysis.forEach((seg) => {
      seg.xPos += 40;
      if (seg.xPos > 1240) { seg.xPos = 0; }
    });
    this.setState(newState);
  };

  shiftDown = () => {
    const newState = this.state;
    newState.imgAnalysis.forEach((seg) => {
      seg.yPos += 40;
      if (seg.yPos > 680) { seg.yPos = 0; }
    });
    this.setState(newState);
  };

  shiftLeft = () => {
    const newState = this.state;
    newState.imgAnalysis.forEach((seg) => {
      seg.xPos -= 40;
      if (seg.xPos < 0) { seg.xPos = 1240; }
    });
    this.setState(newState);
  };

  render() {
    // console.log(this.state);
    const { classes } = this.props;
    return (
      <div className={classes.app}>
        <header className={classes.appHeader}>
          <img src={logo} className={classes.appLogo} alt="logo" />
          <h1 className={classes.appTitle}>Hacky Easter 2018 - 07: Jigsaw</h1>
          <div className={classes.legend}>
            <div style={{ color: 'yellow' }}>North</div>
            <div style={{ color: 'blue' }}>East</div>
            <div style={{ color: 'orange' }}>South</div>
            <div style={{ color: 'cyan' }}>West</div>
          </div>
        </header>

        <div className={classes.imgContainer}>
          <div className={classes.shiftUp} onClick={this.shiftUp} />
          <div className={classes.shiftRight} onClick={this.shiftRight} />
          <div className={classes.shiftDown} onClick={this.shiftDown} />
          <div className={classes.shiftLeft} onClick={this.shiftLeft} />
          {this.state.imgAnalysis.map(seg =>
            <Segment
              key={`segment-${seg.id}`}
              data={seg}
              clickHandler={this.segmentClickHandler}
            />
          )}
        </div>
      </div>
    );
  }
}

export default injectSheet(styles)(App);
