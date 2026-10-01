
# Beslut: Teststrategi för Utpost

**Datum:** 2026-10-01
**Status:** Förslag för teamgranskning (M2)

## Beslut

Vi använder Vitest för enhetstester av ren logik och Vue Testing Library för komponenttester i Vue-klienten. Tester ska kontrollera beteende som användaren eller API-konsumenten märker, inte interna implementationer.

Alla tester körs automatiskt i CI. En PR får inte mergas om test, typkontroll, lint, formatkontroll eller bygg misslyckas.

## Bakgrund

I M2 inför vi ett gemensamt API-kontrakt i `@utpost/shared` och TypeScript-kontroll i CI. Vi behöver också tester som upptäcker riktiga fel.

Vår skuldinventering (`docs/debt.md`) beskriver bland annat problem med ogiltiga ID:n (#5), HTTP-fel (#6), inkonsekvent felhantering (#8 och #13) och autentisering (#4). Teststrategin ska minska risken att sådana buggar återkommer.

## Testnivåer

- **Enhetstest:** testar ren logik och hjälpfunktioner isolerat, utan nätverk eller databas.
- **Komponenttest:** testar Vue-vyer och komponenter med Vue Testing Library utifrån vad användaren ser och gör.
- **API-/integrationstest:** används när vi behöver kontrollera routes, HTTP-status och samspelet mellan flera delar. Vi inför inte en fullständig E2E-svit i M2.

## Testkarta

| Kod i projektet | Nivå | Vad ska kontrolleras? |
| --- | --- | --- |
| `client/src/components/GuideCard.vue` | Komponent | Rätt guideinformation visas när komponenten får data. |
| `client/src/views/GuidesView.vue` | Komponent | Guider visas när API:et returnerar data. |
| `client/src/views/GuidesView.vue` | Komponent | Ett tydligt tomt läge visas när listan är tom. |
| `client/src/views/GuidesView.vue` | Komponent | Användaren får återkoppling om API-anropet misslyckas. |
| `client/src/views/ToursView.vue` | Komponent | Turer visas korrekt när data kommer. |
| `client/src/views/ToursView.vue` | Komponent | Tom lista och API-fel hanteras begripligt. |
| `api/src/lib/auth.js` | Enhet/integration | Ogiltig eller saknad autentisering hanteras enligt routens krav (skuld #4). |
| `api/src/routes/guides.js` | API/integration | Guidelistan har förväntad svarstruktur enligt `@utpost/shared`. |
| `api/src/routes/tours.js` | API/integration | Ogiltiga ID:n ger kontrollerat HTTP-fel utan att servern kraschar (skuld #5). |
| `api/src/routes/photos.js` | API/integration | Ogiltig indata ger ett kontrollerat fel. |

Tabellen visar vilka beteenden vi vill skydda. Filnamnen avser kodbasen vid beslutets datum och kan uppdateras när JavaScript-filer flyttas till TypeScript.

## Regler

**När får en PR mergas?** CI-jobben Kvalitet och Bygg ska vara gröna. Typkontroll, lint, formatkontroll och tester ska passera. PR:en ska också ha den granskning som teamets GitHub-regler kräver.

**Vad kräver en buggfix?** En reproducerbar bugg ska om möjligt först få ett regressionstest som blir rött. Testet ska ligga i en separat commit före fixen. Efter fixen ska testet bli grönt. Ange skuldnumret i testnamnet eller i en kommentar när buggen kommer från `docs/debt.md`.

**Hur mockas API:et?** I komponenttester ersätter vi nätverksanrop med kontrollerade testsvar för lyckat svar, tom data och fel. Testerna ska inte vara beroende av att en riktig API-server eller databas körs. API-routes testas separat där riktig HTTP-hantering behöver kontrolleras.

**Täckningskrav?** Vi sätter ingen generell procentsiffra i M2. Tolv meningsfulla tester som fångar verkliga buggar är viktigare än hög täckning av trivial kod. Vid varje PR bedömer vi vilka nya eller ändrade beteenden som behöver testas.

## Vad vi medvetet inte testar i M2

Vi testar inte Vue, Pinia eller Vitests interna funktioner. Vi skriver inte tester som enbart kontrollerar CSS-klassnamn eller att en variabel har tilldelats ett värde. Vi inför inte heller fullständiga webbläsarbaserade E2E-tester eller belastningstester i denna milstolpe.

## Alternativ vi jämförde

1. **Enbart manuella tester:** enkelt att börja med, men buggar kan återkomma utan att någon märker det.
2. **Enbart enhetstester:** snabba, men fångar inte alltid vad användaren faktiskt ser i Vue-vyerna.
3. **Enhetstester + Vue Testing Library + riktade API-tester (valt förslag):** ger både snabb kontroll av logik och kontroll av användarbeteende utan att kräva en stor E2E-miljö.

## Konsekvenser

Vi behöver lägga tid på att skriva och underhålla tester när beteenden ändras. I gengäld får teamet snabb återkoppling i CI och större möjlighet att upptäcka regressioner före merge.

Alla i teamet ska kunna förklara varför ett test ligger på sin valda nivå och vilket fel det är tänkt att upptäcka.
