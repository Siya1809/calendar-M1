// Gestion du calendrier
class CalendarManager {
    constructor(examManager) {
        this.examManager = examManager;
        this.initStartingDate();
        
        this.initEventListeners();
        this.updateCalendar();
    }

    initStartingDate() {
        // Trouver le prochain examen pour déterminer le mois de départ
        const upcomingExams = this.examManager.getUpcomingExams();
        
        if (upcomingExams.length > 0) {
            // Démarrer sur le mois du prochain examen
            const nextExamDate = upcomingExams[0].datetime;
            this.currentYear = nextExamDate.getFullYear();
            this.currentMonth = nextExamDate.getMonth();
        } else {
            // Si pas d'examens à venir, prendre le premier examen valide
            const validExams = this.examManager.validExams;
            if (validExams.length > 0) {
                // Trier les examens par date pour trouver le plus proche dans le temps
                const sortedExams = validExams.sort((a, b) => a.datetime - b.datetime);
                const firstExamDate = sortedExams[0].datetime;
                this.currentYear = firstExamDate.getFullYear();
                this.currentMonth = firstExamDate.getMonth();
            } else {
                // Fallback : démarrer à octobre 2025 (première date visible dans le JSON)
                this.currentYear = 2025;
                this.currentMonth = 9; // octobre (index 9)
            }
        }
    }

    initEventListeners() {
        // Boutons de navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.updateCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.updateCalendar();
        });

        // Sélecteur de vue
        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.switchView('list');
        });

        document.getElementById('calendarViewBtn').addEventListener('click', () => {
            this.switchView('calendar');
        });
    }

    switchView(view) {
        const listView = document.getElementById('listView');
        const calendarView = document.getElementById('calendarView');
        const listBtn = document.getElementById('listViewBtn');
        const calendarBtn = document.getElementById('calendarViewBtn');

        if (view === 'list') {
            listView.style.display = 'block';
            calendarView.style.display = 'none';
            listBtn.classList.add('active');
            calendarBtn.classList.remove('active');
        } else {
            listView.style.display = 'none';
            calendarView.style.display = 'block';
            listBtn.classList.remove('active');
            calendarBtn.classList.add('active');
            this.updateCalendar();
        }
    }

    updateCalendar() {
        if (this.examManager.exams.length > 0) {
            this.examManager.generateCalendar(this.currentYear, this.currentMonth);
        }
    }
}