const Jimp = require('jimp');
const { mapValues, maxBy, omit, sortBy, take } = require('lodash');
const fs = require('fs');
const math = require('mathjs');
const _cliProgress = require('cli-progress');

const imgSrc = 'src/jigsaw.png';
const jsonResultSrc = 'src/data.json';
const imgResultSrc = 'src/result.png';


const deleteOutputFile = () => {
  if (fs.existsSync(imgResultSrc)) {
    fs.unlink(imgResultSrc, (err) => {
      console.log(`Deleting ${imgResultSrc}`);
    });
  }
};

const runProcess = () => {
  deleteOutputFile();
  Jimp.read(imgSrc, function (err, image) {
    if (err) throw err;
  
    const imgWidth = image.bitmap.width;
    const imgHeight = image.bitmap.height;
    const segmentSize = 40;
    const imgSegmentsWide = imgWidth / segmentSize;
    const imgSegmentsTall = imgHeight / segmentSize;
    let imgAnalysis = [];
  
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
      Object.keys(omit(color1, ['a'])).map(key => {
        variance += math.abs(color1[key] - color2[key]);
      })
      return variance;
    };
  
    const compareSegments = (seg1, seg2, edge) => {
      const seg1coords = mapValues(IdToCoordinates(seg1.id), (val) => { return val * segmentSize; });
      const seg2coords = mapValues(IdToCoordinates(seg2.id), (val) => { return val * segmentSize; });
      let variance = 0;
      if (edge === 'north') {
        for (let i = 0; i < segmentSize; i++) {
          const color1x = seg1coords.x + i;
          const color1y = seg1coords.y;
          const color2x = seg2coords.x + i;
          const color2y = seg2coords.y + segmentSize - 1;
          const seg1Color = getColorAtCoords(color1x, color1y);
          const seg2Color = getColorAtCoords(color2x, color2y);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      if (edge === 'east') {
        for (let i = 0; i < segmentSize; i++) {
          const color1x = seg1coords.x + segmentSize - 1;
          const color1y = seg1coords.y + i;
          const color2x = seg2coords.x;
          const color2y = seg2coords.y + i;
          const seg1Color = getColorAtCoords(color1x, color1y);
          const seg2Color = getColorAtCoords(color2x, color2y);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      if (edge === 'south') {
        for (let i = 0; i < segmentSize; i++) {
          const color1x = seg1coords.x + i;
          const color1y = seg1coords.y + segmentSize - 1;
          const color2x = seg2coords.x + i;
          const color2y = seg2coords.y;
          const seg1Color = getColorAtCoords(color1x, color1y);
          const seg2Color = getColorAtCoords(color2x, color2y);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      if (edge === 'west') {
        for (let i = 0; i < segmentSize; i++) {
          const color1x = seg1coords.x;
          const color1y = seg1coords.y + i;
          const color2x = seg2coords.x + segmentSize - 1;
          const color2y = seg2coords.y + i;
          const seg1Color = getColorAtCoords(color1x, color1y);
          const seg2Color = getColorAtCoords(color2x, color2y);
          variance += getColorVariance(seg1Color, seg2Color);
        }
      }
      return variance;
    };

    const buildImgAnalysisDataStructure = () => {
      for (let y = 0; y < imgSegmentsTall; y++) {
        for (let x = 0; x < imgSegmentsWide; x++) {
          imgAnalysis[coordinatesToId(x, y)] = {
            id: coordinatesToId(x, y),
            x,
            y,
            bestNorthNeighbors: [{ id: -1, variance: 100000}],
            bestEastNeighbors: [{ id: -1, variance: 100000}],
            bestSouthNeighbors: [{ id: -1, variance: 100000}],
            bestWestNeighbors: [{ id: -1, variance: 100000}],
          }
        }
      }
    };

    const calculateSegmentMatches = () => {
      const progressBar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_classic);
      progressBar.start(imgAnalysis.length, 0);
    
      for (let segment = 0; segment < imgAnalysis.length; segment++) {
        const currentSegment = imgAnalysis[segment];
  
        for (let alt = 0; alt < imgAnalysis.length; alt++) {
          const testSegment = imgAnalysis[alt];
          if (currentSegment.id === testSegment.id) {
            continue;
          }
  
          const northOptionVariance = compareSegments(currentSegment, testSegment, 'north');
          if (northOptionVariance < maxBy(currentSegment.bestNorthNeighbors, seg => seg.variance).variance) {
            currentSegment.bestNorthNeighbors.push({ id: testSegment.id, variance: northOptionVariance});
            currentSegment.bestNorthNeighbors = take(sortBy(currentSegment.bestNorthNeighbors, seg => seg.variance), 5);
          }
  
          const eastOptionVariance = compareSegments(currentSegment, testSegment, 'east');
          if (eastOptionVariance < maxBy(currentSegment.bestEastNeighbors, seg => seg.variance).variance) {
            currentSegment.bestEastNeighbors.push({ id: testSegment.id, variance: eastOptionVariance});
            currentSegment.bestEastNeighbors = take(sortBy(currentSegment.bestEastNeighbors, seg => seg.variance), 5);
          }
  
          const southOptionVariance = compareSegments(currentSegment, testSegment, 'south');
          if (southOptionVariance < maxBy(currentSegment.bestSouthNeighbors, seg => seg.variance).variance) {
            currentSegment.bestSouthNeighbors.push({ id: testSegment.id, variance: southOptionVariance});
            currentSegment.bestSouthNeighbors = take(sortBy(currentSegment.bestSouthNeighbors, seg => seg.variance), 5);
          }
  
          const westOptionVariance = compareSegments(currentSegment, testSegment, 'west');
          if (westOptionVariance < maxBy(currentSegment.bestWestNeighbors, seg => seg.variance).variance) {
            currentSegment.bestWestNeighbors.push({ id: testSegment.id, variance: westOptionVariance});
            currentSegment.bestWestNeighbors = take(sortBy(currentSegment.bestWestNeighbors, seg => seg.variance), 5);
          }
        }
        progressBar.update(segment);
      }
      progressBar.stop();
    };

    const writeJsonDataToFile = () => {
      fs.writeFile(`./${jsonResultSrc}`, JSON.stringify({
        imgAnalysis,
        segmentSize,
        imgSegmentsWide,
        imgSegmentsTall,
      }, null, 2) , 'utf-8');
    };

    const readFileToJsonData = () => {
      const data = JSON.parse(fs.readFileSync(jsonResultSrc, 'utf8'));
      imgAnalysis = data.imgAnalysis;
    };

    const linkNeighbors = () => {
      const linkNeighborsGroup = (group) => group.forEach((neighbor) => { neighbor.ref = imgAnalysis[neighbor.id]; });
      imgAnalysis.forEach((segment) => {
        linkNeighborsGroup(segment.bestNorthNeighbors);
        linkNeighborsGroup(segment.bestEastNeighbors);
        linkNeighborsGroup(segment.bestSouthNeighbors);
        linkNeighborsGroup(segment.bestWestNeighbors);
        segment.northNeighbor = null;
        segment.eastNeighbor = null;
        segment.southNeighbor = null;
        segment.westNeighbor = null;
      })
    };

    if (!fs.existsSync(jsonResultSrc)) {
      buildImgAnalysisDataStructure();
      calculateSegmentMatches();
      writeJsonDataToFile();
    } else {
      readFileToJsonData();
    }
    linkNeighbors();
    // neighbors should be calculated at this point
    
    new Jimp(imgWidth, imgHeight, 0xFF0000FF, function (err, resultImage) {
      const newImageMatrix = [];
      const matchCombosIds = [
        { seg: 0, nei: 0 },
        { seg: 0, nei: 1 },
        { seg: 1, nei: 0 },
        { seg: 1, nei: 1 },
        { seg: 0, nei: 2 },
        { seg: 2, nei: 0 },
        { seg: 1, nei: 2 },
        { seg: 2, nei: 1 },
        { seg: 2, nei: 2 },
        { seg: 0, nei: 3 },
        { seg: 3, nei: 0 },
        { seg: 1, nei: 3 },
        { seg: 3, nei: 1 },
        { seg: 2, nei: 3 },
        { seg: 3, nei: 2 },
        { seg: 3, nei: 3 },
        { seg: 0, nei: 4 },
        { seg: 4, nei: 0 },
        { seg: 1, nei: 4 },
        { seg: 4, nei: 1 },
        { seg: 2, nei: 4 },
        { seg: 4, nei: 2 },
        { seg: 3, nei: 4 },
        { seg: 4, nei: 3 },
        { seg: 4, nei: 4 },
      ];

      const constructImageMatrix = () => {
        for (let x = 0; x < imgSegmentsWide; x++) {
          newImageMatrix.push([]);
          for (let y = 0; y < imgSegmentsTall; y++) {
            newImageMatrix[x][y] = null;
          }
        }
      };

      const establishSegmentMatch = (segment, direction, reverse) => {
        if (!segment[`${direction.toLowerCase()}Neighbor`]) {
          for (i = 0; i < matchCombosIds.length; i++) {
            const combo = matchCombosIds[i];
            const neighbor = segment[`best${direction}Neighbors`][combo.seg].ref;
            if (segment.id === neighbor[`best${reverse}Neighbors`][combo.nei].id) {
              segment[`${direction.toLowerCase()}Neighbor`] = neighbor;
              neighbor[`${reverse.toLowerCase()}Neighbor`] = segment;
              break;
            }
          }
        }
      };

      const organizeImageSegments = () => {
        imgAnalysis.forEach((segment) => {
          establishSegmentMatch(segment, 'North', 'South');
          establishSegmentMatch(segment, 'East', 'West');
          establishSegmentMatch(segment, 'South', 'North');
          establishSegmentMatch(segment, 'West', 'East');
        });

        const northEmpties = imgAnalysis.filter((seg) => !seg.northNeighbor);
        const eastEmpties = imgAnalysis.filter((seg) => !seg.eastNeighbor);
        const southEmpties = imgAnalysis.filter((seg) => !seg.southNeighbor);
        const westEmpties = imgAnalysis.filter((seg) => !seg.westNeighbor);
        const northWestEmpties = imgAnalysis.filter((seg) => !seg.northNeighbor && !seg.westNeighbor);

        // This strategy is not yielding what I had hoped.
      };

      const writeImageMatrixToFile = () => {
        for (let x = 0; x < imgSegmentsWide; x++) {
          for (let y = 0; y < imgSegmentsTall; y++) {
            if (newImageMatrix[x][y]) {
              const segmentCoords = mapValues(IdToCoordinates(newImageMatrix[x][y].id), (coord) => { return coord * segmentSize; });
              for (let imgY = 0; imgY < 40; imgY++) {
                for (let imgX = 0; imgX < 40; imgX++) {
                  const color = image.getPixelColor(segmentCoords.x + imgX, segmentCoords.y + imgY);      // returns the colour of that pixel e.g. 0xFFFFFFFF 
                  resultImage.setPixelColor(color, x * segmentSize + imgX, y * segmentSize + imgY);
                }
              }
            }
          }
        }
        resultImage.write(resultSrc);
      };

      constructImageMatrix();
      organizeImageSegments();
      writeImageMatrixToFile();
    });
  });
};

runProcess();
