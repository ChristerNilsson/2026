import {echo, Knight} from "./game.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

game = new Knight ["x1+:y2+","x2+:y1+","x2+:y1-","x1+:y2-","x1-:y2-","x2-:y1-","x2-:y1+","x1-:y2+"], 1,8,8,6
echo game
game.instructions() 
#game = Knight(["x1+:y2+","x2+:y1+","x2+:y1-","x1+:y2-","x1-:y2-","x2-:y1-","x2-:y1+","x1-:y2+"], 1,16,16,12)

path = game.solve game.start
# echo path
start = path[0]
target = _.last path
curr = start

# echo curr,target
echo "go from #{game.pretty(curr)} to #{game.pretty(target)} in #{path.length - 1} steps: "
echo (game.pretty(p) for p in path).join " "
