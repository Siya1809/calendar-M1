// Gestion des données
class ExamManager {
    constructor() {
        this.exams = [];
        this.currentUEFilter = '';
        this.loadExams();
    }

    async loadExams() {
        try {
            const response = await fetch('examens.json');
            if (!response.ok) {
                throw new Error('Impossible de charger les examens');
            }
            const data = await response.json();
            
            // Stocker les UE et examens séparément
            this.ues = data.ues;
            
            // Mettre à jour la date de dernière modification
            if (data.lastUpdated) {
                this.updateLastModifiedDate(data.lastUpdated);
            }
            
            // Enrichir les examens avec les infos UE et datetime
            this.exams = data.examens.map(exam => {
                const hasValidDate = exam.date !== "NAN" && exam.date !== "TBA" && exam.date !== null;
                const hasValidTime = exam.time !== "NAN" && exam.time !== "TBA" && exam.time !== null && /^\d{2}:\d{2}$/.test(exam.time);
                
                return {
                    ...exam,
                    // Ajouter les infos de l'UE
                    ue: this.ues[exam.ue_id]?.fullName || exam.ue_id,
                    code: this.ues[exam.ue_id]?.code || exam.ue_id,
                    ue_name: this.ues[exam.ue_id]?.name || exam.ue_id,
                    hasValidDate,
                    hasValidTime,
                    datetime: this.createDatetime(exam.date, exam.time, hasValidDate, hasValidTime)
                };
            });
            
            // Séparer les examens avec et sans dates (date seule suffit pour "confirmés")
            this.validExams = this.exams.filter(exam => exam.hasValidDate);
            this.pendingExams = this.exams.filter(exam => !exam.hasValidDate);
            
            this.populateMenuLinks();
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

    createDatetime(date, time, hasValidDate, hasValidTime) {
        if (!hasValidDate || !hasValidTime) {
            return null;
        }
        // Éviter les problèmes de fuseau horaire en créant la date directement
        const [year, month, day] = date.split('-').map(Number);
        
        // Gérer les formats de temps spéciaux comme "entre 08:00 et 13:00"
        let hours, minutes;
        if (time.includes('entre')) {
            // Extraire la première heure mentionnée
            const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                hours = parseInt(timeMatch[1]);
                minutes = parseInt(timeMatch[2]);
            } else {
                return null;
            }
        } else {
            const timeParts = time.split(':');
            if (timeParts.length !== 2) return null;
            hours = parseInt(timeParts[0]);
            minutes = parseInt(timeParts[1]);
        }
        
        return new Date(year, month - 1, day, hours, minutes);
    }

    formatDuration(duration) {
        if (duration === "NAN" || duration === null || duration === undefined) {
            return "Non précisée";
        }
        
        // Si c'est déjà une string avec "minutes", on la retourne telle quelle
        if (typeof duration === 'string' && duration.includes('minute')) {
            return duration;
        }
        
        // Si c'est un nombre ou une string numérique simple
        if (!isNaN(Number(duration)) && duration !== "") {
            return `${duration} minutes`;
        }
        
        // Pour les cas comme "10 ou 15", on retourne tel quel avec "minutes"
        return `${duration} minutes`;
    }

    updateLastModifiedDate(dateString) {
        const lastUpdateElement = document.getElementById('lastUpdateDate');
        if (lastUpdateElement && dateString) {
            try {
                const date = new Date(dateString);
                const options = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                };
                lastUpdateElement.textContent = date.toLocaleDateString('fr-FR', options);
            } catch (error) {
                console.error('Erreur lors du formatage de la date:', error);
                lastUpdateElement.textContent = dateString;
            }
        }
    }

    populateMenuLinks() {
        const container = document.getElementById('menuQuickLinks');
        if (!container || !this.ues) return;

        const uesWithLinks = Object.entries(this.ues).filter(([, ue]) => ue.Link);
        
        if (uesWithLinks.length === 0) {
            container.innerHTML = '<div class="menu-loading">Aucun lien disponible</div>';
            return;
        }

        const linksHtml = uesWithLinks.map(([ueId, ue]) => `
            <a href="${ue.Link}" target="_blank" class="menu-link" title="Accéder au cours ${ue.fullName}">
                <span class="menu-link-icon">📚</span>
                <div class="menu-link-text">
                    <span class="menu-link-code">${ue.code}</span>
                    <span class="menu-link-name">${ue.name}</span>
                </div>
                <span class="menu-link-arrow">↗</span>
            </a>
        `).join('');

        container.innerHTML = linksHtml;
    }

