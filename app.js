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

    // === GESTION DU MENU ===
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const menuClose = document.getElementById('menuClose');
    const menuUeFilter = document.getElementById('menuUeFilter');

    // Fonction pour ouvrir le menu
    function openMenu() {
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        menuToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Fonction pour fermer le menu
    function closeMenu() {
        sideMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        menuToggle.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Bouton hamburger
    menuToggle.addEventListener('click', () => {
        if (sideMenu.classList.contains('active')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Bouton fermer
    menuClose.addEventListener('click', closeMenu);

    // Overlay
    menuOverlay.addEventListener('click', closeMenu);

    // Synchroniser le filtre du menu avec le filtre principal
    menuUeFilter.addEventListener('change', (e) => {
        document.getElementById('ueFilter').value = e.target.value;
        document.getElementById('ueFilter').dispatchEvent(new Event('change'));
        closeMenu();
    });

    // Remplir le select du menu avec les mêmes options que le filtre principal
    const originalUeFilter = document.getElementById('ueFilter');
    originalUeFilter.addEventListener('DOMSubtreeModified', () => {
        if (originalUeFilter.options.length > 1 && menuUeFilter.options.length === 1) {
            Array.from(originalUeFilter.options).slice(1).forEach(option => {
                const newOption = option.cloneNode(true);
                menuUeFilter.appendChild(newOption);
            });
        }
    });

    // Synchroniser les filtres dans l'autre sens
    originalUeFilter.addEventListener('change', (e) => {
        menuUeFilter.value = e.target.value;
    });

    // Actions du menu
    document.querySelectorAll('.menu-item[data-action]').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            
            switch(action) {
                case 'scrollToNext':
                    document.getElementById('nextExamCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    closeMenu();
                    break;
                    
                case 'scrollToList':
                    document.getElementById('listView').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    document.getElementById('listViewBtn').click();
                    closeMenu();
                    break;
                    
                case 'scrollToCalendar':
                    document.getElementById('calendarView').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    document.getElementById('calendarViewBtn').click();
                    closeMenu();
                    break;
                    
                case 'toggleView':
                    const listViewBtn = document.getElementById('listViewBtn');
                    const calendarViewBtn = document.getElementById('calendarViewBtn');
                    if (listViewBtn.classList.contains('active')) {
                        calendarViewBtn.click();
                    } else {
                        listViewBtn.click();
                    }
                    closeMenu();
                    break;
                    
                case 'resetFilter':
                    document.getElementById('ueFilter').value = '';
                    document.getElementById('ueFilter').dispatchEvent(new Event('change'));
                    menuUeFilter.value = '';
                    closeMenu();
                    break;
            }
        });
    });

    // Fermer le menu avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sideMenu.classList.contains('active')) {
            closeMenu();
        }
    });
});