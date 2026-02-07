from fasthtml.common import *

def Line(line):
	cells = line.split("|")
	return (Td(cell) for cell in cells)

def Tabell(s):
	s = s.strip()
	lines = s.split("\n")
	columns = lines[0].split("|")
	lines = lines[1:]
	return to_xml(Table(
		Tr(Td(column) for column in columns),
		*(Tr(Line(line)) for line in lines)
	))
