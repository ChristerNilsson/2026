# Tar emot ett träd eller en lista av rötter och ser till att alla noder
# får en children-lista, så resten av koden kan traversera utan specialfall.
normalizeTree = (tree) ->
	if Array.isArray tree
		tree.map normalizeNode
	else if tree? and typeof tree is "object"
		[normalizeNode tree]
	else
		throw new Error "Expected test tree to be an object or array"

# Bygger om en nod rekursivt till den interna standardformen.
# Det gör testmotorn tolerant mot att children saknas i testdatan.
normalizeNode = (node) ->
	{
		...node
		children: (node.children ? []).map normalizeNode
	}

# Letar upp en reducer utifrån nodens namn.
# Jag tillåter olika casing för att göra testträdet mindre känsligt.
resolveReducer = (reducers, name) ->
	candidates = [name, name.toUpperCase(), name.toLowerCase()]

	for candidate in candidates when candidate of reducers
		return reducers[candidate]

	null

# Jämför actual mot expected som en delmängd.
# Om expected bara innehåller vissa fält, ignoreras resten av actual.
matchesExpected = (actual, expected) ->
	if expected is null or typeof expected isnt "object"
		return Object.is actual, expected

	if Array.isArray expected
		return false unless Array.isArray(actual) and actual.length is expected.length
		return expected.every (value, index) -> matchesExpected actual[index], value

	return false unless actual? and typeof actual is "object"

	Object.keys(expected).every (key) -> matchesExpected actual[key], expected[key]

# Hjälpfunktion för felmeddelanden så att state skrivs konsekvent.
formatState = (value) -> JSON.stringify value

# Kör en nod i trädet.
# "test"-noden sätter start-state, övriga noder kör motsvarande reducer på
# förälderns state. Resultatet verifieras och skickas sedan vidare till barnen.
executeNode = (node, parentState, reducers, path, failures, context) ->
	nextPath = [...path, node.name]
	pathLabel = nextPath.join " > "
	callNumber = context.callCount += 1

	actualState = parentState

	if node.name.toLowerCase() is "test"
		actualState = node.expected
	else
		reducer = resolveReducer reducers, node.name
		throw new Error "Reducer \"#{node.name}\" not found" unless reducer?
		actualState = reducer parentState

	unless matchesExpected actualState, node.expected
		message = "Assert failed at call #{callNumber} (#{pathLabel}): expected #{formatState(node.expected)}, got #{formatState(actualState)}"
		failures.push message
		console.assert false, message

	for child in node.children
		executeNode child, actualState, reducers, nextPath, failures, context

# Publik entrypoint.
# Kör hela trädet uppifrån och ned, samlar alla fel och returnerar både trädet
# och listan med assertion-fel för vidare användning.
export testReducer = (script, reducers) ->
	tree = normalizeTree script
	failures = []
	context = {callCount: 0}

	for node in tree
		executeNode node, null, reducers, [], failures, context

	if failures.length is 0
		console.log "All assertions passed (#{tree.length} root test#{if tree.length is 1 then "" else "s"})."

	{
		tree
		failures
	}
