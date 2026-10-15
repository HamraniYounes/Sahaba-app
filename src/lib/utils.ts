export function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    restaurant: 'Restaurant', fast_food: 'Restauration rapide', cafe: 'Café',
    boulangerie: 'Boulangerie', boucherie: 'Boucherie', epicerie: 'Épicerie',
    mosquee: 'Mosquée', salle_priere: 'Salle de prière', ecole_coran: 'École coranique',
    association: 'Association', funeraire: 'Services funéraires', sante: 'Santé',
    bien_etre: 'Bien-être', vetements: 'Vêtements', librairie: 'Librairie',
    finance: 'Finance', voyage: 'Voyage', hebergement: 'Hébergement',
    services: 'Services', autre: 'Autre',
  }
  return labels[category] || category
}

/** Escapes user input before embedding it in a PostgREST .or() filter. */
export function escapePostgrestSearchTerm(value: string) {
  return value
    .slice(0, 120)
    .replace(/\\/g, '\\\\')
    .replace(/[%_*]/g, '\\$&')
    .replace(/[,.():]/g, '\\$&')
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'medium' }).format(new Date(value))
}
