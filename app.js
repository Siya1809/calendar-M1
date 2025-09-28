// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Initialisation
    const examManager = new ExamManager();
    let calendarManager;

    // Initialiser le calendrier après le chargement des examens
    const originalUpdateDisplays = examManager.updateDisplays;
    examManager.updateDisplays = function() {
        originalUpdateDisplays.call(this);
        if (!calendarManager) {
            calendarManager = new CalendarManager(this);
        } else {
            calendarManager.updateCalendar();
        }
    };

    // Fonction pour mettre à jour le calendrier lors du changement de filtre
    examManager.updateCalendar = function() {
        if (calendarManager) {
            calendarManager.updateCalendar();
        }
    };

    // Gestionnaires pour la modale
    document.getElementById('modalClose').addEventListener('click', () => {
        examManager.hideExamDetails();
    });

    // Fermer la modale en cliquant sur l'overlay
    document.getElementById('examModal').addEventListener('click', (e) => {
        if (e.target.id === 'examModal') {
            examManager.hideExamDetails();
        }
    });

    // Fermer la modale avec la touche Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('examModal').classList.contains('active')) {
            examManager.hideExamDetails();
        }
    });

    // Rendre examManager global pour les onclick dans le HTML
    window.examManager = examManager;
});