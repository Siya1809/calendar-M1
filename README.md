# 📅 Calendrier Master 1

Un calendrier d'examens moderne et responsive pour les étudiants de Master 1.

## 🚀 Fonctionnalités

- **Vue liste** avec détails complets des examens
- **Vue calendrier** visuelle avec navigation mensuelle  
- **Timer en temps réel** pour le prochain examen
- **Timers** des 3 prochains examens
- **Popup détaillé** pour chaque examen (optimisé mobile)
- **Design responsive** parfait pour mobile
- **Mode sombre** automatique
- **Stockage statique** sécurisé (fichier JSON)

## 📁 Structure des fichiers

```
calendar-M1/
├── index.html          # Page principale (HTML pur)
├── styles.css          # Styles CSS (responsive + mobile)
├── examManager.js      # Gestion des données et affichage
├── calendarManager.js  # Gestion de la vue calendrier
├── app.js             # Initialisation et événements
├── examens.json       # Vos données d'examens
└── README.md          # Ce fichier
```

## 📝 Comment ajouter/modifier des examens

1. **Ouvrez** le fichier `examens.json`
2. **Ajoutez/modifiez** les examens selon ce format :

```json
{
    "id": 6,
    "ue": "Intelligence Artificielle", 
    "type": "EXAMEN",
    "date": "2025-12-01",
    "time": "10:00", 
    "duration": 180,
    "location": "Amphi D"
}
```

### Types disponibles :
- `CC` - Contrôle Continu
- `EXAMEN` - Examen final  
- `TPN` - Travaux pratiques notés
- `TP` - Travaux pratiques

### Formats requis :
- **Date** : `YYYY-MM-DD` (ex: 2025-12-01)
- **Heure** : `HH:MM` (ex: 14:30)  
- **Durée** : en minutes (ex: 120)

## 🌐 Hébergement sur GitHub Pages

1. **Commitez** vos fichiers :
```bash
git add .
git commit -m "Calendrier d'examens"
git push origin main
```

2. **Activez GitHub Pages** :
   - Allez dans Settings → Pages
   - Source : Deploy from branch → main
   - Votre site sera à : `https://username.github.io/calendar-M1`

## 🎨 Personnalisation

### Couleurs (dans `styles.css`) :
```css
:root {
    --primary: #667eea;    /* Couleur principale */
    --secondary: #764ba2;  /* Couleur secondaire */ 
    --success: #48bb78;    /* Vert (prochain examen) */
    --danger: #f56565;     /* Rouge (urgent) */
}
```

### Types d'examens (codes couleur) :
- **CC** : Rouge (#c53030)
- **EXAMEN** : Orange (#dd6b20) 
- **TPN** : Vert (#38a169)
- **TP** : Bleu (#3182ce)

## 📱 Optimisations mobile

- **Design mobile-first** avec CSS Grid
- **Popup slide-up** sur mobile (comme les apps natives)
- **Zones tactiles** de 44px minimum  
- **Animations fluides** et **gestures intuitifs**
- **Scroll bloqué** pendant l'affichage des modales

## 🛠️ Technologies utilisées

- **HTML5** sémantique
- **CSS3** moderne (Grid, Flexbox, Variables CSS)
- **JavaScript ES6+** (Classes, Modules, Fetch API)
- **Aucune dépendance** externe

## 🔒 Sécurité

- **Site statique** : aucune base de données
- **Données locales** : tout stocké dans `examens.json`
- **Pas d'authentification** requise
- **HTTPS** automatique avec GitHub Pages

## 📊 Performance

- **Léger** : ~20KB total  
- **Rapide** : chargement instantané
- **Offline** : fonctionne une fois chargé
- **SEO friendly** : HTML sémantique

---

**Fait avec ❤️ pour les étudiants de Master 1**