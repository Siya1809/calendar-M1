// Gestion du calendrier
class CalendarManager {
    constructor(examManager) {
        this.examManager = examManager;
        this.currentDate = new Date();
        this.currentYear = this.currentDate.getFullYear();
        this.currentMonth = this.currentDate.getMonth();
        
        this.initEventListeners();
        this.updateCalendar();
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