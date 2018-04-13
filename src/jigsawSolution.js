const Jimp = require('jimp');
const { mapValues, min } = require('lodash');
const fs = require('fs');
const math = require('mathjs');
const _cliProgress = require('cli-progress');

const imgSrc = 'src/jigsaw.png';
const resultSrc = 'src/result.png';

const deleteOutputFile = () => {
  fs.unlink(resultSrc, (err) => {
    console.log(`Deleting ${resultSrc}`);
  });
};

const runProcess = () => {
  deleteOutputFile();
  Jimp.read(imgSrc, function (err, image) {
    if (err) throw err;
  
    const imgWidth = image.bitmap.width;
    const imgHeight = image.bitmap.height;
  
    const segmentSize = 40;
    const confidenceThreashold = 2500;
  
    const imgSegmentsWide = imgWidth / segmentSize;
    const imgSegmentsTall = imgHeight / segmentSize;

    const imgAnalysis = [];
  
    const coordinatesToId = (x, y) => {
      return (y * imgSegmentsWide) + x;
    };
  
    const IdToCoordinates = (id) => {
      return {
        x: id % imgSegmentsWide,
        y: math.floor(id / imgSegmentsWide),
      };
    };

    const getColorAtCoords = (x, y) => {
      return Jimp.intToRGBA(image.getPixelColor(x, y))
    };

    const getColorVariance = (color1, color2) => {
      let variance = 0;
      Object.keys(color1).map(key => {
        variance += math.abs(color1[key] - color2[key]);
      })
      return variance;
    }
  
    const compareSegments = (seg1, seg2, edge) => {
      const seg1coords = mapValues(IdToCoordinates(seg1.id), (val) => { return val * segmentSize; });
      const seg2coords = mapValues(IdToCoordinates(seg2.id), (val) => { return val * segmentSize; });
      let variance = 0;
      if (edge === 'north') {
        for (let i = 0; i < segmentSize; i++) {
          seg1Color = getColorAtCoords(seg1coords.x + i, seg1coords.y);
          seg2Color = getColorAtCoords(seg2coords.x + i, seg2coords.y + segmentSize - 1);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      if (edge === 'east') {
        for (let i = 0; i < segmentSize; i++) {
          seg1Color = getColorAtCoords(seg1coords.x  + segmentSize - 1, seg1coords.y + i);
          seg2Color = getColorAtCoords(seg2coords.x, seg2coords.y + i);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      if (edge === 'south') {
        for (let i = 0; i < segmentSize; i++) {
          seg1Color = getColorAtCoords(seg1coords.x + i, seg1coords.y + segmentSize - 1);
          seg2Color = getColorAtCoords(seg2coords.x + i, seg2coords.y);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      if (edge === 'west') {
        for (let i = 0; i < segmentSize; i++) {
          seg1Color = getColorAtCoords(seg1coords.x, seg1coords.y + i);
          seg2Color = getColorAtCoords(seg2coords.x  + segmentSize - 1, seg2coords.y + i);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      return variance;
    };

    const assignSegmentToImageMatrix = (matrix, segment, x, y) => {
      matrix[x][y] = segment;
      if (x + 1 < 32 && matrix[x + 1][y] === null) {
        assignSegmentToImageMatrix(matrix, segment.eastOptions[0], x + 1, y);
      }
      // if (y - 1 > -1 && matrix[x][y - 1] === null) {
      //   assignSegmentToImageMatrix(matrix, segment.northOptions[0], x, y - 1);
      // }
      // if (y + 1 < 18 && matrix[x][y + 1] === null) {
      //   assignSegmentToImageMatrix(matrix, segment.southOptions[0], x, y + 1);
      // }
      // if (x - 1 > -1 && matrix[x - 1][y] === null) {
      //   assignSegmentToImageMatrix(matrix, segment.westOptions[0], x - 1, y);
      // }
    };
  
    const writeSegmentToImageAtCoords = (resultImage, segment, coords) => {
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
          const segmentCoords = mapValues(IdToCoordinates(segment.id), (val) => { return val * segmentSize; });
          const color = image.getPixelColor(segmentCoords.x + x, segmentCoords.y + y);      // returns the colour of that pixel e.g. 0xFFFFFFFF 
          resultImage.setPixelColor(color, coords.x + x, coords.y + y);
        }
      }
    };
  
    for (let y = 0; y < imgSegmentsTall; y++) {
      for (let x = 0; x < imgSegmentsWide; x++) {
        imgAnalysis[coordinatesToId(x, y)] = {
          id: coordinatesToId(x, y),
          northOptions: [],
          eastOptions: [],
          southOptions: [],
          westOptions: [],
        }
      }
    }

    console.log('Calculating match options');
    const progressBar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic);
    progressBar.start(imgAnalysis.length, 0);
  
    for (let segment = 0; segment < imgAnalysis.length; segment++) {
      const currentSegment = imgAnalysis[segment];
      let bestNorthNeighbor = {};
      let bestEastNeighbor = {};
      let bestSouthNeighbor = {};
      let bestWestNeighbor = {};
      for (let alt = 0; alt < imgAnalysis.length; alt++) {
        const testSegment = imgAnalysis[alt];
        if (currentSegment.id === testSegment.id) {
          continue;
        }

        const northOptionVariance = compareSegments(currentSegment, testSegment, 'north');
        if (northOptionVariance < (bestNorthNeighbor.variance || 100000)) {
          bestNorthNeighbor = { segment: testSegment, variance: northOptionVariance };
        }

        const eastOptionVariance = compareSegments(currentSegment, testSegment, 'east');
        if (eastOptionVariance < (bestEastNeighbor.variance || 100000)) {
          bestEastNeighbor = { segment: testSegment, variance: eastOptionVariance };
        }

        const southOptionVariance = compareSegments(currentSegment, testSegment, 'north');
        if (southOptionVariance < (bestSouthNeighbor.variance || 100000)) {
          bestSouthNeighbor = { segment: testSegment, variance: southOptionVariance };
        }

        const westOptionVariance = compareSegments(currentSegment, testSegment, 'north');
        if (westOptionVariance < (bestWestNeighbor.variance || 100000)) {
          bestWestNeighbor = { segment: testSegment, variance: westOptionVariance };
        }
      }
      progressBar.update(segment);
      currentSegment.northOptions.push(bestNorthNeighbor.segment);
      currentSegment.eastOptions.push(bestEastNeighbor.segment);
      currentSegment.southOptions.push(bestSouthNeighbor.segment);
      currentSegment.westOptions.push(bestWestNeighbor.segment);
    }
    progressBar.stop();

    // neighbors should be calculated at this point
    new Jimp(imgWidth, imgHeight, 0xFF0000FF, function (err, resultImage) {
      const newImageMatrix = [];
      for (let x = 0; x < 32; x++) {
        newImageMatrix.push([])
        for (let y = 0; y < 18; y++) {
          newImageMatrix[x][y] = null;
        }
      }

      let targetSegment = imgAnalysis[320]
      for (let y = 0; y < 18; y++) {
        assignSegmentToImageMatrix(newImageMatrix, targetSegment, 0, y);
        targetSegment = targetSegment.southOptions[0];
      }


      for (let x = 0; x < 32; x++) {
        newImageMatrix.push([])
        for (let y = 0; y < 18; y++) {
          writeSegmentToImageAtCoords(resultImage, newImageMatrix[x][y], { x: x * 40, y: y * 40 });
        }
      }



      resultImage.write(resultSrc);
    });

  });
};

module.exports = {
  deleteOutputFile, 
  runProcess,
};



