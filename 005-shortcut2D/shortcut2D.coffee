import {echo, Game} from "./game.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

class Shortcut2D extends Game
	constructor : (@ops,@minimum,@medium,@maximum,@level) ->
		super()
		@start = [_.random(@minimum,@maximum), _.random(@minimum,@maximum)]
		@level += 1
		@stack = []
	pretty : (z) -> @gauss(z)
	ok : (temp) -> @minimum <= temp[0] <= @maximum and @minimum <= temp[1] <= @maximum

game = new Shortcut2D ["x2+:y","x2*:y2*","-y:x","y:x"], 1,10,20,15
game.instructions() 

path = game.solve game.start
start = path[0]
target = _.last path
curr = start

echo "go from #{game.pretty(curr)} to #{game.pretty(target)} in #{path.length - 1} steps: "
echo (game.pretty(p) for p in path).join " "
