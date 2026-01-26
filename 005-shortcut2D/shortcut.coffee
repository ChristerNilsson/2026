import {echo, Game} from "./game.js"
import _ from "https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js"

class Shortcut extends Game
	constructor :  (@ops,@minimum,@medium,@maximum,@level) ->
		super()
		@start = [_.random(@minimum, @medium), 0]
		@level += 1
		@stack = []
	pretty : (z) -> @gauss(z)
	ok : (temp) -> @minimum <= temp[0] <= @maximum
 
game = new Shortcut ["x2+:y","x2*:y","x2/:y"], 1,20,40,5
game.instructions() 

path = game.solve game.start
start = path[0]
target = _.last path
curr = start

echo "go from #{game.pretty(curr)} to #{game.pretty(target)} in #{path.length - 1} steps: "
echo (game.pretty(p) for p in path).join " "
