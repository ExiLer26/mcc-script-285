/**
 * TogetherPage - Birlikte İzle (Watch Together)
 * Real-time synchronized video watching with WebSocket
 */
class TogetherPage {
    constructor(app) {
        this.app = app;
        this.state = 'lobby'; // lobby | create | join | room
        this.roomCode = null;
        this.isHost = false;
        this.members = [];
        this.ws = null;
        this.hls = null;
        this.video = null;
        this.isSyncing = false;
        this.content = null;
        this.chatMessages = [];
        this.pingInterval = null;
        this.contentTab = 'movies';
        this.allMovies = [];
        this.allSeries = [];
        this.allLive = [];
        this.container = null;
    }

    async init() {}

    async show() {
        this.renderLayout();
        if (this.state === 'room' && this.roomCode) {
            this.renderRoom();
        } else {
            this.setState('lobby');
        }
    }

    hide() {
        // Keep WS alive when navigating away from the page
    }

    setState(newState) {
        this.state = newState;
        this.render();
    }

    renderLayout() {
        const page = document.getElementById('page-together');
        if (!page) return;
        page.innerHTML = `<div class="together-wrap" id="together-wrap"></div>`;
        this.container = document.getElementById('together-wrap');
    }

    render() {
        if (!this.container) {
            this.renderLayout();
        }
        switch (this.state) {
            case 'lobby':   this.renderLobby(); break;
            case 'create':  this.renderCreateForm(); break;
            case 'join':    this.renderJoinForm(); break;
            case 'room':    this.renderRoom(); break;
        }
    }

    // ─── LOBBY ───────────────────────────────────────────────────────────────
    renderLobby() {
        this.container.innerHTML = `
            <div class="together-lobby">
                <div class="together-hero">
                    <div class="together-hero-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                    </div>
                    <h1 class="together-hero-title">${window.app.t("Watch Together" || "Watch Together")}</h1>
                    <p class="together-hero-sub">${window.app.t("Watch movies and series with your friends. Real-time synchronization." || "Watch movies and series with your friends. Real-time synchronization.")}</p>
                </div>
                <div class="together-lobby-cards">
                    <div class="together-lobby-card" id="btn-together-create">
                        <div class="tlc-icon tlc-icon-create">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        </div>
                        <h3>${window.app.t("Room Create" || "Room Create")}</h3>
                        <p>${window.app.t("Create a new room, set a password, and invite your friends." || "Create a new room, set a password, and invite your friends.")}</p>
                    </div>
                    <div class="together-lobby-card" id="btn-together-join">
                        <div class="tlc-icon tlc-icon-join">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                        </div>
                        <h3>${window.app.t("Room Join" || "Room Join")}</h3>
                        <p>${window.app.t("Enter the room code and password to join an existing room." || "Enter the room code and password to join an existing room.")}</p>
                    </div>
                </div>
            </div>
        `;
        this.container.querySelector('#btn-together-create')
            .addEventListener('click', () => this.setState('create'));
        this.container.querySelector('#btn-together-join')
            .addEventListener('click', () => this.setState('join'));
    }

    // ─── CREATE FORM ─────────────────────────────────────────────────────────
    renderCreateForm() {
        this.container.innerHTML = `
            <div class="together-form-wrap">
                <div class="together-form-card">
                    <button class="together-back-btn" id="together-back">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        ${window.app.t("Back" || "Back")}
                    </button>
                    <h2>${window.app.t("Create Room" || "Create Room")}</h2>
                    <p class="together-form-sub">${window.app.t("Give your room a password and choose how many people can join." || "Give your room a password and choose how many people can join.")}</p>
                    <div class="together-field">
                        <label>${window.app.t("Room Password" || "Room Password")}</label>
                        <input type="password" id="create-password" placeholder="${window.app.t("Set a password..." || "Set a password...")}" maxlength="50" autocomplete="off">
                    </div>
                    <div class="together-field">
                        <label>${("Member limit" || "Member limit")} <span class="together-limit-val" id="limit-display">10</span></label>
                        <input type="range" id="create-limit" min="1" max="50" value="10" class="together-range">
                        <div class="together-range-labels"><span>1</span><span>50</span></div>
                    </div>
                    <div class="together-error hidden" id="create-error"></div>
                    <button class="together-btn together-btn-primary" id="btn-do-create">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        ${window.app.t("Create Room" || "Create Room")}
                    </button>
                </div>
            </div>
        `;
        const limitInput = this.container.querySelector('#create-limit');
        const limitDisplay = this.container.querySelector('#limit-display');
        limitInput.addEventListener('input', () => { limitDisplay.textContent = limitInput.value; });

        this.container.querySelector('#together-back')
            .addEventListener('click', () => this.setState('lobby'));
        this.container.querySelector('#btn-do-create')
            .addEventListener('click', () => this.doCreate());
        this.container.querySelector('#create-password')
            .addEventListener('keydown', (e) => { if (e.key === 'Enter') this.doCreate(); });
    }

