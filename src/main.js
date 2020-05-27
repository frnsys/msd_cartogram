import * as d3 from 'd3';
import Cartogram from 'cartogram-chart';

// d3.json('/data/gen/cartogram/hex_states.topojson', (error, topojson) => {
//   Cartogram()
//     .projection(d3.geoMercator().scale(250).center([-60, 40]))
//     .topoJson(topojson)
//     .topoObjectName('data')
//     .value(() => Math.random() * 1000 + 1)
//     (document.getElementById('stage'));
// });

// const key = 'states';
// d3.json('/data/gen/cartogram/real.Y2008.I30min.topojson', (error, topojson) => {
const key = 'data';
d3.json('/data/gen/cartogram/hex.Y2008.I30min.topojson', (error, topojson) => {
  if (error) throw error;

  const colorScale = d3.scaleLinear()
    .domain([0, Math.max(...topojson.objects[key].geometries.map(getColorProp))])
    .range(['white', 'blue']);

  Cartogram()
    .projection(d3.geoMercator().scale(250).center([-60, 40]))
    .topoJson(topojson)
    .topoObjectName(key)
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
});
