const CATEGORY_EMOJI = {
  museum: '🏛️',
  attraction: '🎡',
  monument: '🗿',
  park: '🌳',
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  hotel: '🏨',
  shop: '🛍️',
  gallery: '🖼️',
  theatre: '🎭',
  temple: '🛕',
  church: '⛪',
  mosque: '🕌',
  beach: '🏖️',
  viewpoint: '🔭',
  zoo: '🦁',
  aquarium: '🐠',
  stadium: '🏟️',
  poi: '📍',
};

export function getCategoryEmoji(category) {
  const key = (category || 'poi').toLowerCase().trim();
  return CATEGORY_EMOJI[key] || '📍';
}

export function getCategoryLabel(category) {
  const key = (category || 'poi').toLowerCase().trim();
  return key.charAt(0).toUpperCase() + key.slice(1);
}
