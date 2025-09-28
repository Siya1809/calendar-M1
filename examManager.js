// Gestion des données
class ExamManager {
    constructor() {
        this.exams = [];
        this.loadExams();
    }

    async loadExams() {
        try {
            const response = await fetch('examens.json');
            if (!response.ok) {
                throw new Error('Impossible de charger les examens');
            }
            const examData = await response.json();
            
            // Ajouter la propriété datetime à chaque examen
            this.exams = examData.map(exam => ({
                ...exam,
                datetime: new Date(`${exam.date}T${exam.time}`)
            }));
            
            this.updateDisplays();
            this.startTimers();
        } catch (error) {
            console.error('Erreur lors du chargement des examens:', error);
            this.showError('Impossible de charger les examens. Vérifiez votre connexion.');
        }
    }

    showError(message) {
        const container = document.getElementById('nextExamContent');
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <p style="color: var(--danger);">${message}</p>
            </div>
        `;
    }

    // Pas besoin de sauvegarder en statique

    getUpcomingExams() {
        const now = new Date();
        return this.exams
            .filter(exam => exam.datetime > now)
            .sort((a, b) => a.datetime - b.datetime);
    }

    getNextExam() {
        const upcoming = this.getUpcomingExams();
        return upcoming.length > 0 ? upcoming[0] : null;
    }

    updateDisplays() {
        this.displayNextExam();
        this.displayAllExams();
    }

    displayNextExam() {
        const nextExam = this.getNextExam();
        const content = document.getElementById('nextExamContent');
        
        if (!nextExam) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📚</div>
                    <p>Aucun examen programmé</p>
                </div>
            `;
            return;
        }

        const timeLeft = this.getTimeLeft(nextExam.datetime);
        const upcomingExams = this.getUpcomingExams().slice(1, 3); // 2 examens suivants

        content.innerHTML = `
            <div class="countdown" id="mainCountdown">${timeLeft}</div>
            <div class="exam-details">
                <h3>${nextExam.ue}</h3>
                <p><strong>Type:</strong> ${nextExam.type}</p>
                <p><strong>Date:</strong> ${this.formatDate(nextExam.datetime)}</p>
                <p><strong>Heure:</strong> ${this.formatTime(nextExam.datetime)}</p>
                <p><strong>Durée:</strong> ${nextExam.duration} min</p>
                <p><strong>Lieu:</strong> ${nextExam.location}</p>
            </div>
            ${upcomingExams.length > 0 ? `
                <div class="upcoming-timers">
                    ${upcomingExams.map(exam => `
                        <div class="timer-item">
                            <div>${exam.ue} - ${exam.type}</div>
                            <div class="timer-countdown" data-datetime="${exam.datetime.toISOString()}">
                                ${this.getTimeLeft(exam.datetime)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    displayAllExams() {
        const container = document.getElementById('examsList');
        const upcoming = this.getUpcomingExams();
        
        if (upcoming.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <p>Aucun examen planifié</p>
                </div>
            `;
            return;
        }

        container.innerHTML = upcoming.map(exam => {
            const timeLeft = this.getTimeLeft(exam.datetime);
            const daysLeft = Math.ceil((exam.datetime - new Date()) / (1000 * 60 * 60 * 24));
            
            let examClass = 'exam-item';
            if (daysLeft <= 1) examClass += ' urgent';
            else if (daysLeft <= 3) examClass += ' today';

            return `
                <div class="${examClass}" onclick="examManager.showExamDetails(${exam.id})" style="cursor: pointer;">
                    <div class="exam-type type-${exam.type.toLowerCase()}">${exam.type}</div>
                    <h3>${exam.ue}</h3>
                    <p><strong>📅</strong> ${this.formatDate(exam.datetime)} à ${this.formatTime(exam.datetime)}</p>
                    <p><strong>📍</strong> ${exam.location}</p>
                    <p><strong>⏱️</strong> ${exam.duration} minutes</p>
                    <div class="exam-countdown" data-datetime="${exam.datetime.toISOString()}">${timeLeft}</div>
                    <div style="text-align: center; margin-top: 10px; color: var(--text-light); font-size: 0.9rem;">
                        👆 Cliquer pour plus de détails
                    </div>
                </div>
            `;
        }).join('');
    }

