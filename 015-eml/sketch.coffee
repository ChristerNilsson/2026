# eml_trees.coffee
# Rena EML-träd:
#   S -> 1 | x | eml(S,S) | add(S,S) | mul(S,S) | div(S,S)
#
# Inga numeriska serier.
# Inga vanliga +, -, *, / som definitioner av funktioner.
# Bara evaluation av trädet använder JS Math.exp / Math.log,
# eftersom det är själva semantiken för eml.

EPS = 1e-10

# ------------------------------------------------------------
# Trädnoder
# ------------------------------------------------------------

One = -> { kind: 'one' }
Var = (name) -> { kind: 'var', name }
Eml = (a, b) -> { kind: 'eml', a, b }
Add = (a, b) -> { kind: 'add', a, b }
Mul = (a, b) -> { kind: 'mul', a, b }
Div = (a, b) -> { kind: 'div', a, b }

# kompakta alias
E = Eml
A = Add
M = Mul
D = Div

# ------------------------------------------------------------
# Evaluering
# ------------------------------------------------------------

evalTree = (node, env = {}) ->
  switch node.kind
    when 'one'
      1.0
    when 'var'
      unless Object.prototype.hasOwnProperty.call(env, node.name)
        throw new Error "saknar variabel #{node.name}"
      env[node.name]
    when 'eml'
      x = evalTree node.a, env
      y = evalTree node.b, env
      throw new Error "eml kräver icke-negativt andra argument, fick #{y}" if y < 0
      Math.exp(x) - Math.log(y)
    when 'add'
      evalTree addTree(node.a, node.b), env
    when 'mul'
      evalTree mulTree(node.a, node.b), env
    when 'div'
      y = evalTree node.b, env
      throw new Error "division med noll" if y is 0
      evalTree divTree(node.a, node.b), env
    else
      throw new Error "okänd nodtyp #{node.kind}"

Complex = (re, im = 0) -> { re, im }

asComplex = (value) ->
  if typeof value is 'number'
    Complex value, 0
  else
    value

complexSub = (a, b) ->
  a = asComplex a
  b = asComplex b
  Complex a.re - b.re, a.im - b.im

complexExp = (z) ->
  z = asComplex z
  r = Math.exp z.re
  return Complex r, 0 if z.im is 0
  Complex r * Math.cos(z.im), r * Math.sin(z.im)

complexLog = (z) ->
  z = asComplex z
  Complex Math.log(Math.hypot(z.re, z.im)), Math.atan2(z.im, z.re)

evalTreeComplex = (node, env = {}) ->
  switch node.kind
    when 'one'
      Complex 1, 0
    when 'var'
      unless Object.prototype.hasOwnProperty.call(env, node.name)
        throw new Error "saknar variabel #{node.name}"
      asComplex env[node.name]
    when 'eml'
      x = evalTreeComplex node.a, env
      y = evalTreeComplex node.b, env
      complexSub complexExp(x), complexLog(y)
    when 'add'
      evalTreeComplex addTree(node.a, node.b), env
    when 'mul'
      evalTreeComplex mulTree(node.a, node.b), env
    when 'div'
      evalTreeComplex divTree(node.a, node.b), env
    else
      throw new Error "okänd nodtyp #{node.kind}"

# ------------------------------------------------------------
# Pretty printer
# ------------------------------------------------------------

toString = (node) ->
  switch node.kind
    when 'one' then '1'
    when 'var' then node.name
    when 'eml' then "E(#{toString(node.a)},#{toString(node.b)})"
    when 'add' then "+(#{toString(node.a)},#{toString(node.b)})"
    when 'mul' then "*(#{toString(node.a)},#{toString(node.b)})"
    when 'div' then "/(#{toString(node.a)},#{toString(node.b)})"
    else '?'

countNodes = (node) ->
  switch node.kind
    when 'one', 'var'
      1
    when 'eml', 'add', 'mul', 'div'
      1 + countNodes(node.a) + countNodes(node.b)
    else
      throw new Error "okänd nodtyp #{node.kind}"

expandTree = (node) ->
  switch node.kind
    when 'one'
      One()
    when 'var'
      Var node.name
    when 'eml'
      E expandTree(node.a), expandTree(node.b)
    when 'add'
      expandTree addTree(node.a, node.b)
    when 'mul'
      expandTree mulTree(node.a, node.b)
    when 'div'
      expandTree divTree(node.a, node.b)
    else
      throw new Error "okänd nodtyp #{node.kind}"

# ------------------------------------------------------------
# Exakta EML-konstruktioner
# ------------------------------------------------------------

# exp(x) = eml(x, 1)
expTree = (x) ->
  E x, One()

# e = eml(1,1)
eTree = ->
  E One(), One()

