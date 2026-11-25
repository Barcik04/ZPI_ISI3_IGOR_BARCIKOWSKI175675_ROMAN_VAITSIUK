# SmartStudy — AI planer nauki

Fullstackowa aplikacja demonstracyjna zbudowana na podstawie sprawozdania **„SmartStudy – System planowania nauki oparty na sztucznej inteligencji”** (ZPI, UWM Olsztyn · Igor Barcikowski, Roman Vaitsiuk).

Nacisk położono na dopracowany interfejs i kompletne funkcjonalności. Backend jest celowo prosty: Express i plik JSON zamiast bazy danych, a „AI” działa w **trybie regułowym**. Taki tryb opisuje sprawozdanie jako zabezpieczenie kosztów AI, więc nie trzeba żadnych kluczy API.

## Szybki start

Wymagany Node.js 18+.

```bash
cd smartstudy
npm run setup      # instaluje zależności (root, server, client)
npm run dev        # API :4000 + frontend :5173
```

Otwórz <http://localhost:5173> i kliknij **„Wejdź na konto demo”** (`demo@smartstudy.pl` / `demo123`).

Wersja produkcyjna (jeden serwer):

```bash
npm run build && npm start   # http://localhost:4000
```

`npm run seed` resetuje bazę i odtwarza dane demo. Daty są liczone względem dnia uruchomienia, więc dane zawsze wyglądają świeżo.

## Moduły ze sprawozdania → funkcje aplikacji

| Moduł (TRL III–VI) | W aplikacji |
|---|---|
| **1. Generowanie planu** | Planer przeplata przedmioty według pilności (pozostały materiał / dni do terminu) i trudności. Nigdy nie przekracza zadeklarowanej dostępności, a sesji nie planuje po egzaminie. Dzień przed egzaminem wstawia powtórkę generalną. |
| **2. Analiza materiałów AI** | Wklejony sylabus lub notatka zamienia się w listę tematów z trudnością 1–5, szacowanym czasem i pewnością. Student zatwierdza i poprawia listę, zanim trafi do planu. |
| **3. Automatyczna korekta** | Opuszczona sesja lub nowy dzień uruchamia przeliczenie planu. Przy deficycie czasu aplikacja mówi to wprost i proponuje trzy opcje: +X min dziennie, ograniczenie zakresu albo zmianę priorytetów. |
| **4. Powtórki 1·3·7** | Spaced repetition wpięte w harmonogram, bez powtórek po egzaminie. Fiszki 3D z samooceną (klawisze 1–4) zmieniają poziom opanowania tematu. |
| **5. Notatki + rysik** | Edytor markdown oraz płótno z obsługą nacisku rysika (Pointer Events). Przełącznik „Dostęp AI” pokazuje uczciwy status: pismo odręczne jest zapisywane jako obraz, a OCR jest w przygotowaniu. |

Dodatkowo:
- **Kreator AI** – pierwszy plan w 4 krokach,
- **Asystent** – czat o planie, terminach i postępach, z efektem strumieniowania,
- **Tryb skupienia** – Pomodoro z szumem tła (WebAudio),
- **Statystyki** – heatmapa, krzywa zapominania, obciążenie planu, status hipotez H1–H4,
- **Paleta poleceń** – `Ctrl+K`,
- **Model freemium** – Free: 3 przedmioty, Premium: 99 zł/rok (płatność symulowana).

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, lucide-react, sonner, canvas-confetti
- **Backend:** Node.js + Express, dane w `server/data/db.json`, hasła haszowane scrypt, tokeny Bearer

```
smartstudy/
├── server/src
│   ├── index.js      # serwer + serwowanie zbudowanego frontendu
│   ├── routes.js     # REST API
│   ├── planner.js    # moduły 1, 3, 4
│   ├── ai.js         # moduł 2 + asystent (tryb regułowy)
│   ├── stats.js      # statystyki i wskazówki
│   └── seed.js       # konto demo
└── client/src
    ├── pages/        # Landing, Auth, Dashboard, Plan, Subjects, Wizard, Analyze, Reviews, Notes, Assistant, Focus, Stats, Settings
    ├── components/   # UI kit, Analyzer, DrawingCanvas, Availability, SessionItem…
    └── layout/       # sidebar, paleta poleceń
```
