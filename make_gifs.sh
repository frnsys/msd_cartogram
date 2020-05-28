#!/bin/bash

# Crop hex versions
for dir in cartograms/hex/**; do
    for f in ${dir}/*.png; do
        # `mogrify` is supposed to do this in place but
        # would not, strangely. So use `convert` instead
        convert "$f" -gravity SouthEast -crop 850x500+0+0 +repage "$f"
    done
done

for dir in cartograms/**/**; do
    OUT=${dir/cartograms\//}
    OUT=${OUT/\//_}.gif
    echo $OUT
    convert -delay 10 -loop 0 ${dir}/*.png gifs/$OUT
done