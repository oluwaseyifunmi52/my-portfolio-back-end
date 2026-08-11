import slugify from 'slugify';

export function generateSlug(text, options = {}) {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'en',
    ...options,
  });
}

export function generateUniqueSlug(baseSlug, existsFn, suffix = '') {
  let slug = `${baseSlug}${suffix}`;
  let counter = 1;

  while (existsFn(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}