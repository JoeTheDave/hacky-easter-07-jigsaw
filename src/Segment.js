import React, { Component, Fragment } from 'react';
import injectSheet from 'react-jss';
import jigsaw from './jigsaw.png';
import data from './data.json';

const styles = {
  segment: {
    width: data.segmentSize,
    height: data.segmentSize,
    backgroundImage: `url('${jigsaw}')`,
    position: 'absolute',
    transition: '0.5s',
    backgroundPosition: (props) => `${props.data.x * data.segmentSize * -1}px ${props.data.y * data.segmentSize * -1}px`,
    left: (props) => props.data.xPos,
    top: (props) => props.data.yPos,
  },
  highlight: {
    width: data.segmentSize,
    height: data.segmentSize,
    zIndex: 100,
    pointerEvents: 'none',
    position: 'absolute',
    transition: '0.5s',
    boxShadow: (props) => `0px 0px 5px 3px ${props.data.selected ? 'white' : props.data.highlight}`,
    left: (props) => props.data.xPos,
    top: (props) => props.data.yPos,
  },
};

class Segment extends Component {

  mouseOverHandler

  handleClick = (e) => {
    this.props.clickHandler(this.props.data.id, e.shiftKey);
  }

  render() {
    const { classes } = this.props;
    return (
      <Fragment>
        <div
          className={classes.segment}
          onClick={this.handleClick}
        />
        <div className={classes.highlight} />
      </Fragment>
    );
  }
}

export default injectSheet(styles)(Segment);