# ln(x) = eml(1, eml(eml(1,x),1))
lnTree = (x) ->
  E One(), E(E(One(), x), One())

# 0 = ln(1)
zeroTree = ->
  lnTree One()

# a - b = eml(ln(a), exp(b))
subTree = (a, b) ->
  E lnTree(a), expTree(b)

# -x = 0 - x
negTree = (x) ->
  subTree zeroTree(), x

# a + b = a - (-b)
addTree = (a, b) ->
  subTree a, negTree(b)

# a * b = exp(ln(a) + ln(b))
mulTree = (a, b) ->
  expTree addTree(lnTree(a), lnTree(b))

# a / b = exp(ln(a) - ln(b))
divTree = (a, b) ->
  expTree subTree(lnTree(a), lnTree(b))

# sin(x) = (exp(i*x) - exp(-i*x)) / (2*i)
sinTree = (x) ->
  i = Var 'i'
  two = A One(), One()
  numerator = subTree expTree(M(i, x)), expTree(M(negTree(i), x))
  denominator = M two, i
  D numerator, denominator

# pi-trädet från oxieml CLI:
# E(1,E(E(1,E(E(1,E(E(1,E(1,E(1,1))),1)),E(E(1,1),1))),1))
#
# Referensen visar att detta matchar Im ~ pi, dvs den imaginära delen är pi,
# eftersom konstruktionen använder komplex gren internt. Här på reella tal
# kan vi inte evaluera ln(-1), så detta träd är främst en exakt symbolisk
# representation. För ren real evaluering lämnas det oevaluerat.
piTree = ->
  E One(),
    E(
      E(
        One(),
        E(
          E(
            One(),
            E(
              E(
                One(),
                E(
                  One(),
                  E(One(), One())
                )
              ),
              One()
            )
          ),
          E(E(One(), One()), One())
        )
      ),
      One()
    )
 
# ------------------------------------------------------------
# Hjälp för tester
# ------------------------------------------------------------

approx = (a, b, eps = EPS) ->
  Math.abs(a - b) <= eps

assertApprox = (name, actual, expected, eps = EPS) ->
  ok = approx(actual, expected, eps)
  console.log "#{if ok then 'OK' else 'FAIL'} #{name} actual=#{actual} expected=#{expected}"
  throw new Error "Test failed: #{name}" unless ok

assertEqual = (name, actual, expected) ->
  ok = actual is expected
  console.log "#{if ok then 'OK' else 'FAIL'} #{name} actual=#{actual} expected=#{expected}"
  throw new Error "Test failed: #{name}" unless ok

assertTrue = (name, cond) ->
  console.log "#{if cond then 'OK' else 'FAIL'} #{name}"
  throw new Error "Test failed: #{name}" unless cond

assertComplexApprox = (name, actual, expected, eps = EPS) ->
  ok = approx(actual.re, expected.re, eps) and approx(actual.im, expected.im, eps)
  console.log "#{if ok then 'OK' else 'FAIL'} #{name} actual=#{actual.re}+#{actual.im}i expected=#{expected.re}+#{expected.im}i"
  throw new Error "Test failed: #{name}" unless ok

runTest = (name, fn) ->
  console.log name
  fn()

# ------------------------------------------------------------
# Tester: 4 per definierad funktion/konstant
# ------------------------------------------------------------

test_exp = ->
  x = Var 'x'
  t = expTree x
  assertApprox "exp(0)",   evalTree(t, x: 0), 1
  assertApprox "exp(1)",   evalTree(t, x: 1), Math.E
  assertApprox "exp(2)",   evalTree(t, x: 2), Math.exp(2)
  assertApprox "exp(-1)",  evalTree(t, x: -1), Math.exp(-1)

test_ln = ->
  x = Var 'x'
  t = lnTree x
  assertApprox "ln(1)",      evalTree(t, x: 1), 0
  assertApprox "ln(e)",      evalTree(t, x: Math.E), 1
  assertApprox "ln(2)",      evalTree(t, x: 2), Math.log(2)
  assertApprox "ln(0.5)",    evalTree(t, x: 0.5), Math.log(0.5)

test_e = ->
  t = eTree()
  assertApprox "e value",       evalTree(t), Math.E
  assertApprox "e > 2",         evalTree(t), Math.E
  assertTrue   "e > 2",         evalTree(t) > 2
  assertTrue   "e < 3",         evalTree(t) < 3

test_zero = ->
  t = zeroTree()
  assertApprox "zero value",    evalTree(t), 0
  assertApprox "zero + tol",    evalTree(t), 0, 1e-12
  assertTrue   "zero == 0",     evalTree(t) is 0
  assertTrue   "zero finite",   Number.isFinite(evalTree(t))

