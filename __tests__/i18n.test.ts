const locales = {
  en: require('../src/i18n/locales/en.json'),
  hi: require('../src/i18n/locales/hi.json'),
  fr: require('../src/i18n/locales/fr.json'),
  ja: require('../src/i18n/locales/ja.json'),
};

const flattenKeys = (value: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object'
      ? flattenKeys(child as Record<string, unknown>, path)
      : [path];
  });

const flattenValues = (
  value: Record<string, unknown>,
  prefix = '',
): Record<string, string> =>
  Object.entries(value).reduce<Record<string, string>>((result, [key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') {
      Object.assign(result, flattenValues(child as Record<string, unknown>, path));
    } else if (typeof child === 'string') {
      result[path] = child;
    }
    return result;
  }, {});

describe('translation resources', () => {
  it('defines the same translation keys for every supported language', () => {
    const expected = flattenKeys(locales.en).sort();

    for (const resources of Object.values(locales)) {
      expect(flattenKeys(resources).sort()).toEqual(expected);
    }
  });

  it('keeps interpolation placeholders consistent and translations non-empty', () => {
    const expected = flattenValues(locales.en);
    const variables = (value: string) =>
      [...value.matchAll(/{{\s*([^}\s]+)\s*}}/g)]
        .map(match => match[1])
        .sort();

    for (const resources of Object.values(locales)) {
      const actual = flattenValues(resources);
      for (const [key, value] of Object.entries(actual)) {
        expect(value.trim()).not.toBe('');
        expect(variables(value)).toEqual(variables(expected[key]));
      }
    }
  });
});
