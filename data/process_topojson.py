import math
import json
import numpy as np
import pandas as pd
from tqdm import tqdm
from collections import defaultdict

fips_states = {}
df = pd.read_csv('src/states_fips.csv')
for i, row in df.iterrows():
    fips_states[row['FIPS']] = row['Name']

FIELDS = {
    'SINGLEZCTAPOP': 'sum',
    'SCI_allschools': 'median'
}
SOURCES = [
    ('real', 'states', 'src/states-10m.topojson'),
    ('hex', 'data', 'gen/cartogram/hex_states.topojson')
]

states_zips = defaultdict(set)
ISOCHRONES = ['30min', '45min', '60min']
for iso in ISOCHRONES:
    df = pd.read_csv('src/zips/ZipLevel.{I}.csv'.format(I=iso))
    groups = df.groupby('YEAR')
    zip_data = {}

    for year, group in groups:
        group = group.where(pd.notnull(group), None)
        for row in tqdm(group.itertuples(), total=len(group), desc='{Y}/{I} ZCTA'.format(Y=year, I=iso)):
            row_data = dict(row._asdict())
            if row_data['ZCTA'] is None: continue
            zipcode = str(int(row_data['ZCTA'])).zfill(5)
            zip_data[zipcode] = {k: row_data[k] for k in FIELDS.keys()}

            fips = row_data['STATEFP']
            state = fips_states[fips]
            states_zips[state].add(zipcode)

        for name, key, path in SOURCES:
            tj = json.load(open(path))
            for f in tqdm(tj['objects'][key]['geometries'], desc='Building topojson'):
                state = f['properties']['name']
                for k, agg in FIELDS.items():
                    vals = [zip_data[z][k] for z in states_zips[state]]
                    vals = [v for v in vals if v is not None]
                    if vals:
                        f['properties'][k] = getattr(np, agg)(vals)
                    else:
                        f['properties'][k] = 0
                    if f['properties'][k] is None or math.isnan(f['properties'][k]):
                        import ipdb; ipdb.set_trace()
            with open('gen/cartogram/{}.Y{}.I{}.topojson'.format(name, year, iso), 'w') as f:
                json.dump(tj, f)