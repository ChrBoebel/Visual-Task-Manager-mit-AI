# Kanban Board mit KI-Assistent

Organisiere Aufgaben visuell mit Drag-and-Drop. Der integrierte KI-Assistent erstellt und verwaltet Karten auf natürliche Anfrage.

![Screenshot der Anwendung](frontend/image.png)

## Was macht diese Anwendung?

Verwalte deine Aufgaben in übersichtlichen Boards. Erstelle Listen für verschiedene Status (z.B. "Backlog", "In Progress", "Done") und verschiebe Karten zwischen ihnen - ganz einfach per Drag-and-Drop.

**Das Besondere:** Der eingebaute KI-Assistent versteht deine Anweisungen auf Deutsch und hilft dir beim Organisieren. Sag einfach "Erstelle eine Karte für das Meeting morgen" und der Assistent erledigt es für dich.

## Funktionen

- **Boards erstellen** - Organisiere verschiedene Projekte getrennt
- **Listen hinzufügen** - Spalten für verschiedene Arbeitsphasen
- **Karten erstellen** - Einzelne Aufgaben mit Details wie Beschreibung, Labels und Fälligkeitsdatum
- **Drag-and-Drop** - Verschiebe Karten und Listen einfach mit der Maus
- **KI-Assistent** - Erstellt und bearbeitet Aufgaben auf Zuruf in natürlicher Sprache

## Installation

### Voraussetzungen
- Node.js 18+
- Python 3.11+
- PostgreSQL

### Backend einrichten

1. Zum Backend-Ordner navigieren:
```bash
cd backend
```

2. Virtuelle Umgebung erstellen:
```bash
python -m venv venv
source venv/bin/activate  # Auf Windows: venv\Scripts\activate
```

3. Abhängigkeiten installieren:
```bash
pip install -r requirements.txt
```

4. `.env`-Datei erstellen und konfigurieren:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slack_clone
GEMINI_API_KEY=dein-google-gemini-api-key
CORS_ORIGINS=http://localhost:5173
```

5. Anwendung starten:
```bash
python run.py
```

Backend läuft auf http://localhost:8080

### Frontend einrichten

1. Zum Frontend-Ordner navigieren:
```bash
cd frontend
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Development-Server starten:
```bash
npm run dev
```

Frontend läuft auf http://localhost:5173

## Verwendung

### Grundfunktionen
1. **Board erstellen**: Klicke in der Sidebar auf "Neues Board"
2. **Liste hinzufügen**: Klicke auf "+ Weitere Liste" auf dem Board
3. **Karte erstellen**: Klicke in einer Liste auf "+ Add a card"
4. **Verschieben**: Ziehe Karten und Listen per Drag-and-Drop
5. **Bearbeiten**: Klicke auf eine Karte, um Details zu bearbeiten

### KI-Assistent verwenden
1. **Öffnen**: Klicke auf den Chat-Button unten rechts
2. **Befehle geben**: Schreibe z.B.:
   - "Erstelle eine Karte mit dem Titel 'Meeting vorbereiten'"
   - "Verschiebe die Karte 'Konzept' in die Liste 'Fertig'"
   - "Erstelle eine neue Liste mit dem Namen 'Backlog'"
   - "Zeige mir alle Karten"
3. **Kontext**: Der Assistent kennt dein Board und kann komplexe Aufgaben ausführen

## Technologie

### Frontend
- React 18 + TypeScript
- Vite (Build-Tool)
- TailwindCSS (Styling)
- @dnd-kit (Drag-and-Drop)
- Lucide React (Icons)

### Backend
- Python 3.11+ mit FastAPI
- SQLAlchemy + PostgreSQL (Datenbank)
- LangChain + Google Gemini (KI-Agent)
- Pydantic (Datenvalidierung)

## API-Dokumentation

Sobald das Backend läuft, besuche:
- Swagger UI: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc

## Lizenz

MIT
