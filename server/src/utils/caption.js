/**
 * Replace {name} placeholder in a caption template with the contact's name.
 * Uses nameOnDesign if available, otherwise falls back to displayName.
 */
function buildCaption(template, contact) {
  if (!template) return '';
  const name = (contact && (contact.nameOnDesign || contact.displayName)) || '';
  return template.replace(/\{name\}/g, name);
}

module.exports = { buildCaption };
