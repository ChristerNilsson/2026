// Read-only adapter for the captured source HTML; never executes source scripts.
const text = html => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
function element(attributes, content) {
  return {textContent:text(content), matches:() => true,
    getAttribute(name) { return attributes.match(new RegExp('\\b' + name + '=["\']([^"\']*)["\']', 'i'))?.[1] || null; }};
}
module.exports = function fixtureDocument(html) {
  const links = [...html.matchAll(/<(span|a|td)\b([^>]*(?:onclick|href)=[^>]*)>([\s\S]*?)<\/\1>/gi)].map(([,tag,attrs,content]) => element(attrs,content));
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([,content]) => ({children:[...content.matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map(([,attrs,value])=>element(attrs,value))}));
  return {
    title:html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '',
    querySelectorAll(selector) { return selector === 'tr' ? rows : links; },
    querySelector(selector) {
      if (selector === '.selroundheader') { const value = html.match(/<span[^>]*class=['"]selroundheader['"][^>]*>([\s\S]*?)<\/span>/i); return value ? {textContent:text(value[1]),innerHTML:value[1]} : null; }
      const formId = selector.match(/^#(\w+) input/)?.[1];
      const form = formId && html.match(new RegExp('<form[^>]*id=["\']' + formId + '["\'][^>]*>([\\s\\S]*?)</form>', 'i'));
      const input = form?.[1].match(/<input\b[^>]*name=['"]id['"][^>]*>/i)?.[0];
      const value = input?.match(/\bvalue=['"]([^'"]+)['"]/i)?.[1];
      return value ? {value} : null;
    },
  };
};