    // Prochains examens SANS filtre (pour le compteur principal)
    getUpcomingExams() {
        const now = new Date();
        return this.validExams
            .filter(exam => exam.datetime > now)
            .sort((a, b) => a.datetime - b.datetime);
    }

    // Prochains examens AVEC filtre (pour la liste)
    getFilteredUpcomingExams() {
        const now = new Date();
        const filteredExams = this.getFilteredExams(this.validExams);
        return filteredExams
            .filter(exam => exam.datetime > now)
            .sort((a, b) => a.datetime - b.datetime);
    }

    getNextExam() {
        const upcoming = this.getUpcomingExams();
        return upcoming.length > 0 ? upcoming[0] : null;
    }

    updateDisplays() {
        this.initializeUEFilter();
        this.displayNextExam();
        this.displayAllExams();
    }

    initializeUEFilter() {
        const ueFilter = document.getElementById('ueFilter');
        if (!ueFilter) return;

        // Obtenir toutes les UE uniques par ue_id
        const uniqueUEIds = [...new Set(this.exams.map(exam => exam.ue_id))].sort();
        
        // Vider et repeupler le sélecteur
        ueFilter.innerHTML = '<option value="">Toutes les UE</option>';
        uniqueUEIds.forEach(ueId => {
            const option = document.createElement('option');
            option.value = ueId;
            option.textContent = this.ues[ueId]?.fullName || ueId;
            ueFilter.appendChild(option);
        });

        // Ajouter l'événement de changement (une seule fois)
        if (!ueFilter.hasAttribute('data-initialized')) {
            ueFilter.addEventListener('change', (e) => {
                this.currentUEFilter = e.target.value;
                this.updateFilterDisplay();
                this.displayAllExams(); // Mise à jour de la liste
                if (this.updateCalendar) {
                    this.updateCalendar(); // Mise à jour du calendrier
                }
            });
            ueFilter.setAttribute('data-initialized', 'true');
        }
    }

    updateFilterDisplay() {
        const ueFilter = document.getElementById('ueFilter');
        if (ueFilter && this.currentUEFilter) {
            ueFilter.value = this.currentUEFilter;
        }
    }

