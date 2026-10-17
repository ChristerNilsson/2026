const {parse, serialize} = require('parse5');
const {parseHTML} = require('linkedom');

// Apply browser HTML5 tree repair before exposing DOM selectors to the app.
module.exports = html => parseHTML(serialize(parse(html))).document;
