/* i might make the bot support multiple languages at some point
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

export default async function i18n() {
  await i18next.use(Backend).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    backend: {
      loadPath: path.join(process.cwd(), 'dist', 'locales', '{{lng}}.json'),
    },
    interpolation: { escapeValue: false },
  });
}
*/
