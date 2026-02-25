import {tag} from '../fasthtml.js'

div = tag "div"

NAME_LEN = 21
NBSP = "\u00A0"

formatName = (name) ->
	out = name ? ""
	if out.length > NAME_LEN then out = out.slice 0, NAME_LEN
	out = out.padEnd NAME_LEN, ' '
	out.replaceAll " ", NBSP

toSortKey = (name) ->
	out = name ? ""
	if out.length > NAME_LEN then out = out.slice 0, NAME_LEN
	out.trim().toLocaleLowerCase 'sv-SE'

export class Select
	constructor: ({items = [], onCountChange = null} = {}) ->
		@onCountChange = onCountChange
		@selectedIndex = -1
		@element = div
			tabindex: "0"
			style: "font-family:monospace; font-size:14px; width:360px; height:360px; overflow-y:auto; border:1px solid #999; white-space:pre;"

		@element.addEventListener 'keydown', @onKeydown

		for name in items
			@addPlayer name
		@setSelectedIndex 0
		@notifyCount()

	notifyCount: ->
		@onCountChange? @element.children.length

	setSelectedIndex: (i) ->
		count = @element.children.length
		if count == 0
			@selectedIndex = -1
			return

		next = Math.max 0, Math.min i, count - 1
		for row in @element.children
			row.style.background = ""

		@selectedIndex = next
		row = @element.children[@selectedIndex]
		row.style.background = "#cfe8ff"
		row.scrollIntoView block: "nearest"

	sortPlayers: (preferredRow = null) ->
		rows = Array::slice.call @element.children
		rows.sort (a, b) -> a.dataset.sortKey.localeCompare b.dataset.sortKey, 'sv', sensitivity:'base'
		for row in rows
			@element.appendChild row

		if rows.length == 0
			@selectedIndex = -1
			@notifyCount()
			return

		if preferredRow?
			i = rows.indexOf preferredRow
			if i < 0 then i = 0
			@setSelectedIndex i
		else
			@setSelectedIndex Math.max 0, Math.min @selectedIndex, rows.length - 1

		@notifyCount()

	selectByInitial: (char, backwards = false) ->
		rows = Array::slice.call @element.children
		if rows.length == 0 then return

		needle = char.toLocaleLowerCase 'sv-SE'
		matches = []
		for row, i in rows when row.dataset.sortKey?.startsWith needle
			matches.push i

		if matches.length == 0 then return

		if backwards
			revMatches = matches.slice().reverse()
			target = revMatches[0]
			for i in revMatches when i < @selectedIndex
				target = i
				break
		else
			target = matches[0]
			for i in matches when i > @selectedIndex
				target = i
				break

		@setSelectedIndex target

	addPlayer: (name, pick = false) ->
		row = div
			style: "line-height:18px; padding:0 4px; cursor:default;"
			dataset: sortKey: toSortKey(name)
			formatName(name)

		row.addEventListener "click", =>
			i = Array::indexOf.call @element.children, row
			if i >= 0
				@setSelectedIndex i
				@element.focus()

		@element.appendChild row
		@sortPlayers if pick then row else null

	removeSelected: ->
		count = @element.children.length
		if count == 0 then return

		i = if @selectedIndex >= 0 then @selectedIndex else count - 1
		@element.removeChild @element.children[i]

		if @element.children.length == 0
			@selectedIndex = -1
			@notifyCount()
			return

		@setSelectedIndex Math.min i, @element.children.length - 1
		@notifyCount()

	clear: ->
		@element.innerHTML = ''
		@selectedIndex = -1
		@notifyCount()

	focus: ->
		@element.focus()

	onKeydown: (e) =>
		if e.key == 'ArrowUp'
			e.preventDefault()
			@setSelectedIndex @selectedIndex - 1
		else if e.key == 'ArrowDown'
			e.preventDefault()
			@setSelectedIndex @selectedIndex + 1
		else if e.key.length == 1 and not e.ctrlKey and not e.metaKey and not e.altKey
			e.preventDefault()
			@selectByInitial e.key, e.shiftKey
