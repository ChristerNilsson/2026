from fasthtml.common import to_xml,Ul,Li,A

def worker():
    return to_xml(Ul(
    Li(A("a", href ="a/index.html")),
        Li(A("b", href ="b/index.html")),
        Li(A("c", href ="c/index.html"))
        ))
