// n8n Code node: run once for all items. Only inbound messages, never receipts/echoes.
const supported = new Set(['text', 'image', 'audio', 'document', 'video', 'sticker', 'location', 'contacts', 'interactive', 'button', 'order']);
const result = [];
for (const item of $input.all()) {
  const value = item.json;
  for (const message of value.messages || []) {
    if (!message.id || !message.from || !value.metadata?.phone_number_id) continue;
    const contact = (value.contacts || []).find(c => c.wa_id === message.from);
    result.push({ json: {
      message_id: message.id,
      phone_number_id: value.metadata.phone_number_id,
      from: message.from,
      name: contact?.profile?.name || '',
      type: supported.has(message.type) ? message.type : 'unsupported',
      text: message.text?.body || message.button?.text || message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '',
      timestamp: String(message.timestamp),
    } });
  }
}
return result;
