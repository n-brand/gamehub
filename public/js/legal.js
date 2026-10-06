// Impressum (#/impressum). Die Datenschutzerklärung ist eine eigene Seite ohne # (public/datenschutz.html),
// damit Google sie für den Login prüfen kann; #/datenschutz leitet dorthin weiter.
// Platzhalter in <mark> müssen vor der Veröffentlichung mit echten Angaben gefüllt werden.

const OWNER = `
  <p>
    Nicolas Brand<br>
    <mark>[Straße und Hausnummer]</mark><br>
    <mark>[PLZ Ort]</mark><br>
    Deutschland
  </p>
  <p>E-Mail: <mark>[E-Mail-Adresse]</mark></p>`;

const PAGES = {
  impressum: {
    title: 'Impressum',
    body: `
      <h2>Angaben gemäß § 5 DDG</h2>
      ${OWNER}
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>Nicolas Brand, Anschrift wie oben.</p>
      <h2>Hinweis</h2>
      <p>GameHub ist ein privates, nicht kommerzielles Projekt. Es gibt keine Werbung und keine kostenpflichtigen Inhalte; Coins und Diamanten sind reine Spielwährung ohne Geldwert.</p>
      <h2>Haftung für Links</h2>
      <p>Diese Seite enthält Links zu externen Webseiten. Für deren Inhalte sind ausschließlich die jeweiligen Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden entsprechende Links umgehend entfernt.</p>
      <h2>Datenschutz</h2>
      <p>Welche Daten GameHub verarbeitet, steht in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>`,
  },
};

export function renderLegal(container, page) {
  const { title, body } = PAGES[page];
  container.innerHTML = `
    <section class="page legal">
      <a href="#/" class="back">← Zur Übersicht</a>
      <div class="page-head"><h1>${title}</h1></div>
      ${body}
    </section>`;
}
