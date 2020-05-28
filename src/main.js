import * as d3 from 'd3';
import JSZip from 'jszip';
import {saveAs} from 'filesaver.js';
import Cartogram from 'cartogram-chart';
import {svgAsPngUri} from 'save-svg-as-png';

let zip = new JSZip();
let folder = zip.folder('cartograms');

let types = ['real', 'hex'];
let years = [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017];
let isos = ['30min', '45min', '60min'];
let keys = types.flatMap((type) => years.flatMap((year) => isos.flatMap((iso) => `${type}.Y${year}.I${iso}`)));

let folders = {};
let isoFolders = {};
types.forEach((type) => {
  folders[type] = folder.folder(type);
  isos.forEach((iso) => {
    isoFolders[`${type}.I${iso}`] = folders[type].folder(iso);
  });
});

function renderNextCartogram() {
  if (keys.length > 0) {
    let key = keys.pop();
    renderCartogram(key);

    // Wait for render
    setTimeout(() => {
      svgAsPngUri(document.getElementsByTagName('svg')[0], {
        backgroundColor: '#ffffff'
      }).then((uri) => {
        let parts = key.split('.');
        let folder = isoFolders[`${parts[0]}.${parts[2]}`];
        folder.file(`${key}.png`, uri.split(',')[1], {base64: true});
        renderNextCartogram();
      });
    }, 3000);
  } else {
    zip.generateAsync({type: 'blob'})
      .then(function(content) {
        saveAs(content, 'cartograms.zip');
      });
  }
}

function renderCartogram(key) {
  let obj = key.startsWith('hex') ? 'data' : 'states';
  d3.select('svg').remove();
  d3.json(`/data/gen/cartogram/${key}.topojson`, (error, topojson) => {
    if (error) throw error;

    const colorScale = d3.scaleLinear()
      .domain([0, Math.max(...topojson.objects[obj].geometries.map(getColorProp))])
      .range(['white', 'blue']);

    let scale = key.startsWith('hex') ? 450 : 300;
    Cartogram()
      .width(650)
      .height(500)
      .projection(d3.geoMercator().scale(scale).center([-90, 50]))
      .topoJson(topojson)
      .topoObjectName(obj)
      .value(getSizeProp)
      .color(f => colorScale(getColorProp(f)))
      .label(({ properties: p }) => `${p['name']}, SCI:${p['SCI_allschools']}`)
      .units(' Population')
      .valFormatter(d3.format(',.0f'))
      (document.getElementById('stage'));

    function getColorProp({ properties: p }) {
      return p['SCI_allschools'];
    }

    function getSizeProp({ properties: p }) {
      // Must be non-zero
      return Math.max(p['SINGLEZCTAPOP'], 1e6);
    }

    d3.select('svg').append('text')
      .attr('text-anchor', 'end')
      .attr('dy', 495)
      .attr('dx', 650)
      .text(key.replace(/^\w+\./, ''));
  });
}

renderNextCartogram();
