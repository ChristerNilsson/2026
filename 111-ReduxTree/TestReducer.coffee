normalizeTree = (tree) ->
	if Array.isArray tree
		tree.map normalizeNode
	else if tree? and typeof tree is "object"
		[normalizeNode tree]
	else
		throw new Error "Expected test tree to be an object or array"

normalizeNode = (node) ->
	{
		...node
		children: (node.children ? []).map normalizeNode
	}

resolveReducer = (reducers, name) ->
	candidates = [name, name.toUpperCase(), name.toLowerCase()]

	for candidate in candidates when candidate of reducers
		return reducers[candidate]

	null

matchesExpected = (actual, expected) ->
	if expected is null or typeof expected isnt "object"
		return Object.is actual, expected

	if Array.isArray expected
		return false unless Array.isArray(actual) and actual.length is expected.length
		return expected.every (value, index) -> matchesExpected actual[index], value

	return false unless actual? and typeof actual is "object"

	Object.keys(expected).every (key) -> matchesExpected actual[key], expected[key]

formatState = (value) -> JSON.stringify value

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