    showExamDetails(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) return;

        // Remplir la modale
        document.getElementById('modalTitle').textContent = exam.ue;
        
        const modalType = document.getElementById('modalType');
        modalType.textContent = exam.type;
        modalType.className = `modal-type type-${exam.type.toLowerCase()}`;

        const modalInfo = document.getElementById('modalInfo');
        modalInfo.innerHTML = `
            <div class="info-item">
                <div class="info-icon">📅</div>
                <div class="info-content">
                    <div class="info-label">Date</div>
                    <div class="info-value">${this.formatDate(exam.datetime)}</div>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">🕐</div>
                <div class="info-content">
                    <div class="info-label">Heure</div>
                    <div class="info-value">${this.formatTime(exam.datetime)}</div>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">⏱️</div>
                <div class="info-content">
                    <div class="info-label">Durée</div>
                    <div class="info-value">${exam.duration} minutes</div>
                </div>
            </div>
            <div class="info-item">
                <div class="info-icon">📍</div>
                <div class="info-content">
                    <div class="info-label">Lieu</div>
                    <div class="info-value">${exam.location}</div>
                </div>
            </div>
        `;

        // Mettre à jour le countdown
        const updateModalCountdown = () => {
            const timeLeft = this.getTimeLeft(exam.datetime);
            document.getElementById('modalCountdownValue').textContent = timeLeft;
        };
        
        updateModalCountdown();
        
        // Stocker la fonction de mise à jour pour la clearner plus tard
        this.modalCountdownInterval = setInterval(updateModalCountdown, 1000);

        // Afficher la modale
        document.getElementById('examModal').classList.add('active');
        document.body.style.overflow = 'hidden'; // Empêcher le scroll
    }

    hideExamDetails() {
        document.getElementById('examModal').classList.remove('active');
        document.body.style.overflow = ''; // Restaurer le scroll
        
        // Arrêter la mise à jour du countdown
        if (this.modalCountdownInterval) {
            clearInterval(this.modalCountdownInterval);
            this.modalCountdownInterval = null;
        }
    }

    getTimeLeft(datetime) {
        const now = new Date();
        const diff = datetime - now;
        
        if (diff <= 0) return "Terminé";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) return `${days}j ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        return `${minutes}m ${seconds}s`;
    }

    formatDate(date) {
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    startTimers() {
        setInterval(() => {
            // Mettre à jour le timer principal
            const mainCountdown = document.getElementById('mainCountdown');
            if (mainCountdown) {
                const nextExam = this.getNextExam();
                if (nextExam) {
                    mainCountdown.textContent = this.getTimeLeft(nextExam.datetime);
                }
            }

            // Mettre à jour tous les timers
            document.querySelectorAll('[data-datetime]').forEach(element => {
                const datetime = new Date(element.dataset.datetime);
                element.textContent = this.getTimeLeft(datetime);
            });
        }, 1000);
    }

    // Nouvelles méthodes pour le calendrier
    generateCalendar(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const calendarGrid = document.getElementById('calendarGrid');
        calendarGrid.innerHTML = '';

        // En-têtes des jours
        const dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            calendarGrid.appendChild(header);
        });

        // Générer 42 jours (6 semaines)
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            // Classes spéciales
            if (currentDate.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            const today = new Date();
            if (currentDate.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }

            // Numéro du jour
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDate.getDate();
            dayElement.appendChild(dayNumber);

            // Examens de ce jour
            const dayExams = this.getExamsForDate(currentDate);
            dayExams.forEach(exam => {
                const examElement = document.createElement('div');
                examElement.className = `day-exam type-${exam.type.toLowerCase()}`;
                examElement.textContent = `${exam.time} ${exam.ue}`;
                examElement.title = `Cliquer pour voir les détails`;
                examElement.style.cursor = 'pointer';
                examElement.onclick = (e) => {
                    e.stopPropagation();
                    this.showExamDetails(exam.id);
                };
                dayElement.appendChild(examElement);
            });

            calendarGrid.appendChild(dayElement);
        }

        // Mettre à jour le titre du mois
        const monthNames = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    }

    getExamsForDate(date) {
        const dateString = date.toISOString().split('T')[0];
        return this.exams.filter(exam => exam.date === dateString);
    }
}