    getFilteredExams(examList) {
        if (!this.currentUEFilter) {
            return examList;
        }
        return examList.filter(exam => exam.ue_id === this.currentUEFilter);
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

        const timeData = this.getTimeLeftDetailed(nextExam.datetime);
        const upcomingExams = this.getUpcomingExams().slice(1, 3); // 2 examens suivants

        content.innerHTML = `
            <div class="main-countdown" id="mainCountdown">${this.formatCountdown(timeData)}</div>
            <div class="exam-details" onclick="examManager.showExamDetails(${nextExam.id})" style="cursor: pointer; border-radius: 10px; padding: 15px; transition: all 0.3s ease;">
                <h3>${nextExam.ue}</h3>
                <p><strong>Type:</strong> ${nextExam.type}</p>
                <p><strong>Date:</strong> ${this.formatDate(nextExam.datetime)}</p>
                <p><strong>Heure:</strong> ${this.formatTime(nextExam.datetime)}</p>
                <p><strong>Durée:</strong> ${this.formatDuration(nextExam.duration)}</p>
                <p><strong>Lieu:</strong> ${nextExam.location !== "NAN" ? nextExam.location : "À définir"}</p>
                <div style="text-align: center; margin-top: 10px;  font-size: 0.9rem;">
                    👆 Cliquer pour plus de détails
                </div>
            </div>
            ${upcomingExams.length > 0 ? `
                <div class="upcoming-timers">
                    ${upcomingExams.map(exam => `
                        <div class="timer-item" onclick="examManager.showExamDetails(${exam.id})" style="cursor: pointer; transition: all 0.3s ease;">
                            <div>${exam.ue} - ${exam.type}</div>
                            <p style="font-size: 0.8rem; margin: 5px 0; opacity: 0.8;">${this.formatDate(exam.datetime)} à ${this.formatTime(exam.datetime)}</p>
                            <div class="timer-countdown-compact" data-datetime="${exam.datetime.toISOString()}">
                                ${this.getTimeLeft(exam.datetime)}
                            </div>
                            <div style="text-align: center; margin-top: 5px;  font-size: 0.8rem;">
                                👆 Cliquer pour détails
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    displayAllExams() {
        const container = document.getElementById('examsList');
        const upcoming = this.getFilteredUpcomingExams(); // Utiliser la version filtrée
        const filteredPendingExams = this.getFilteredExams(this.pendingExams);
        
        // Vérifier s'il y a des examens (confirmés OU en attente)
        if (upcoming.length === 0 && filteredPendingExams.length === 0) {
            const filterText = this.currentUEFilter ? 
                `Aucun examen trouvé pour ${this.ues[this.currentUEFilter]?.fullName || this.currentUEFilter}` :
                'Aucun examen trouvé';
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <p>${filterText}</p>
                </div>
            `;
            return;
        }

        let html = '';
        
        // Grouper les examens confirmés par mois
        if (upcoming.length > 0) {
            const groupedByMonth = this.groupExamsByMonth(upcoming);
            const currentDate = new Date();
            
            // Séparer les examens passés et futurs
            const futureMonths = [];
            const pastMonths = [];
            
            Object.entries(groupedByMonth).forEach(([monthKey, exams]) => {
                const [year, month] = monthKey.split('-').map(Number);
                const monthDate = new Date(year, month - 1, 1);
                
                if (monthDate >= new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)) {
                    futureMonths.push([monthKey, exams]);
                } else {
                    pastMonths.push([monthKey, exams]);
                }
            });
            
            // Afficher les mois futurs
            futureMonths.forEach(([monthKey, exams]) => {
                html += this.renderMonthSection(monthKey, exams, false);
            });
            
            // Afficher les mois passés dans une section repliée
            if (pastMonths.length > 0) {
                html += `
                    <div class="collapsed-section">
                        <div class="collapsed-header" onclick="this.parentElement.classList.toggle('expanded')">
                            <span>📂 Examens passés (${pastMonths.reduce((acc, [, exams]) => acc + exams.length, 0)})</span>
                            <span class="collapse-icon">▼</span>
                        </div>
                        <div class="collapsed-content">
                `;
                pastMonths.forEach(([monthKey, exams]) => {
                    html += this.renderMonthSection(monthKey, exams, true);
                });
                html += `
                        </div>
                    </div>
                `;
            }
        }
        
        // Examens sans date confirmée
        if (filteredPendingExams.length > 0) {
            html += `
                <div class="month-section">
                    <h3 class="month-title pending">📋 Examens sans date confirmée</h3>
                    <div class="month-exams">
                        ${filteredPendingExams.map(exam => this.renderExamItem(exam, true)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    groupExamsByMonth(exams) {
        const grouped = {};
        exams.forEach(exam => {
            if (exam.datetime) {
                const monthKey = `${exam.datetime.getFullYear()}-${String(exam.datetime.getMonth() + 1).padStart(2, '0')}`;
                if (!grouped[monthKey]) {
                    grouped[monthKey] = [];
                }
                grouped[monthKey].push(exam);
            }
        });
        
        // Trier les examens dans chaque mois par date
        Object.keys(grouped).forEach(month => {
            grouped[month].sort((a, b) => a.datetime - b.datetime);
        });
        
        return grouped;
    }

    renderMonthSection(monthKey, exams, isPast = false) {
        const [year, month] = monthKey.split('-').map(Number);
        const monthName = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        return `
            <div class="month-section ${isPast ? 'past' : ''}">
                <h3 class="month-title">${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h3>
                <div class="month-exams">
                    ${exams.map(exam => this.renderExamItem(exam, false)).join('')}
                </div>
            </div>
        `;
    }

    renderExamItem(exam, isPending = false) {
        let timeLeft = '';
        let examClass = 'exam-item';
        
        if (exam.datetime && !isPending) {
            timeLeft = this.getTimeLeft(exam.datetime);
            const daysLeft = Math.ceil((exam.datetime - new Date()) / (1000 * 60 * 60 * 24));
            
            if (daysLeft <= 1) examClass += ' urgent';
            else if (daysLeft <= 3) examClass += ' today';
        }
        
        if (isPending) {
            examClass += ' pending';
        }

        return `
            <div class="${examClass}" onclick="examManager.showExamDetails(${exam.id})" style="cursor: pointer;">
                <div class="exam-type type-${exam.type.toLowerCase()}">${exam.type}</div>
                <h3>${exam.name || exam.ue}</h3>
                <h4 style="margin: 5px 0; color: var(--text-light); font-size: 0.9rem;">${exam.ue} ${exam.code !== "NAN" ? `(${exam.code})` : ''}</h4>
                ${exam.datetime && !isPending ? 
                    `<p><strong>📅</strong> ${this.formatDate(exam.datetime)} à ${this.formatTime(exam.datetime)}</p>` :
                    `<p><strong>📅</strong> Date non confirmée</p>`
                }
                <p><strong>📍</strong> ${exam.location !== "NAN" ? exam.location : "Lieu à définir"}</p>
                <p><strong>⏱️</strong> ${this.formatDuration(exam.duration)}</p>
                ${exam.coefficient !== "NAN" ? `<p><strong>💯</strong> ${exam.coefficient}</p>` : ''}
                ${exam.status === "to_confirm" ? '<p style="color: var(--warning);">⚠️ À confirmer</p>' : ''}
                ${timeLeft ? `<div class="exam-countdown" data-datetime="${exam.datetime.toISOString()}">${timeLeft}</div>` : ''}
                <div style="text-align: center; margin-top: 10px; color: var(--text-light); font-size: 0.9rem;">
                     Cliquer pour plus de détails
                </div>
            </div>
        `;
    }

    showExamDetails(examId) {
        const exam = this.exams.find(e => e.id === examId);
        if (!exam) return;

        // Remplir la modale
        document.getElementById('modalTitle').textContent = exam.name || exam.ue;
        
        const modalType = document.getElementById('modalType');
        modalType.textContent = exam.type;
        modalType.className = `modal-type type-${exam.type.toLowerCase()}`;

        const modalInfo = document.getElementById('modalInfo');
        
        // Construire les informations selon les données disponibles
        let infoItems = [];
        
        // Nom de l'UE et code
        if (exam.ue !== exam.name) {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">📚</div>
                    <div class="info-content">
                        <div class="info-label">UE</div>
                        <div class="info-value">${exam.ue} ${exam.code !== "NAN" ? `(${exam.code})` : ''}</div>
                    </div>
                </div>
            `);
        }
        
        // Lien vers l'UE
        const ueData = this.ues[exam.ue_id];
        if (ueData && ueData.Link) {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">🌐</div>
                    <div class="info-content">
                        <div class="info-label">Lien d'UE</div>
                        <div class="info-value">
                            <a href="${ueData.Link}" target="_blank" class="course-link">
                                Accéder au cours
                                <span class="external-icon">↗</span>
                            </a>
                        </div>
                    </div>
                </div>
            `);
        }
        
        // Date et heure
        if (exam.hasValidDate) {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">📅</div>
                    <div class="info-content">
                        <div class="info-label">Date</div>
                        <div class="info-value">${exam.datetime ? this.formatDate(exam.datetime) : exam.date}</div>
                    </div>
                </div>
            `);
            
            // Heure séparée - gestion des heures non-standard
            if (exam.hasValidTime) {
                infoItems.push(`
                    <div class="info-item">
                        <div class="info-icon">🕐</div>
                        <div class="info-content">
                            <div class="info-label">Heure</div>
                            <div class="info-value">${this.formatTime(exam.datetime)}</div>
                        </div>
                    </div>
                `);
            } else if (exam.time !== "NAN" && exam.time !== "TBA") {
                infoItems.push(`
                    <div class="info-item">
                        <div class="info-icon">🕐</div>
                        <div class="info-content">
                            <div class="info-label">Heure</div>
                            <div class="info-value">${exam.time}</div>
                        </div>
                    </div>
                `);
            }
        } else {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">⚠️</div>
                    <div class="info-content">
                        <div class="info-label">Date</div>
                        <div class="info-value">Non confirmée ${exam.status === "to_confirm" ? "(à confirmer)" : ""}</div>
                    </div>
                </div>
            `);
        }
        
        // Durée
        if (exam.duration !== "NAN") {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">⏱️</div>
                    <div class="info-content">
                        <div class="info-label">Durée</div>
                        <div class="info-value">${this.formatDuration(exam.duration)}</div>
                    </div>
                </div>
            `);
        }
        
        // Lieu
        infoItems.push(`
            <div class="info-item">
                <div class="info-icon">📍</div>
                <div class="info-content">
                    <div class="info-label">Lieu</div>
                    <div class="info-value">${exam.location !== "NAN" ? exam.location : "À définir"}</div>
                </div>
            </div>
        `);
        
        // Coefficient
        if (exam.coefficient !== "NAN") {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">💯</div>
                    <div class="info-content">
                        <div class="info-label">Coefficient</div>
                        <div class="info-value">${exam.coefficient}</div>
                    </div>
                </div>
            `);
        }
        
        // Documents autorisés
        if (exam.documents !== "NAN") {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">📄</div>
                    <div class="info-content">
                        <div class="info-label">Documents</div>
                        <div class="info-value">${exam.documents}</div>
                    </div>
                </div>
            `);
        }
        
        // Description
        if (exam.description !== "NAN") {
            infoItems.push(`
                <div class="info-item">
                    <div class="info-icon">📝</div>
                    <div class="info-content">
                        <div class="info-label">Description</div>
                        <div class="info-value">${exam.description}</div>
                    </div>
                </div>
            `);
        }
        
        modalInfo.innerHTML = infoItems.join('');

        // Gérer le countdown selon la disponibilité de datetime complet
        const countdownDisplay = document.getElementById('modalCountdown');
        if (exam.datetime) {
            countdownDisplay.style.display = 'block';
            const updateModalCountdown = () => {
                const timeLeft = this.getTimeLeft(exam.datetime);
                document.getElementById('modalCountdownValue').textContent = timeLeft;
            };
            updateModalCountdown();
            this.modalCountdownInterval = setInterval(updateModalCountdown, 1000);
        } else {
            countdownDisplay.style.display = 'none';
        }

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

    getTimeLeftDetailed(datetime) {
        const now = new Date();
        const diff = datetime - now;
        
        if (diff <= 0) return { finished: true };
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return { 
            finished: false,
            days, 
            hours, 
            minutes, 
            seconds,
            total: diff
        };
    }

    formatCountdown(timeData) {
        if (timeData.finished) {
            return '<div class="countdown-finished">🎯 Terminé</div>';
        }

        const { days, hours, minutes, seconds } = timeData;
        
        // Déterminer la couleur selon l'urgence
        let urgencyClass = 'countdown-normal';
        if (days === 0 && hours < 2) urgencyClass = 'countdown-critical';
        else if (days === 0 && hours < 24) urgencyClass = 'countdown-urgent';
        else if (days <= 1) urgencyClass = 'countdown-warning';

        return `
            <div class="countdown-container ${urgencyClass}">
                ${days > 0 ? `
                    <div class="countdown-unit">
                        <div class="countdown-number">${days}</div>
                        <div class="countdown-label">jour${days > 1 ? 's' : ''}</div>
                    </div>
                ` : ''}
                ${days > 0 || hours > 0 ? `
                    <div class="countdown-unit">
                        <div class="countdown-number">${String(hours).padStart(2, '0')}</div>
                        <div class="countdown-label">heure${hours > 1 ? 's' : ''}</div>
                    </div>
                ` : ''}
                <div class="countdown-unit">
                    <div class="countdown-number">${String(minutes).padStart(2, '0')}</div>
                    <div class="countdown-label">min</div>
                </div>
                ${days === 0 ? `
                    <div class="countdown-unit">
                        <div class="countdown-number">${String(seconds).padStart(2, '0')}</div>
                        <div class="countdown-label">sec</div>
                    </div>
                ` : ''}
            </div>
        `;
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
            // Mettre à jour le timer principal avec le nouveau format
            const mainCountdown = document.getElementById('mainCountdown');
            if (mainCountdown) {
                const nextExam = this.getNextExam();
                if (nextExam) {
                    const timeData = this.getTimeLeftDetailed(nextExam.datetime);
                    mainCountdown.innerHTML = this.formatCountdown(timeData);
                }
            }

            // Mettre à jour tous les timers compacts
            document.querySelectorAll('.timer-countdown-compact[data-datetime]').forEach(element => {
                const datetime = new Date(element.dataset.datetime);
                element.textContent = this.getTimeLeft(datetime);
            });

            // Mettre à jour tous les autres timers
            document.querySelectorAll('.exam-countdown[data-datetime]').forEach(element => {
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
            if (dayExams.length > 0) {
                dayElement.classList.add('has-exams');
            }
            dayExams.forEach(exam => {
                const examElement = document.createElement('div');
                examElement.className = `day-exam type-${exam.type.toLowerCase()}`;
                
                // Améliorer l'affichage du texte
                const timeText = exam.time !== 'NAN' ? exam.time : '';
                const ueText = exam.ue.length > 20 ? exam.ue.substring(0, 17) + '...' : exam.ue;
                examElement.innerHTML = `
                    <div style="font-weight: 600; font-size: 0.7rem;">${timeText}</div>
                    <div style="font-size: 0.65rem; opacity: 0.9;">${ueText}</div>
                `;
                
                examElement.title = `${exam.type} - ${exam.name}\n${exam.ue}\nCliquer pour voir les détails`;
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
        // Utiliser getFullYear, getMonth, getDate pour éviter les problèmes de fuseau horaire
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        const dayExams = this.validExams.filter(exam => exam.date === dateString);
        return this.getFilteredExams(dayExams);
    }
}