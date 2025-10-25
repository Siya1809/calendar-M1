class SallesManager {
    constructor() {
        this.events = [];
        this.roomsMap = new Map(); // Map<roomName, Event[]>
        this.roomsInfo = new Map(); // Map<roomName, {floor: string}>
        this.allRooms = [];
        this.selectedRoom = null;
        this.currentWeekStart = new Date();
        this.timeMode = 'now'; // 'now' ou 'custom'
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
                // Trouver le prochain cours
                const nextEvent = events.find(e => e.start > checkTime);
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
            <div class="available-grid">
                ${availableRooms.map(({ room, nextEvent, floor }) => `
                    <div class="available-room-card" onclick="sallesManager.selectRoom('${room}')">
                        <div class="available-room-icon">${this.getRoomIcon(room)}</div>
                        <div class="available-room-name">${room}</div>
                        <div class="available-room-floor">${floor || ''}</div>
                        ${nextEvent ? 
                            `<div class="available-room-next">Libre jusqu'à ${this.formatTime(nextEvent.start)}</div>` :
                            `<div class="available-room-next available-all-day">Libre toute la journée</div>`
                        }
                    </div>
                `).join('')}
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

    selectRoom(roomName) {
        this.selectedRoom = roomName;
        this.currentWeekStart = this.getMonday(new Date());
        
        document.getElementById('roomTitle').textContent = `📅 ${roomName}`;
        document.getElementById('calendarCard').style.display = 'block';
        
        this.displayWeekCalendar();
        
        // Scroll vers le calendrier
        document.getElementById('calendarCard').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    getMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    displayWeekCalendar() {
        const events = this.roomsMap.get(this.selectedRoom) || [];
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        // Filtrer les événements de la semaine
        const weekEvents = events.filter(e => 
            e.start >= this.currentWeekStart && e.start < weekEnd
        );

        // Afficher la période
        document.getElementById('weekDisplay').textContent = 
            `${this.formatDateShort(this.currentWeekStart)} - ${this.formatDateShort(new Date(weekEnd.getTime() - 86400000))}`;

        // Générer le calendrier
        const calendarView = document.getElementById('calendarView');
        let html = '';

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(this.currentWeekStart);
            currentDay.setDate(currentDay.getDate() + i);
            
            const dayEvents = weekEvents.filter(e => 
                e.start.toDateString() === currentDay.toDateString()
            );

            const isToday = currentDay.toDateString() === new Date().toDateString();

            html += `
                <div class="day-column ${isToday ? 'today' : ''}">
                    <div class="day-header">
                        <div class="day-name">${this.getDayName(currentDay)}</div>
                        <div class="day-date">${currentDay.getDate()}/${currentDay.getMonth() + 1}</div>
                    </div>
                    <div class="day-events">
                        ${dayEvents.length === 0 ? 
                            '<div class="no-event">Aucun cours</div>' :
                            dayEvents.map(event => this.renderEvent(event)).join('')
                        }
                    </div>
                </div>
            `;
        }

        calendarView.innerHTML = html;
    }

    renderEvent(event) {
        const duration = (event.end - event.start) / (1000 * 60); // minutes
        const color = this.getEventColor(event.summary);
        
        return `
            <div class="calendar-event" style="background: ${color};">
                <div class="event-time-range">
                    ${this.formatTime(event.start)} - ${this.formatTime(event.end)}
                </div>
                <div class="event-summary">${event.summary}</div>
                <div class="event-duration">${this.formatDuration(duration)}</div>
            </div>
        `;
    }

    getEventColor(summary) {
        const summaryLower = summary.toLowerCase();
        if (summaryLower.includes('examen')) return 'linear-gradient(135deg, #EF4444, #DC2626)';
        if (summaryLower.includes('tp')) return 'linear-gradient(135deg, #8B5CF6, #7C3AED)';
        if (summaryLower.includes('td')) return 'linear-gradient(135deg, #3B82F6, #2563EB)';
        if (summaryLower.includes('cm')) return 'linear-gradient(135deg, #10B981, #059669)';
        return 'linear-gradient(135deg, #64748B, #475569)';
    }

    previousWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.displayWeekCalendar();
    }

    nextWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.displayWeekCalendar();
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
