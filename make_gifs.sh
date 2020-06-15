#!/bin/bash

# Crop hex versions
for dir in cartograms/hex/**; do
    for f in ${dir}/*.png; do
        # `mogrify` is supposed to do this in place but
        # would not, strangely. So use `convert` instead
        convert "$f" -gravity SouthEast -crop 825x550+0+0 +repage "$f"
    done
done

# Crop real versions
for dir in cartograms/real/**; do
    for f in ${dir}/*.png; do
        # `mogrify` is supposed to do this in place but
        # would not, strangely. So use `convert` instead
        convert "$f" -gravity SouthEast -crop 950x700+0+0 +repage "$f"
    done
done


for dir in cartograms/**/**; do
    OUT=${dir/cartograms\//}
    OUT=${OUT/\//_}.gif
    echo $OUT
    LAST=$(ls ${dir}/*.png | tail -n 1)
    convert -delay 50 -loop 0 ${dir}/*.png -delay 200 $LAST gifs/$OUT
done