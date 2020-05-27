import json
import topojson
from geojson import FeatureCollection

gj = json.load(open('src/us_states_hexgrid.geojson'))

for feat in gj['features']:
    feat['properties']['name'] = feat['properties']['google_name'].replace(' (United States)', '')

fc = FeatureCollection(gj['features'])
tj = topojson.Topology(fc, prequantize=True, topology=True)

with open('gen/cartogram/hex_states.topojson', 'w') as f:
    f.write(tj.to_json())