    async doCreate() {
        const password = this.container.querySelector('#create-password').value.trim();
        const memberLimit = parseInt(this.container.querySelector('#create-limit').value);
        const errEl = this.container.querySelector('#create-error');
        errEl.classList.add('hidden');

        if (!password) { this.showError(errEl, window.app.t('The password cannot be blank.' || "The password cannot be blank.")); return; }

        const btn = this.container.querySelector('#btn-do-create');
        btn.disabled = true;
        btn.textContent = window.app.t('Creating...' || "Creating...");

        try {
            const result = await window.API.request('POST', '/together/rooms', { password, memberLimit });
            this.roomCode = result.code;
            this.isHost = true;
            await this.connectWebSocket();
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>${window.app.t("The room could not be created.")}`;
           // this.showError(errEl, err.message || 'Oda oluşturulamadı.');
            this.showError(errEl, this.app.t(err.message) || err.message);
        }
    }

    // ─── JOIN FORM ────────────────────────────────────────────────────────────
    renderJoinForm() {
        this.container.innerHTML = `
            <div class="together-form-wrap">
                <div class="together-form-card">
                    <button class="together-back-btn" id="together-back">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        ${window.app.t("Back" || "Back")}
                    </button>
                    <h2>${window.app.t("Join Room" || "Join Room")}</h2>
                    <p class="together-form-sub">${window.app.t("Enter the room code and password to join an existing room." || "Enter the room code and password to join an existing room.")}</p>
                    <div class="together-field">
                        <label>${window.app.t("Room Code" || "Room Code")}</label>
                        <input type="text" id="join-code" 
placeholder="${window.app.t("E.g: A5S7B8")}" maxlength="6" autocomplete="off" style="text-transform:uppercase">
                    </div>
                    <div class="together-field">
                        <label>${window.app.t("Password")}</label>
                        <input type="password" id="join-password" placeholder=${window.app.t("Password...")} maxlength="50" autocomplete="off">
                    </div>
                    <div class="together-error hidden" id="join-error"></div>
                    <button class="together-btn together-btn-primary" id="btn-do-join">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                        ${window.app.t("Join" || "Join")}
                    </button>
                </div>
            </div>
        `;
        const codeInput = this.container.querySelector('#join-code');
        codeInput.addEventListener('input', () => {
            codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
        this.container.querySelector('#together-back')
            .addEventListener('click', () => this.setState('lobby'));
        this.container.querySelector('#btn-do-join')
            .addEventListener('click', () => this.doJoin());
        this.container.querySelector('#join-password')
            .addEventListener('keydown', (e) => { if (e.key === 'Enter') this.doJoin(); });
    }

    async doJoin() {
        const code = this.container.querySelector('#join-code').value.trim().toUpperCase();
        const password = this.container.querySelector('#join-password').value.trim();
        const errEl = this.container.querySelector('#join-error');
        errEl.classList.add('hidden');

        if (!code || code.length < 4) { this.showError(errEl, window.app.t("Enter a valid room code.")); return; }
        if (!password) { this.showError(errEl, window.app.t("The password cannot be blank.")); return; }

        const btn = this.container.querySelector('#btn-do-join');
        btn.disabled = true;
        btn.textContent = window.app.t('Joining...' || "Joining...");

        try {
            const result = await window.API.request('POST', `/together/rooms/${code}/join`, { password });
            this.roomCode = code;
            this.isHost = result.isHost;
            this.members = result.members || [];
            await this.connectWebSocket();
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 12l-5.58 5.59L12 20l8-8z"/></svg>${window.app.t("Join" || "Join")}`;
            this.showError(errEl, this.app.t(err.message) || err.message);
        }
    }

    // ─── WEBSOCKET ────────────────────────────────────────────────────────────
    async connectWebSocket() {
        const token = localStorage.getItem('authToken');
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${location.host}/ws/together?room=${this.roomCode}&token=${token}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[Together] WS connected');
            this.pingInterval = setInterval(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 25000);
        };

