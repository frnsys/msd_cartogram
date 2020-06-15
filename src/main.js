import * as d3 from 'd3';
import JSZip from 'jszip';
import {saveAs} from 'filesaver.js';
import Cartogram from 'cartogram-chart';
import {svgAsPngUri} from 'save-svg-as-png';

const url = new URL(window.location.href);
const rec = url.searchParams.get('record') !== null;

let zip = new JSZip();
let folder = zip.folder('cartograms');

let types = ['real', 'hex'];
let years = [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017];
let isos = ['30min', '45min', '60min'];
let keys = types.flatMap((type) => years.flatMap((year) => isos.flatMap((iso) => `${type}.Y${year}.I${iso}`)));
let ratios = {};

// Have no schools/missing data, so skip
const skip = ['Commonwealth of the Northern Mariana Islands', 'United States Virgin Islands'];

let folders = {};
let isoFolders = {};
types.forEach((type) => {
  folders[type] = folder.folder(type);
  isos.forEach((iso) => {
    isoFolders[`${type}.I${iso}`] = folders[type].folder(iso);
  });
});

// const sizeProp = 'SINGLEZCTAPOP';
const sizeProp = 'ENROLLED';
const sizeLabel = sizeProp == 'SINGLEZCTAPOP' ? 'Population' : 'Enrollment';
const sizeLegendVals = sizeProp == 'SINGLEZCTAPOP' ? [1e6, 5e6, 10e6] : [100e3, 500e3, 1e6];
const sizeDefault = sizeProp == 'SINGLEZCTAPOP' ? 1e6 : 1;

/* https://stackoverflow.com/a/10601315 */
function intToString(value) {
    var suffixes = ["", "k", "m", "b","t"];
    var suffixNum = Math.floor((""+value).length/3);
    var shortValue = parseFloat((suffixNum != 0 ? (value / Math.pow(1000,suffixNum)) : value).toPrecision(2));
    if (shortValue % 1 != 0) {
        shortValue = shortValue.toFixed(1);
    }
    return (shortValue+suffixes[suffixNum]).replace(/^0+/, '');
}

function renderNextCartogram() {
  if (keys.length > 0) {
    let key = keys.pop();
    renderCartogram(key);

    // Wait for render
    setTimeout(() => {
      if (rec) {
        svgAsPngUri(document.getElementsByTagName('svg')[0], {
          backgroundColor: '#ffffff'
        }).then((uri) => {
          let parts = key.split('.');
          let folder = isoFolders[`${parts[0]}.${parts[2]}`];
          folder.file(`${key}.png`, uri.split(',')[1], {base64: true});
          renderNextCartogram();
        });
      } else {
        renderNextCartogram();
      }
    }, 8000);
  } else {
    if (rec) {
      zip.generateAsync({type: 'blob'})
        .then(function(content) {
          saveAs(content, 'cartograms.zip');
        });
    }
  }
}

