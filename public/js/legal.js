// Impressum und Datenschutzerklärung (#/impressum, #/datenschutz).
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
      <p>Diese Seite enthält Links zu externen Webseiten. Für deren Inhalte sind ausschließlich die jeweiligen Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden entsprechende Links umgehend entfernt.</p>`,
  },
  datenschutz: {
    title: 'Datenschutz&shy;erklärung', // weiche Trennstelle für schmale Handys
    body: `
      <h2>1. Verantwortlicher</h2>
      ${OWNER}

      <h2>2. Überblick</h2>
      <p>Alle Spiele lassen sich ohne Anmeldung spielen. Es gibt keine Werbung, kein Tracking und keine Analyse-Werkzeuge. Personenbezogene Daten werden nur verarbeitet, soweit es für den Betrieb der Seite und – wenn du dich anmeldest – für Coins, Glücksrad, Erfolge und Shop nötig ist.</p>

      <h2>3. Hosting (GitHub Pages)</h2>
      <p>Die Seite wird über GitHub Pages bereitgestellt (GitHub Inc., 88 Colin P. Kelly Jr. St., San Francisco, CA 94107, USA). Beim Aufruf verarbeitet GitHub technisch notwendige Daten wie IP-Adresse, Zeitpunkt, aufgerufene Datei und Browser-Kennung, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren Auslieferung). GitHub ist unter dem EU-US Data Privacy Framework zertifiziert.</p>

      <h2>4. Schriftart und Programmbibliothek</h2>
      <p>Die Schrift „Nunito“ wird von Google Fonts geladen (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Dabei wird deine IP-Adresse an Google übertragen. Für die Anmeldung wird die Programmbibliothek supabase-js über das Content-Delivery-Netzwerk jsDelivr geladen; auch dabei wird die IP-Adresse an den Anbieter übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (einheitliche Darstellung und zuverlässige Auslieferung).</p>

      <h2>5. Speicherung im Browser</h2>
      <p>GameHub setzt keine Cookies. Im Speicher deines Browsers (localStorage) werden abgelegt: Favoriten, zuletzt gespielte Spiele, lokale Rekorde und Spielstände, gewählte Level, das Farbschema (hell/dunkel) sowie – wenn du angemeldet bist – die Anmelde-Sitzung. Diese Daten verlassen deinen Browser nicht (außer der Sitzung, die bei Anfragen an Supabase mitgeschickt wird) und lassen sich über die Browser-Einstellungen jederzeit löschen. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG, da die Speicherung für die von dir gewünschten Funktionen unbedingt erforderlich ist.</p>

      <h2>6. Anmeldung mit Google</h2>
      <p>Die Anmeldung ist freiwillig. Wenn du „Mit Google anmelden“ wählst, wirst du zu Google weitergeleitet. Google übermittelt uns danach deinen Namen, deine E-Mail-Adresse, dein Profilbild und eine Kennung deines Google-Kontos. Dein Passwort erhalten wir nicht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des Spielerkontos). Für die Verarbeitung bei Google gilt die Datenschutzerklärung von Google: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>.</p>

      <h2>7. Spielerkonto (Supabase)</h2>
      <p>Für angemeldete Spieler werden Daten bei Supabase gespeichert (Supabase Inc., 970 Toa Payoh North #07-04, Singapur 318992; Rechenzentrum in der EU). Gespeichert werden: die Angaben aus der Google-Anmeldung, Kontostand (Coins, Diamanten), Glücksrad-Serie, Spielstatistiken (Anzahl Runden, Siege, Bestwerte), freigeschaltete Erfolge sowie gekaufte und ausgerüstete Designs. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Mit Supabase besteht ein Vertrag zur Auftragsverarbeitung. Die Daten werden gespeichert, solange dein Konto besteht; auf Wunsch wird das Konto mit allen Daten gelöscht.</p>

      <h2>8. Deine Rechte</h2>
      <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Schreib dafür einfach eine E-Mail an die oben genannte Adresse – auch, wenn dein Spielerkonto gelöscht werden soll. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, etwa bei der Behörde deines Wohnorts.</p>

      <p class="legal-date">Stand: Oktober 2026</p>`,
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