test_add = ->
  x = Var 'x'
  y = Var 'y'
  t = A x, y
  assertApprox "add 2+3", evalTree(t, x: 2, y: 3), 5
  assertApprox "add 0+4", evalTree(t, x: 0, y: 4), 4
  assertApprox "add 2+5", evalTree(t, x: 2, y: 5), 7
  assertApprox "add 0.5+0.25", evalTree(t, x: 0.5, y: 0.25), 0.75
  assertComplexApprox "add via complex eml",
    evalTreeComplex(t, x: 2, y: 3),
    Complex(5, 0)

test_mul = ->
  x = Var 'x'
  y = Var 'y'
  t = M x, y
  assertApprox "mul 2*3", evalTree(t, x: 2, y: 3), 6
  assertApprox "mul 1*7", evalTree(t, x: 1, y: 7), 7
  assertApprox "mul 2*8", evalTree(t, x: 2, y: 8), 16
  assertApprox "mul 4*5", evalTree(t, x: 4, y: 5), 20
  assertComplexApprox "mul via complex eml",
    evalTreeComplex(t, x: 2, y: 3),
    Complex(6, 0)

test_div = ->
  x = Var 'x'
  y = Var 'y'
  t = D x, y
  assertApprox "div 6/3", evalTree(t, x: 6, y: 3), 2
  assertApprox "div 7/1", evalTree(t, x: 7, y: 1), 7
  assertApprox "div 4/0.5", evalTree(t, x: 4, y: 0.5), 8
  assertApprox "div 2/4", evalTree(t, x: 2, y: 4), 0.5
  assertComplexApprox "div via complex eml",
    evalTreeComplex(t, x: 6, y: 3),
    Complex(2, 0)

test_arithmetic_structure = ->
  x = Var 'x'
  y = Var 'y'
  assertEqual "arithmetic string", toString(D(M(A(One(), x), y), x)), "/(*(+(1,x),y),x)"
  assertComplexApprox "nested arithmetic via complex eml",
    evalTreeComplex(D(A(x, One()), y), x: 5, y: 3),
    Complex(2, 0)

test_sin = ->
  x = Var 'x'
  t = sinTree x
  env = (value) -> { x: value, i: Complex(0, 1) }
  assertEqual "sin exact tree string",
    toString(t),
    "/(E(E(1,E(E(1,E(*(i,x),1)),1)),E(E(*(E(E(1,E(E(1,E(1,E(E(1,1),1))),1)),E(i,1)),x),1),1)),*(+(1,1),i))"
  console.log "sin node count=#{countNodes(t)}"
  expanded = expandTree t
  console.log "sin expanded node count=#{countNodes(expanded)}"
  console.log "sin expanded tree string=#{toString(expanded)}"
  assertTrue "sin expanded contains only E/1/vars",
    /^[E1ix(),]+$/.test(toString(expanded))
  assertComplexApprox "sin(0.5)", evalTreeComplex(t, env(0.5)), Complex(Math.sin(0.5), 0)
  assertComplexApprox "sin(1)", evalTreeComplex(t, env(1)), Complex(Math.sin(1), 0)
  assertComplexApprox "sin(pi/2)", evalTreeComplex(t, env(Math.PI / 2)), Complex(1, 0)
  assertComplexApprox "sin(pi)", evalTreeComplex(t, env(Math.PI)), Complex(0, 0)
  console.log "sin numeric sample sin(1)=#{evalTreeComplex(t, env(1)).re}"

test_pi = ->
  t = piTree()
  s = toString t
  assertEqual "pi string nonempty", s.length > 0, true
  assertTrue  "pi starts with E(", s[0...2] is 'E('
  assertTrue  "pi contains only E/1 punctuation", /^[E1(),]+$/.test(s)
  assertEqual "pi exact tree string",
    s,
    "E(1,E(E(1,E(E(1,E(E(1,E(1,E(1,1))),1)),E(E(1,1),1))),1))"
  z = evalTreeComplex t
  assertApprox "pi real part", z.re, 0, 1e-12
  assertApprox "pi imaginary part", z.im, Math.PI
  assertTrue  "pi numeric finite", Number.isFinite(z.re) and Number.isFinite(z.im)
  assertApprox "pi absolute value", Math.hypot(z.re, z.im), Math.PI

runTests = ->
  tests = [
    ['test_exp', test_exp]
    ['test_ln', test_ln]
    ['test_e', test_e]
    ['test_zero', test_zero]
    ['test_add', test_add]
    ['test_mul', test_mul]
    ['test_div', test_div]
    ['test_arithmetic_structure', test_arithmetic_structure]
    ['test_sin', test_sin]
    ['test_pi', test_pi]
  ]
  for [name, fn] in tests
    runTest name, fn
  console.log "Körda testblock: #{(name for [name] in tests).join(', ')}"
  console.log "Alla definierade rena EML-träd passerade."

runTests()