function renderCartogram(key) {
  let hex = key.startsWith('hex');
  let obj = hex ? 'data' : 'states';

  d3.select('svg').remove();
  d3.json(`/data/gen/cartogram/${key}.topojson`, (error, topojson) => {
    if (error) throw error;

    const upper = Math.max(...topojson.objects[obj].geometries.map(getColorProp));
    const colorScale = d3.scaleLinear()
      .domain([0, upper * 0.3, upper])
      .range(['#43CC70', '#EFD71E', '#9B150C']);

    let scale = hex ? 450 : 300;
    let carto = Cartogram()
      .width(650)
      .height(500)
      .iterations(100)
      .animationDuration(0)
      .projection(d3.geoMercator().scale(scale).center([-90, 50]))
      .topoJson(topojson)
      .topoObjectName(obj)
      .value(getSizeProp)
      .color(f => colorScale(getColorProp(f)))
      .label(({ properties: p }) => `${p['name']}, SCI:${p['SCI_allschools']}`)
      .units(` ${sizeLabel}`)
      .valFormatter(d3.format(',.0f'));
    carto(document.getElementById('stage'));

    let topY = hex ? 150 : 50;

    // Need to wait for the calculations to finish
    setTimeout(() => {
      if (ratios[hex] === undefined) {
        let state = carto.getState();

        let ratioTotal = 0;
        const topoObject = state.topoJson.objects[state.topoObjectName];
        let features = state.cartogram
            .iterations(state.iterations) // distort all features
            (state.topoJson, topoObject.geometries).features;
        features.forEach((feat) => {
          if (!skip.includes(feat.properties['name'])) {
            let area = state.cartogram.path.area(feat);
            let ratio = area/getSizeProp(feat);
            ratioTotal += ratio;
            console.log(`${feat.properties['name']} area:${area} sizeProp:${getSizeProp(feat)} ratio:${ratio}`);
          }
        });
        ratios[hex] = ratioTotal/features.length;
      }
      let startX = hex ? 290: 305;
      let x = startX;
      let y = topY + 10;
      let xPadding = 5;
      let side;
      sizeLegendVals.forEach((v) => {
        let area = ratios[hex] * v;
        side = Math.sqrt(area);
        let rect = d3.select('svg').append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', side)
          .attr('height', side)
          .style('fill', '#61CE62');
        d3.select('svg').append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('dx', x + side/2)
          .attr('dy', y + side/2)
          .style('font-size', '9px')
          .text(intToString(v));
        x += side + xPadding;
      });
      d3.select('svg').append('text')
        .attr('dx', startX)
        .attr('dy', y + side + 10)
        .style('font-size', '9px')
        .text(sizeLabel);
    }, 100);

    function getColorProp({ properties: p }) {
      return p['SCI_allschools'];
    }

    function getSizeProp({ properties: p }) {
      // Must be non-zero
      return p[sizeProp] == 0 || p[sizeProp] == undefined ? sizeDefault : p[sizeProp];
    }

    let gradient = d3.select('svg').append('defs')
      .append('linearGradient')
      .attr('id', 'gradient')
      .attr('x1', '0%') // bottom
      .attr('y1', '0%')
      .attr('x2', '100%') // to top
      .attr('y2', '0%')
      .attr('spreadMethod', 'pad');

    [...Array(100).keys()].forEach(function(d) {
      let p = d/100;
      let v = upper * p;
      gradient.append('stop')
        .attr('offset', `${d}%`)
        .attr('stop-color', colorScale(v))
        .attr('stop-opacity', 1);
    });

    let leftX = hex ? 210 : 125;

    d3.select('svg').append('text')
      .attr('text-anchor', 'end')
      .attr('dy', topY)
      .attr('dx', 645)
      .text('US Higher Education Concentration');

    d3.select('svg').append('rect')
      .attr('x', 445)
      .attr('y', topY + 10)
      .attr('width', 200)
      .attr('height', 12)
      .style('fill', 'url(#gradient)');

    d3.select('svg').append('text')
      .attr('text-anchor', 'end')
      .attr('dy', topY + 20)
      .attr('dx', 440)
      .style('font-size', '12px')
      .text('SCI');

    d3.select('svg').append('text')
      .attr('text-anchor', 'end')
      .attr('dy', topY + 35)
      .attr('dx', 455)
      .style('font-size', '12px')
      .text('0');

    d3.select('svg').append('text')
      .attr('text-anchor', 'end')
      .attr('dy', topY + 35)
      .attr('dx', 645)
      .style('font-size', '12px')
      .text('10000');

    d3.select('svg').append('text')
      .attr('text-anchor', 'end')
      .attr('dy', 495)
      .attr('dx', 645)
      .text(key.replace(/^\w+\./, ''));

    d3.select('svg').append('text')
      .attr('text-anchor', 'end')
      .attr('dy', 495)
      .attr('dx', leftX)
      .style('fill', '#aaa')
      .style('font-size', '10px')
      .text('Francis Tseng/JFI');
  });
}

renderNextCartogram();