        this.ws.onmessage = (e) => {
            let msg;
            try { msg = JSON.parse(e.data); } catch { return; }
            this.handleWsMessage(msg);
        };

        this.ws.onerror = (err) => {
            console.error('[Together] WS error:', err);
        };

        this.ws.onclose = (e) => {
            clearInterval(this.pingInterval);
            if (e.code === 4004 || e.code === 4005) {
                this.showToast(this.app.t('room_not_found'), 'error');
                this.leaveRoom(false);
            }
        };

        // Wait briefly for WS to connect
        await new Promise((resolve) => setTimeout(resolve, 300));

        this.state = 'room';
        this.renderRoom();
    }

    handleWsMessage(msg) {
        switch (msg.type) {
            case 'room_state':
                this.members = msg.members || [];
                this.isHost = msg.isHost;
                if (msg.room?.content) this.content = msg.room.content;
                // Store resume position for late joiners
                this.resumeTime = (msg.currentTime && msg.currentTime > 1) ? msg.currentTime : 0;
                this.resumePaused = msg.isPaused !== false;
                this.updateMembersList();
                if (this.content) this.loadContent(this.content, this.resumeTime, this.resumePaused);
                break;

            case 'member_joined':
                if (!this.members.find(m => m.user_id === msg.user.user_id)) {
                    this.members.push(msg.user);
                }
                this.updateMembersList();
                this.addChatMsg(null, `👤 ${msg.user.username} ${this.app.t('together_member_joined')}`, 'system');
                break;

            case 'member_left':
                this.members = this.members.filter(m => m.user_id !== msg.userId);
                this.updateMembersList();
                this.addChatMsg(null, `👤 ${msg.username} ${this.app.t('together_member_left')}`, 'system');
                break;

            case 'room_closed':
                this.showToast(this.app.t('room_closed_host_left'), 'error');
                this.leaveRoom(false);
                break;

            case 'content_change':
                this.content = msg.content;
                this.resumeTime = 0;
                this.resumePaused = true;
                this.loadContent(msg.content, 0, true);
                this.addChatMsg(null, `🎬 ${this.app.t('together_content_changed')}: ${msg.content?.title || ''}`, 'system');
                break;

            case 'sync_play':
                this.isSyncing = true;
                if (this.video) {
                    if (Math.abs(this.video.currentTime - msg.currentTime) > 1) {
                        this.video.currentTime = msg.currentTime;
                    }
                    this.video.play().catch(() => {});
                }
                setTimeout(() => { this.isSyncing = false; }, 300);
                break;

            case 'sync_pause':
                this.isSyncing = true;
                if (this.video) {
                    if (Math.abs(this.video.currentTime - msg.currentTime) > 1) {
                        this.video.currentTime = msg.currentTime;
                    }
                    this.video.pause();
                }
                setTimeout(() => { this.isSyncing = false; }, 300);
                break;

            case 'sync_seek':
                this.isSyncing = true;
                if (this.video) this.video.currentTime = msg.currentTime;
                setTimeout(() => { this.isSyncing = false; }, 300);
                break;

            case 'chat':
                this.addChatMsg(msg.username, msg.message, 'user');
                break;

            case 'pong':
                break;
        }
    }

    wsSend(obj) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(obj));
        }
    }

    // ─── ROOM VIEW ────────────────────────────────────────────────────────────
    renderRoom() {
        const myUsername = this.app.currentUser?.username || 'Sen';
        this.container.innerHTML = `
            <div class="together-room">
                <!-- Room Header -->
                <div class="together-room-header">
                    <div class="together-room-info">
                        <span class="together-room-badge" >${window.app.t("Room")}</span>
                        <span class="together-room-code" id="together-room-code">${this.roomCode}</span>
                        <button class="together-copy-btn" id="together-copy-code" title="Kodu Kopyala">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        </button>
                        <span class="together-member-count" id="together-member-count">
                            <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                            <span id="member-count-num">${this.members.length}</span>
                        </span>
                        ${this.isHost ? `<span class="together-host-badge">👑 ${window.app.t("Host")}</span>` : ''}
                    </div>
                    <button class="together-leave-btn" id="together-leave">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                        ${this.isHost ? window.app.t("Close Room"): window.app.t("Leave Room")}
                    </button>
                </div>

                <!-- Room Body -->
                <div class="together-room-body">
                    <!-- Video + Content Picker -->
                    <div class="together-main">
                        <!-- Video Player -->
                        <div class="together-video-wrap" id="together-video-wrap">
                            <div class="together-no-content" id="together-no-content">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V4h-4z"/></svg>
                                <p>${this.isHost ? this.app.t('select_content_below') : this.app.t('waiting_for_host')}</p>
                            </div>
                            <video id="together-video" playsinline style="display:none;width:100%;height:100%;background:#000;"></video>
                            <div class="together-video-overlay hidden" id="together-video-overlay">
                                <div class="together-video-controls">
                                    <button class="together-vid-btn" id="tog-play-pause">
                                        <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                        <svg class="icon-pause hidden" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                    </button>
                                    <div class="together-progress-wrap">
                                        <span class="together-time" id="tog-current">0:00</span>
                                        <input type="range" class="together-seek" id="tog-seek" min="0" max="100" value="0" step="0.1">
                                        <span class="together-time" id="tog-duration">0:00</span>
                                    </div>
                                    <button class="together-vid-btn" id="tog-fullscreen">
                                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Content Picker (Host Only) -->
                        ${this.isHost ? this.renderContentPickerHTML() : ''}
                    </div>

                    <!-- Sidebar: Members + Chat -->
                    <div class="together-sidebar">
                        <div class="together-members-section">
                            <h4>${window.app.t("Members")}</h4>
                            <div class="together-members-list" id="together-members-list">
                                ${this.renderMembersHTML()}
                            </div>
                        </div>
                        <div class="together-chat-section">
                            <h4>${window.app.t("Chat")}</h4>
                            <div class="together-chat-messages" id="together-chat-messages"></div>
                            <div class="together-chat-input-wrap">
                                <input type="text" id="together-chat-input" placeholder="${window.app.t("Type a message...")}" maxlength="200" autocomplete="off">
                                <button id="together-chat-send">
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupRoomEvents();
        this.setupVideoPlayer();
        if (this.content) this.loadContent(this.content, this.resumeTime || 0, this.resumePaused !== false);
    }

    renderContentPickerHTML() {
        return `
            <div class="together-content-picker" id="together-content-picker">
                <div class="together-picker-tabs">
                    <button class="tog-tab active" data-tab="movies">🎬 ${window.app.t("movies")}</button>
                    <button class="tog-tab" data-tab="series">📺 ${window.app.t("series")}</button>
                    <button class="tog-tab" data-tab="live">📡 ${window.app.t("live")}</button>
                </div>
                <div class="together-picker-search">
                    <input type="text" id="tog-search" placeholder="${window.app.t("search_placeholder")}" class="together-search-input">
                </div>
                <div class="together-picker-source">
                    <select id="tog-source-select" class="together-source-select">
                        <option value="">${window.app.t("select-source")}</option>
                    </select>
                </div>
                <div class="together-picker-grid" id="together-picker-grid">
                    <div class="together-picker-hint">${window.app.t("Kaynak seçin ve içerikleri yükleyin.")}</div>
                </div>
            </div>
        `;
    }

    renderMembersHTML() {
        return this.members.map(m => `
            <div class="together-member-item">
                <div class="together-member-avatar">${(m.username || '?')[0].toUpperCase()}</div>
                <span class="together-member-name">${m.username || window.app.t("Unknown") }</span>
                ${m.user_id === this.app.currentUser?.id ? `<span class="together-you-badge">${window.app.t("You")}</span>` : ''}
            </div>
        `).join('');
    }

    updateMembersList() {
        const el = document.getElementById('together-members-list');
        if (el) el.innerHTML = this.renderMembersHTML();
        const countEl = document.getElementById('member-count-num');
        if (countEl) countEl.textContent = this.members.length;
    }

    // ─── ROOM EVENTS ─────────────────────────────────────────────────────────
    setupRoomEvents() {
        // Copy code
        document.getElementById('together-copy-code')?.addEventListener('click', () => {
            navigator.clipboard.writeText(this.roomCode).then(() => {
                this.showToast(this.app.t('room_code_copied'));
            });
        });

        // Leave
        document.getElementById('together-leave')?.addEventListener('click', () => {
            if (this.isHost) {
                if (!confirm('Odayı kapatmak istediğine emin misin? Tüm üyeler atılacak.')) return;
            }
            this.leaveRoom(true);
        });
        // Chat
        const chatInput = document.getElementById('together-chat-input');
        const chatSend = document.getElementById('together-chat-send');
        chatSend?.addEventListener('click', () => this.sendChat());
        chatInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.sendChat(); });

        // Content picker (host only)
        if (this.isHost) this.setupContentPicker();
    }

    // ─── VIDEO PLAYER ─────────────────────────────────────────────────────────
    setupVideoPlayer() {
        this.video = document.getElementById('together-video');
        if (!this.video) return;

        const videoWrap = document.getElementById('together-video-wrap');
        const overlay = document.getElementById('together-video-overlay');
        const playPauseBtn = document.getElementById('tog-play-pause');
        const seekBar = document.getElementById('tog-seek');
        const currentTimeEl = document.getElementById('tog-current');
        const durationEl = document.getElementById('tog-duration');
        const fsBtn = document.getElementById('tog-fullscreen');

        // Show overlay on hover
        videoWrap?.addEventListener('mousemove', () => {
            overlay?.classList.remove('hidden');
            clearTimeout(this._overlayTimer);
            if (!this.video?.paused) {
                this._overlayTimer = setTimeout(() => overlay?.classList.add('hidden'), 3000);
            }
        });
        videoWrap?.addEventListener('mouseleave', () => {
            if (!this.video?.paused) overlay?.classList.add('hidden');
        });

        // Click video = toggle play
        this.video.addEventListener('click', () => {
            if (!this.isHost) {
                this.showToast(this.app.t('host_only_play'), 'info');
                return;
            }
            this.togglePlay();
        });

        // Play/Pause button
        playPauseBtn?.addEventListener('click', () => {
            if (!this.isHost) { this.showToast(this.app.t('host_only_play'), 'info'); return; }
            this.togglePlay();
        });

        // Seek
        this.video.addEventListener('timeupdate', () => {
            const pct = this.video.duration ? (this.video.currentTime / this.video.duration) * 100 : 0;
            if (seekBar) seekBar.value = pct;
            if (currentTimeEl) currentTimeEl.textContent = this.formatTime(this.video.currentTime);
            if (durationEl) durationEl.textContent = this.formatTime(this.video.duration);
        });

        seekBar?.addEventListener('input', () => {
            if (!this.isHost) return;
            const t = (seekBar.value / 100) * (this.video.duration || 0);
            this.video.currentTime = t;
        });
        seekBar?.addEventListener('change', () => {
            if (!this.isHost) return;
            const t = (seekBar.value / 100) * (this.video.duration || 0);
            this.video.currentTime = t;
            this.wsSend({ type: 'sync_seek', currentTime: t });
        });

        // Play/Pause sync events
        this.video.addEventListener('play', () => {
            const iconPlay = playPauseBtn?.querySelector('.icon-play');
            const iconPause = playPauseBtn?.querySelector('.icon-pause');
            iconPlay?.classList.add('hidden');
            iconPause?.classList.remove('hidden');

            if (this.isHost && !this.isSyncing) {
                this.wsSend({ type: 'sync_play', currentTime: this.video.currentTime });
            }
        });

        this.video.addEventListener('pause', () => {
            const iconPlay = playPauseBtn?.querySelector('.icon-play');
            const iconPause = playPauseBtn?.querySelector('.icon-pause');
            iconPlay?.classList.remove('hidden');
            iconPause?.classList.add('hidden');

            if (this.isHost && !this.isSyncing) {
                this.wsSend({ type: 'sync_pause', currentTime: this.video.currentTime });
            }
        });

        // Fullscreen
        fsBtn?.addEventListener('click', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoWrap?.requestFullscreen().catch(() => {});
            }
        });
    }

    togglePlay() {
        if (!this.video) return;
        if (this.video.paused) {
            this.video.play().catch(console.error);
        } else {
            this.video.pause();
        }
    }

async loadContent(content, resumeTime = 0, startPaused = true) {
    if (!content || !content.streamUrl) return;

    this.content = content;

    const noContentEl = document.getElementById('together-no-content');
    const videoEl = document.getElementById('together-video');
    const overlayEl = document.getElementById('together-video-overlay');

    if (noContentEl) noContentEl.style.display = 'none';
    if (videoEl) videoEl.style.display = 'block';
    if (overlayEl) overlayEl.classList.remove('hidden');

    if (!this.video) this.video = videoEl;

    this.destroyHls();

    const url = content.streamUrl;

    const applyResumeTime = () => {
        if (resumeTime > 1 && this.video) {
            this.video.currentTime = resumeTime;
        }
    };

    // ---- HLS STREAM ----
    if (url.includes('.m3u8') || content.type === 'live' || content.isHls) {

        if (window.Hls && Hls.isSupported()) {

            this.hls = new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    maxBufferLength: 30,
    backBufferLength: 60
});

            this.hls.loadSource(url);
            this.hls.attachMedia(this.video);

            this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                applyResumeTime();

                if (this.isHost && !startPaused) {
                    this.video.play().catch(() => {});
                }

                this.video.load();
            });

            this.hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('[HLS ERROR]', data);
            });

            return;
        }

        // Safari / iOS native HLS
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.load();
            applyResumeTime();

            if (this.isHost && !startPaused) {
                this.video.play().catch(() => {});
            }

            return;
        }
    }

    // ---- NORMAL VIDEO ----
    this.video.src = url;
    this.video.load();

    this.video.addEventListener('loadedmetadata', () => {
        applyResumeTime();

        if (this.isHost && !startPaused) {
            this.video.play().catch(() => {});
        }
    }, { once: true });
}

    destroyHls() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        if (this.video) {
            this.video.pause();
            this.video.src = '';
        }
    }

    // ─── CONTENT PICKER ───────────────────────────────────────────────────────
    setupContentPicker() {
        const tabs = document.querySelectorAll('.tog-tab');
        const sourceSelect = document.getElementById('tog-source-select');
        const searchInput = document.getElementById('tog-search');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.contentTab = tab.dataset.tab;

                const sourceId = sourceSelect?.value;
                if (sourceId) {
                    this.loadPickerContent(sourceId);
                } else {
                    this.filterAndRenderPicker();
                }
            });
        });

        searchInput?.addEventListener('input', () => this.filterAndRenderPicker());

        // Load sources
        this.loadPickerSources(sourceSelect);
    }

    async loadPickerSources(sourceSelect) {
        if (!sourceSelect) return;
        try {
            const sources = await window.API.request('GET', '/sources');
            if (!sources || sources.length === 0) return;

            sourceSelect.innerHTML = `<option value="">${window.app.t("select-source")}</option>`;
            sources.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name || `Kaynak ${s.id}`;
                sourceSelect.appendChild(opt);
            });

            // Auto-select first source
            if (sources.length > 0) {
                sourceSelect.value = sources[0].id;
                this.loadPickerContent(sources[0].id);
            }

            sourceSelect.addEventListener('change', () => {
                if (sourceSelect.value) {
                    // Reset cached data so both tabs reload for the new source
                    this.allMovies = null;
                    this.allSeries = null;
                    this.allLive = null;
                    this.loadPickerContent(sourceSelect.value);
                }
            });
        } catch (e) {
            console.error('[Together] Failed to load sources:', e);
        }
    }

    async loadPickerContent(sourceId) {
        const grid = document.getElementById('together-picker-grid');
        if (!grid) return;
        grid.innerHTML = `<div class="together-picker-hint"><div class="loading"></div> ${this.app.t('together_loading')}</div>`;

        try {
            if (this.contentTab === 'movies') {
                const movies = await window.API.proxy.xtream.vodStreams(sourceId);
                this.allMovies = (movies || []).map(m => ({
                    id: m.stream_id,
                    title: m.name,
                    poster: m.stream_icon || m.cover,
                    type: 'movie',
                    sourceId,
                    container: m.container_extension || 'mp4',
                    year: m.year,
                    rating: m.rating
                }));
                this.filterAndRenderPicker();
            } else {
                const series = await window.API.proxy.xtream.series(sourceId);
                this.allSeries = (series || []).map(s => ({
                    id: s.series_id,
                    title: s.name,
                    poster: s.cover,
                    type: 'series',
                    sourceId,
                    year: s.year,
                    rating: s.rating
                }));
                this.filterAndRenderPicker();
            }
    const live = await window.API.proxy.xtream.liveStreams(sourceId);
    this.allLive = (live || []).map(l => ({
        id: l.stream_id,
        title: l.name,
        poster: l.stream_icon || l.cover,
        type: 'live',
        sourceId,
        category: l.category_id,
        container: l.container_extension || '.m3u8',
        container: l.container_extension || 'm3u8'
    }));

        } catch (e) {
    
            console.error('[Together] Error loading content:', e);
            if (grid) grid.innerHTML = `<div class="together-picker-hint">${window.app.t("Content could not be loaded.")}</div>`;
        }
    }

    filterAndRenderPicker() {
        const grid = document.getElementById('together-picker-grid');
        const sourceSelect = document.getElementById('tog-source-select');
        const searchInput = document.getElementById('tog-search');
        if (!grid) return;

        const sourceId = sourceSelect?.value;
        if (!sourceId) {
            grid.innerHTML = `<div class="together-picker-hint">${this.app.t('together_select_source')}</div>`;
            return;
        }

        const q = (searchInput?.value || '').toLowerCase();
        //const items = this.contentTab === 'movies' ? this.allMovies : this.allSeries ? this.allLive : this.allLive;

        let items;

if (this.contentTab === 'movies') {
    items = this.allMovies;
} else if (this.contentTab === 'series') {
    items = this.allSeries;
} else if (this.contentTab === 'live') {
    items = this.allLive;
}

        if (!items) {
            // Data not loaded yet — trigger a load
            if (sourceId) this.loadPickerContent(sourceId);
            return;
        }

        const filtered = q ? items.filter(i => (i.title || '').toLowerCase().includes(q)) : items;

        if (!filtered || filtered.length === 0) {
            grid.innerHTML = `<div class="together-picker-hint">${this.app.t('together_no_results')}</div>`;
            return;
        }

        const shown = filtered.slice(0, 60);
        grid.innerHTML = shown.map(item => `
            <div class="together-picker-card" data-id="${item.id}" data-type="${item.type}" data-source="${item.sourceId}" data-title="${item.title}" data-container="${item.container || ''}">
                <img src="${item.poster ? `/api/proxy/image?url=${encodeURIComponent(item.poster)}` : '/img/poster-placeholder.jpg'}"
                     alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='/img/poster-placeholder.jpg'">
                <p title="${item.title}">${item.title}</p>
            </div>
        `).join('');

        grid.querySelectorAll('.together-picker-card').forEach(card => {
    card.addEventListener('click', () => {

        if (card.dataset.type === 'series') {
            this.showSeriesEpisodePicker(
                card.dataset.id,
                card.dataset.source,
                card.dataset.title
            );

        } else if (card.dataset.type === 'movie') {
            this.selectMovie(
                card.dataset.id,
                card.dataset.source,
                card.dataset.title,
                card.dataset.container
            );

        } else if (card.dataset.type === 'live') {
            this.selectLive(
                card.dataset.id,
                card.dataset.source,
                card.dataset.title,
                card.dataset.container
            );
        }

    });
});
    }

    async selectMovie(streamId, sourceId, title, container) {
        const grid = document.getElementById('together-picker-grid');
        if (grid) grid.innerHTML = `<div class="together-picker-hint"><div class="loading"></div> ${window.app.t("Getting video address...")}</div>`;

        try {
            const result = await window.API.request('GET', `/proxy/xtream/${sourceId}/stream/${streamId}/movie?container=${container || 'mp4'}`);
            if (!result?.url) throw new Error(window.app.t("URL could not be obtained."));

            const item = this.allMovies.find(m => String(m.id) === String(streamId));
            const content = {
                streamUrl: result.url,
                title,
                poster: item?.poster,
                type: 'movie',
                sourceId,
                streamId,
                isHls: result.url.includes('.m3u8')
            };

            this.wsSend({ type: 'content_change', content });
            this.filterAndRenderPicker();
        } catch (e) {
            console.error('[Together] selectMovie error:', e);
            this.showToast((this.app.t(e.message) || e.message), 'error');
            this.filterAndRenderPicker();
        }
    }

    async showSeriesEpisodePicker(seriesId, sourceId, seriesTitle) {
        const grid = document.getElementById('together-picker-grid');
        if (grid) grid.innerHTML = `<div class="together-picker-hint"><div class="loading"></div> ${window.app.t("Episodes are loading...")}</div>`;

        try {
            const info = await window.API.proxy.xtream.seriesInfo(sourceId, seriesId);
            if (!info?.episodes) throw new Error(window.app.t("Episodes could not be loaded."));

            const seasons = Object.keys(info.episodes).sort((a, b) => parseInt(a) - parseInt(b));

            let html = `
                <div class="together-series-header">
                    <button class="together-back-series" id="tog-back-series">← ${window.app.t("Back")}</button>
                    <span>${seriesTitle}</span>
                </div>
            `;

            seasons.forEach(seasonNum => {
                const eps = info.episodes[seasonNum];
                html += `<div class="together-season-label">${window.app.t("Season")} ${seasonNum}</div>`;
                html += `<div class="together-episode-list">`;
                eps.forEach(ep => {
                    html += `
                        <div class="together-episode-item" 
                             data-ep-id="${ep.id}" 
                             data-source="${sourceId}"
                             data-title="${seriesTitle} S${seasonNum}E${ep.episode_num} - ${ep.title || ''}"
                             data-container="${ep.container_extension || 'mkv'}">
                            <span class="tog-ep-num">${window.app.t("E")}${ep.episode_num}</span>
                            <span class="tog-ep-title">${ep.title || `${window.app.t("episode")} ${ep.episode_num}`}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            });

            if (grid) {
                grid.innerHTML = html;
                grid.querySelector('#tog-back-series')?.addEventListener('click', () => this.filterAndRenderPicker());
                grid.querySelectorAll('.together-episode-item').forEach(item => {
                    item.addEventListener('click', () => {
                        this.selectEpisode(
                            item.dataset.epId,
                            item.dataset.source,
                            item.dataset.title,
                            item.dataset.container
                        );
                    });
                });
            }
        } catch (e) {
            console.error('[Together] showSeriesEpisodePicker error:', e);
            if (grid) grid.innerHTML = `<div class="together-picker-hint">${window.app.t("Episodes could not be loaded.")}</div>`;
        }
    }

    async selectEpisode(episodeId, sourceId, title, container) {
        try {
            const result = await window.API.request('GET', `/proxy/xtream/${sourceId}/stream/${episodeId}/series?container=${container || 'mkv'}`);
            if (!result?.url) throw new Error(window.app.t("URL could not be obtained."));

            const content = {
                streamUrl: result.url,
                title,
                type: 'series',
                sourceId,
                streamId: episodeId,
                isHls: result.url.includes('.m3u8')
            };

            this.wsSend({ type: 'content_change', content });
            this.filterAndRenderPicker();
        } catch (e) {
            console.error('[Together] selectEpisode error:', e);
            this.showToast((this.app.t(e.message) || e.message), 'error');
        }
    }

    // ─── LIVE ────────────────────────────────────────────────────────────────
    async selectLive(streamId, sourceId, title, container) {
        const grid = document.getElementById('together-picker-grid');
        if (grid) grid.innerHTML = `<div class="together-picker-hint"><div class="loading"></div> ${window.app.t("Getting video address...")}</div>`;
        try {
            const result = await window.API.request('GET', `/proxy/xtream/${sourceId}/stream/${streamId}/live?container=${container || 'm3u8'}`);
            if (!result?.url) throw new Error(window.app.t("URL could not be obtained."));
            const item = this.allLive.find(l => String(l.id) === String(streamId)); {
                 const content = {
                    streamUrl: result.url,
                    title,
                    poster: item?.poster,
                    type: 'live',
                    sourceId,
                    streamId,
                    isHls: true,
                    isHls: result.url.includes('.m3u8')
                };
                this.wsSend({ type: 'content_change', content });
                this.filterAndRenderPicker();
            }
        }
     catch (e) {
        console.error('[Together] selectLive error:', e);
        this.showToast((this.app.t(e.message) || e.message), 'error');
 }
    }


    // ─── CHAT ─────────────────────────────────────────────────────────────────
    sendChat() {
        const input = document.getElementById('together-chat-input');
        const msg = (input?.value || '').trim();
        if (!msg) return;
        this.wsSend({ type: 'chat', message: msg });
        if (input) input.value = '';
    }

    addChatMsg(username, text, kind = 'user') {
        this.chatMessages.push({ username, text, kind, ts: Date.now() });
        const el = document.getElementById('together-chat-messages');
        if (!el) return;

        const div = document.createElement('div');
        div.className = `together-chat-msg together-chat-${kind}`;
        if (kind === 'system') {
            div.innerHTML = `<span class="tog-chat-system">${text}</span>`;
        } else {
            div.innerHTML = `<span class="tog-chat-name">${username}</span><span class="tog-chat-text">${this.escapeHtml(text)}</span>`;
        }
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ─── LEAVE ROOM ───────────────────────────────────────────────────────────
    async leaveRoom(callApi = true) {
        this.destroyHls();
        clearInterval(this.pingInterval);

        if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }

        if (callApi && this.roomCode) {
            try {
                await window.API.request('DELETE', `/together/rooms/${this.roomCode}/leave`);
            } catch (e) {}
        }

        this.roomCode = null;
        this.isHost = false;
        this.members = [];
        this.content = null;
        this.allMovies = [];
        this.allSeries = [];
        this.allLive = [];
        this.state = 'lobby';
        this.render();
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────
    showError(el, msg) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    showToast(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `together-toast together-toast-${type}`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

window.TogetherPage = TogetherPage;
