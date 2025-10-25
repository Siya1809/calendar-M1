class SallesManager {
    constructor() {
        this.events = [];
        this.roomsMap = new Map(); // Map<roomName, Event[]>
        this.roomsInfo = new Map(); // Map<roomName, {floor: string}>
        this.allRooms = [];
        this.selectedRoom = null;
        this.currentDay = new Date();
        this.timeMode = 'now'; // 'now' ou 'custom'
        
        // Mapping des salles vers leurs IDs ADE (sauf TPR)
        this.roomAdeIds = {
            // C
            'C002': '9507',
            'C003': '9509',
            'C004': '9508',
            'C006': '9510',
            'C008': '9511',
            // TD
            'TD001': '8718',
            'TD005': '9513',
            'TD007': '9514',
            'TD009': '8055',
            'TD116': '9516',
            'TD120': '25450',
            'TD124': '9517',
            'TD126': '9519',
            'TD128': '9520',
            'TD130': '9521',
            // TP
            'TP101': '9512',
            'TP103': '9522',
            'TP105': '9523',
            'TP107': '9524',
            'TP108': '9529',
            'TP109': '9525',
            'TP110': '9530',
            'TP112': '9531',
            'TP114': '9532',
            'TP115': '9526',
            'TP117': '9527',
            'TP119': '9528',
            'TP121': '36267',
            'TP123': '6661'
        };
        
        this.init();
    }

    async init() {
        await this.loadICSFile();
        this.organizeEventsByRoom();
        this.populateRoomDropdown();
        this.setupCustomDateDefaults();
        this.displayAvailableNow();
        this.hideLoader();
        
        // Actualiser les salles dispo toutes les minutes (si mode "now")
        setInterval(() => {
            if (this.timeMode === 'now') {
                this.displayAvailableNow();
            }
        }, 60000);
    }

    setupCustomDateDefaults() {
        const today = new Date();
        document.getElementById('customDate').value = today.toISOString().split('T')[0];
        document.getElementById('customDate').min = today.toISOString().split('T')[0];
    }

    async loadICSFile() {
        try {
            const response = await fetch('ADECal.ics');
            const text = await response.text();
            this.parseICS(text);
        } catch (error) {
            console.error('Erreur de chargement du fichier ICS:', error);
            alert('Impossible de charger le calendrier ADE.');
        }
    }

    parseICS(icsText) {
        const lines = icsText.split('\n');
        let currentEvent = null;

        for (let line of lines) {
            line = line.trim();

            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
            } else if (line === 'END:VEVENT' && currentEvent) {
                if (currentEvent.location && currentEvent.start && currentEvent.end) {
                    const roomsData = this.extractRooms(currentEvent.location);
                    roomsData.forEach(({ name, floor }) => {
                        this.events.push({
                            summary: currentEvent.summary || 'Sans titre',
                            start: this.parseICSDate(currentEvent.start),
                            end: this.parseICSDate(currentEvent.end),
                            room: name,
                            description: currentEvent.description || ''
                        });
                        
                        // Stocker l'info de l'étage
                        if (!this.roomsInfo.has(name)) {
                            this.roomsInfo.set(name, { floor });
                        }
                    });
                }
                currentEvent = null;
            } else if (currentEvent) {
                if (line.startsWith('DTSTART:')) {
                    currentEvent.start = line.substring(8);
                } else if (line.startsWith('DTEND:')) {
                    currentEvent.end = line.substring(6);
                } else if (line.startsWith('SUMMARY:')) {
                    currentEvent.summary = line.substring(8);
                } else if (line.startsWith('LOCATION:')) {
                    currentEvent.location = line.substring(9);
                } else if (line.startsWith('DESCRIPTION:')) {
                    currentEvent.description = line.substring(12);
                }
            }
        }

        console.log(`${this.events.length} événements chargés`);
    }

    extractRooms(locationString) {
        const parts = locationString.split(/[,\\]/);
        const roomsData = [];
        
        parts.forEach(part => {
            part = part.trim();
            if (part.includes('Nautibus')) {
                // Extraire le nom de la salle et l'étage
                const roomMatch = part.match(/Nautibus\s+([A-Z]+\d+[A-Z]?\d*)/i);
                const floorMatch = part.match(/\((.*?étage|RDC)\)/i);
                
                if (roomMatch) {
                    roomsData.push({
                        name: roomMatch[1],
                        floor: floorMatch ? floorMatch[1] : 'Étage inconnu'
                    });
                }
            }
        });
        
        return roomsData;
    }

    parseICSDate(icsDate) {
        // Format: 20251022T134500Z (UTC)
        const year = icsDate.substring(0, 4);
        const month = icsDate.substring(4, 6);
        const day = icsDate.substring(6, 8);
        const hour = icsDate.substring(9, 11);
        const minute = icsDate.substring(11, 13);
        
        // Créer la date en UTC puis convertir en heure locale
        const utcDate = new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute)
        ));
        
        return utcDate;
    }

    organizeEventsByRoom() {
        this.events.forEach(event => {
            if (!this.roomsMap.has(event.room)) {
                this.roomsMap.set(event.room, []);
            }
            this.roomsMap.get(event.room).push(event);
        });

        // Trier les événements de chaque salle par date
        this.roomsMap.forEach(events => {
            events.sort((a, b) => a.start - b.start);
        });

        this.allRooms = Array.from(this.roomsMap.keys()).sort();
        this.filteredRooms = [...this.allRooms];
        
        console.log(`${this.allRooms.length} salles Nautibus trouvées`);
    }

    populateRoomDropdown() {
        const select = document.getElementById('roomSelect');

        // Réinitialiser le select
        select.innerHTML = '<option value="">-- Choisir une salle --</option>';
        
        // Ajouter les options groupées par type
        const grouped = this.groupRoomsByType(this.allRooms);
        
        Object.entries(grouped).forEach(([type, roomList]) => {
            if (roomList.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = type;
                
                roomList.forEach(room => {
                    const option = document.createElement('option');
                    option.value = room;
                    const events = this.roomsMap.get(room);
                    const futureEvents = events.filter(e => e.start > new Date());
                    const roomInfo = this.roomsInfo.get(room);
                    const floor = roomInfo ? ` • ${roomInfo.floor}` : '';
                    option.textContent = `${room}${floor}`;
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });
    }

    groupRoomsByType(rooms) {
        const groups = {
            'Salles TD': [],
            'Salles TP': [],
            'Salles C': [],
            'Autres': []
        };

        rooms.forEach(room => {
            const roomUpper = room.toUpperCase();
            if (roomUpper.startsWith('TD')) groups['Salles TD'].push(room);
            else if (roomUpper.startsWith('TP')) groups['Salles TP'].push(room);
            else if (roomUpper.startsWith('C')) groups['Salles C'].push(room);
            else groups['Autres'].push(room);
        });

        return groups;
    }

    displayAvailableNow() {
        let checkTime;
        
        if (this.timeMode === 'now') {
            checkTime = new Date();
        } else {
            const dateInput = document.getElementById('customDate').value;
            const timeInput = document.getElementById('customTime').value;
            
            if (!dateInput || !timeInput) {
                alert('Veuillez sélectionner une date et une heure');
                return;
            }
            
            checkTime = new Date(`${dateInput}T${timeInput}:00`);
        }

        const availableRooms = [];

        this.allRooms.forEach(room => {
            const events = this.roomsMap.get(room);
            const isOccupied = events.some(event => 
                event.start <= checkTime && event.end > checkTime
            );
            
            if (!isOccupied) {
                // Trouver le prochain cours DANS LA MÊME JOURNÉE
                const endOfDay = new Date(checkTime);
                endOfDay.setHours(23, 59, 59, 999);
                
                const nextEvent = events.find(e => 
                    e.start > checkTime && e.start <= endOfDay
                );
                
                const roomInfo = this.roomsInfo.get(room);
                availableRooms.push({ room, nextEvent, floor: roomInfo?.floor });
            }
        });

        const listDiv = document.getElementById('availableNowList');
        
        if (availableRooms.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <p>😔 Aucune salle disponible pour ce créneau</p>
                </div>
            `;
            return;
        }

        const timeLabel = this.timeMode === 'now' 
            ? `Maintenant (${this.formatTime(checkTime)})`
            : `Le ${this.formatDateShort(checkTime)} à ${this.formatTime(checkTime)}`;

        listDiv.innerHTML = `
            <div class="available-count">
                <div class="count-number">${availableRooms.length}</div>
                <div class="count-label">salle${availableRooms.length > 1 ? 's' : ''} disponible${availableRooms.length > 1 ? 's' : ''}</div>
                <div class="count-time">${timeLabel}</div>
            </div>
            <div class="available-list">
                ${availableRooms.map(({ room, nextEvent, floor }) => {
                    const nextEventText = nextEvent ? 
                        `jusqu'à ${this.formatTime(nextEvent.start)}` : 
                        `toute la journée`;
                    
                    const adeLink = this.getAdeLink(room);
                    const isTPR = room.toUpperCase().includes('TPR');
                    
                    return `
                    <div class="available-room-row" onclick="sallesManager.selectRoom('${room}', true)">
                        <div class="room-row-icon">${this.getRoomIcon(room)}</div>
                        <div class="room-row-info">
                            <div class="room-row-name">${room}</div>
                            <div class="room-row-floor">${floor || ''}</div>
                        </div>
                        <div class="room-row-status">
                            <span class="status-badge">✅ Disponible</span>
                            <span class="status-duration">${nextEventText}</span>
                        </div>
                        ${!isTPR && adeLink ? `
                            <a href="${adeLink}" target="_blank" class="ade-link" onclick="event.stopPropagation()" title="Voir sur ADE">
                                🔗
                            </a>
                        ` : ''}
                    </div>
                `}).join('')}
            </div>
        `;
    }

    setTimeMode(mode) {
        this.timeMode = mode;
        
        // Update buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Show/hide custom form
        const form = document.getElementById('customTimeForm');
        if (mode === 'custom') {
            form.style.display = 'block';
        } else {
            form.style.display = 'none';
            this.displayAvailableNow();
        }
    }

    toggleAvailableNow() {
        const content = document.getElementById('availableNowContent');
        const icon = document.getElementById('toggleIcon');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.textContent = '▼';
        } else {
            content.style.display = 'none';
            icon.textContent = '▶';
        }
    }

    selectRoomFromDropdown() {
        const select = document.getElementById('roomSelect');
        const roomName = select.value;
        
        if (roomName) {
            this.selectRoom(roomName);
        }
    }

    getRoomIcon(room) {
        const roomUpper = room.toUpperCase();
        if (roomUpper.startsWith('TD')) return '🎓';
        if (roomUpper.startsWith('TP')) return '💻';
        if (roomUpper.startsWith('C')) return '📚';
        if (roomUpper.includes('AMPHI')) return '🎭';
        return '🚪';
    }

    getAdeLink(room) {
        const adeId = this.roomAdeIds[room];
        if (!adeId) return null;
        
        return `https://edt.univ-lyon1.fr/direct/index.jsp?projectId=1&ShowPianoWeeks=true&displayConfName=DOUA_CHBIO&showTree=false&resources=${adeId}&days=0,1,2,3,4`;
    }

    selectRoom(roomName, useCustomDate = false) {
        this.selectedRoom = roomName;
        
        // Si on vient des salles disponibles, utiliser la date de recherche
        if (useCustomDate && this.timeMode === 'custom') {
            const dateInput = document.getElementById('customDate').value;
            if (dateInput) {
                this.currentDay = new Date(dateInput);
                this.currentDay.setHours(0, 0, 0, 0);
            } else {
                this.currentDay = new Date();
                this.currentDay.setHours(0, 0, 0, 0);
            }
        } else {
            this.currentDay = new Date();
            this.currentDay.setHours(0, 0, 0, 0);
        }
        
        document.getElementById('roomTitle').textContent = `📅 ${roomName}`;
        document.getElementById('calendarCard').style.display = 'block';
        
        // Gérer le bouton ADE
        const adeButton = document.getElementById('adeButton');
        const adeLink = this.getAdeLink(roomName);
        const isTPR = roomName.toUpperCase().includes('TPR');
        
        if (!isTPR && adeLink) {
            adeButton.href = adeLink;
            adeButton.style.display = 'inline-flex';
        } else {
            adeButton.style.display = 'none';
        }
        
        this.displayDayCalendar();
        
        // Scroll vers le calendrier
        document.getElementById('calendarCard').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    displayDayCalendar() {
        const events = this.roomsMap.get(this.selectedRoom) || [];
        const dayEnd = new Date(this.currentDay);
        dayEnd.setDate(dayEnd.getDate() + 1);

        // Filtrer les événements du jour
        const dayEvents = events.filter(e => 
            e.start >= this.currentDay && e.start < dayEnd
        ).sort((a, b) => a.start - b.start);

        // Afficher la date
        const isToday = this.currentDay.toDateString() === new Date().toDateString();
        document.getElementById('dayDisplay').textContent = isToday 
            ? `Aujourd'hui • ${this.formatDateLong(this.currentDay)}`
            : this.formatDateLong(this.currentDay);

        // Générer la vue
        const dayView = document.getElementById('dayView');
        
        if (dayEvents.length === 0) {
            dayView.innerHTML = `
                <div class="empty-day">
                    <div class="empty-icon">📭</div>
                    <p>Aucun cours prévu ce jour</p>
                </div>
            `;
            return;
        }

        dayView.innerHTML = `
            <div class="events-list">
                ${dayEvents.map(event => this.renderDayEvent(event)).join('')}
            </div>
        `;
    }

    renderDayEvent(event) {
        const duration = (event.end - event.start) / (1000 * 60); // minutes
        const color = this.getEventColor(event.summary);
        
        return `
            <div class="day-event" style="background: ${color};">
                <div class="event-time">${this.formatTime(event.start)} - ${this.formatTime(event.end)}</div>
                <div class="event-title">${event.summary}</div>
                <div class="event-meta">
                    <span>⏱️ ${this.formatDuration(duration)}</span>
                </div>
            </div>
        `;
    }

    previousDay() {
        this.currentDay.setDate(this.currentDay.getDate() - 1);
        this.displayDayCalendar();
    }

    nextDay() {
        this.currentDay.setDate(this.currentDay.getDate() + 1);
        this.displayDayCalendar();
    }

    formatDateLong(date) {
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    getEventColor(summary) {
        const summaryLower = summary.toLowerCase();
        if (summaryLower.includes('examen')) return 'linear-gradient(135deg, #EF4444, #DC2626)';
        if (summaryLower.includes('tp')) return 'linear-gradient(135deg, #8B5CF6, #7C3AED)';
        if (summaryLower.includes('td')) return 'linear-gradient(135deg, #3B82F6, #2563EB)';
        if (summaryLower.includes('cm')) return 'linear-gradient(135deg, #10B981, #059669)';
        return 'linear-gradient(135deg, #64748B, #475569)';
    }

    getDayName(date) {
        const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return days[date.getDay()];
    }

    formatTime(date) {
        return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    formatDateShort(date) {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}min`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h${mins}`;
    }

    hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }
}

// Initialisation
const sallesManager = new SallesManager();
