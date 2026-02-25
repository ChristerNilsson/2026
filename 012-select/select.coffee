import {tag} from './fasthtml.js'

div = tag "div"

NAME_LEN = 21
NBSP = "\u00A0"

toSortKey = (name) -> # name
	#name = name.textContent
	out = name ? ""
	if out.length > NAME_LEN then out = out.slice 0, NAME_LEN
	out.trim().toLocaleLowerCase 'sv-SE'

export class Select
	constructor: ({items = [], @onCountChange = null} = {}) ->
		# @onCountChange = onCountChange
		@selectedIndex = -1
		@element = div
			tabindex: "0"
			style: "font-family:monospace; font-size:14px; width:370px; height:360px; overflow:auto; border:1px solid #000; white-space:nowrap; word-break:keep-all; overflow-wrap:normal; hyphens:none;"

		@element.addEventListener 'keydown', @onKeydown
		@element.addEventListener 'focus', => @paintSelection()
		@element.addEventListener 'blur', => @paintSelection()

		for name in items
			@add name
		@setSelectedIndex 0
		@notifyCount()

	notifyCount: ->
		@onCountChange? @element.children.length

	setSelectedIndex: (i) ->
		count = @element.children.length
		if count == 0
			@selectedIndex = -1
			return

		if not Number.isFinite(i) then i = 0
		next = Math.max 0, Math.min i, count - 1
		@selectedIndex = next
		@paintSelection()
		row = @element.children[@selectedIndex]
		row.scrollIntoView block: "nearest"

	paintSelection: ->
		for row in @element.children
			row.style.background = ""
		return if @selectedIndex < 0
		row = @element.children[@selectedIndex]
		return unless row?
		if document.activeElement is @element
			row.style.background = "#cfe8ff"
		else
			row.style.background = "#e8e8e8"

	sort: (preferredRow = null) ->
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

	add: (name, pick = false) ->
		row = div
			class: "people"
			style: "line-height:18px; padding:0 4px; cursor:default; white-space:nowrap; word-break:keep-all; overflow-wrap:normal; hyphens:none;"
			dataset: sortKey: toSortKey(name)
			name

		row.addEventListener "click", =>
			i = Array::indexOf.call @element.children, row
			if i >= 0
				@setSelectedIndex i
				@element.focus()

		@element.appendChild row
		@sort if pick then row else null

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
