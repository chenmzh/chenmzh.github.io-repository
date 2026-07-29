(function attachIronUI(root) {
  'use strict';

  const Data = root.IronData;

  class IronUI {
    constructor(game) {
      this.game = game;
      this.i18n = game.i18n || root.IronI18n || null;
      this.lastUpdate = 0;
      this.helpOpen = false;
      this.lastAssetStatus = null;
      this.groupClickTimers = new Map();
      this.mobilePanel = null;
      this.mobileLayoutQuery = typeof root.matchMedia === 'function'
        ? root.matchMedia('(max-width: 1024px)') : null;
      this.elements = {
        shell: document.getElementById('game-shell'),
        start: document.getElementById('start-screen'),
        result: document.getElementById('result-screen'),
        pause: document.getElementById('pause-screen'),
        help: document.getElementById('help-panel'),
        credits: document.getElementById('credits'),
        power: document.getElementById('power'),
        population: document.getElementById('population'),
        timer: document.getElementById('timer'),
        wave: document.getElementById('wave'),
        objective: document.getElementById('objective'),
        selection: document.getElementById('selection-info'),
        queue: document.getElementById('production-queue'),
        eventLog: document.getElementById('event-log'),
        resultTitle: document.getElementById('result-title'),
        resultCopy: document.getElementById('result-copy'),
        resultStats: document.getElementById('result-stats'),
        soundButton: document.getElementById('sound-button'),
        pauseButton: document.getElementById('pause-button'),
        startButton: document.getElementById('start-button'),
        startButtonLabel: document.getElementById('start-button-label'),
        startButtonStatus: document.getElementById('start-button-status'),
        controlGroups: document.getElementById('control-groups'),
        mobileBuildButton: document.getElementById('mobile-build-button'),
        mobileMapButton: document.getElementById('mobile-map-button'),
        mobilePanButton: document.getElementById('mobile-pan-button'),
        mobileBackdrop: document.getElementById('mobile-panel-backdrop'),
      };
      this.bind();
      this.unsubscribeLanguage = this.i18n && typeof this.i18n.subscribe === 'function'
        ? this.i18n.subscribe(() => this.onLanguageChange()) : null;
      this.updateSoundButton(game.audioEnabled);
      this.updateTouchPanState(game.touchPanMode);
      this.onStateChange(game);
    }

    t(key, params) {
      return this.i18n && typeof this.i18n.t === 'function' ? this.i18n.t(key, params) : key;
    }

    plural(key, count, params) {
      return this.i18n && typeof this.i18n.plural === 'function'
        ? this.i18n.plural(key, count, params) : this.t(`${key}.other`, { ...(params || {}), count });
    }

    entityName(kind, type, short) {
      const suffix = short ? 'short' : 'name';
      const key = `entity.${kind}.${type}.${suffix}`;
      const fallback = kind === 'unit' ? Data.UNIT_TYPES[type] : Data.BUILDING_TYPES[type];
      const translated = this.t(key);
      return translated === key ? (short ? fallback.shortLabel : fallback.label) : translated;
    }

    onLanguageChange() {
      if (this.lastAssetStatus) this.updateAssetProgress(this.lastAssetStatus);
      this.updateSoundButton(this.game.audioEnabled);
      this.updateTouchPanState(this.game.touchPanMode);
      this.onStateChange(this.game);
      if (this.game.renderer) this.game.renderer.render(this.game);
    }

    bind() {
      const on = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener(event, handler);
      };
      on('start-button', 'click', () => {
        const checked = document.querySelector('input[name="difficulty"]:checked');
        this.closeMobilePanels();
        this.game.start(checked ? checked.value : Data.BALANCE.defaultDifficulty);
      });
      on('restart-button', 'click', () => this.game.restart());
      on('resume-button', 'click', () => this.game.togglePause(false));
      on('pause-button', 'click', () => this.game.togglePause());
      on('help-button', 'click', () => this.toggleHelp());
      on('help-close', 'click', () => this.toggleHelp(false));
      on('close-help-button', 'click', () => this.toggleHelp(false));
      document.querySelectorAll('[data-close-help]').forEach((button) => {
        button.addEventListener('click', () => this.toggleHelp(false));
      });
      on('sound-button', 'click', () => {
        const enabled = this.game.toggleAudio();
        this.updateSoundButton(enabled);
      });
      document.querySelectorAll('[data-build]').forEach((button) => {
        button.addEventListener('click', () => {
          this.game.beginBuildingPlacement(button.dataset.build);
          this.closeMobilePanels();
        });
      });
      document.querySelectorAll('[data-unit]').forEach((button) => {
        button.addEventListener('click', () => this.game.queueUnit(button.dataset.unit, 'player'));
      });
      document.querySelectorAll('[data-command]').forEach((button) => {
        button.addEventListener('click', () => {
          const command = button.dataset.command;
          if (command === 'stop' && typeof this.game.stopSelected === 'function') {
            this.game.stopSelected();
          } else if (command === 'hold' && typeof this.game.holdSelected === 'function') {
            this.game.holdSelected();
          } else if (typeof this.game.setCommandMode === 'function') {
            this.game.setCommandMode(command);
            this.closeMobilePanels();
          }
        });
      });
      on('mobile-build-button', 'click', () => this.toggleMobilePanel('rack'));
      on('mobile-map-button', 'click', () => this.toggleMobilePanel('map'));
      on('mobile-pan-button', 'click', () => {
        if (typeof this.game.setTouchPanMode === 'function') this.game.setTouchPanMode();
        this.closeMobilePanels();
      });
      on('mobile-focus-button', 'click', () => {
        if (this.game.getSelected().length > 0) this.game.centerSelection();
        else this.game.centerCameraOnBase();
        this.closeMobilePanels();
      });
      on('mobile-rack-close', 'click', () => this.closeMobilePanels());
      on('mobile-map-close', 'click', () => this.closeMobilePanels());
      on('mobile-panel-backdrop', 'click', () => this.closeMobilePanels());
      on('minimap-canvas', 'click', () => this.closeMobilePanels());
      document.querySelectorAll('[data-control-group]').forEach((button) => {
        const slot = String(button.dataset.controlGroup);
        button.addEventListener('click', (event) => {
          if (event.detail > 1) return;
          const previous = this.groupClickTimers.get(slot);
          if (previous) clearTimeout(previous);
          this.groupClickTimers.set(slot, setTimeout(() => {
            this.groupClickTimers.delete(slot);
            this.recallControlGroup(slot, false);
          }, 220));
        });
        button.addEventListener('dblclick', (event) => {
          event.preventDefault();
          const pending = this.groupClickTimers.get(slot);
          if (pending) clearTimeout(pending);
          this.groupClickTimers.delete(slot);
          this.recallControlGroup(slot, true);
        });
      });
      window.addEventListener('keydown', (event) => {
        if (event.code === 'Escape' && this.mobilePanel) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.closeMobilePanels();
          return;
        }
        if (event.code === 'Slash' && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          this.toggleHelp();
        }
      }, true);
      const closeIfDesktop = () => {
        if (this.mobileLayoutQuery && !this.mobileLayoutQuery.matches) this.closeMobilePanels();
      };
      window.addEventListener('resize', closeIfDesktop, { passive: true });
      if (this.mobileLayoutQuery && typeof this.mobileLayoutQuery.addEventListener === 'function') {
        this.mobileLayoutQuery.addEventListener('change', (event) => {
          closeIfDesktop();
          if (typeof this.game.setTouchPanMode === 'function') this.game.setTouchPanMode(event.matches);
        });
      }
    }

    toggleMobilePanel(panel) {
      const next = this.mobilePanel === panel ? null : panel;
      this.setMobilePanel(next);
    }

    closeMobilePanels() {
      this.setMobilePanel(null);
    }

    setMobilePanel(panel) {
      this.mobilePanel = panel === 'rack' || panel === 'map' ? panel : null;
      const rackOpen = this.mobilePanel === 'rack';
      const mapOpen = this.mobilePanel === 'map';
      if (this.elements.shell) {
        this.elements.shell.classList.toggle('is-mobile-rack-open', rackOpen);
        this.elements.shell.classList.toggle('is-mobile-map-open', mapOpen);
      }
      if (this.elements.mobileBuildButton) {
        this.elements.mobileBuildButton.setAttribute('aria-expanded', String(rackOpen));
      }
      if (this.elements.mobileMapButton) {
        this.elements.mobileMapButton.setAttribute('aria-expanded', String(mapOpen));
      }
      if (this.elements.mobileBackdrop) {
        this.elements.mobileBackdrop.setAttribute('aria-hidden', String(!this.mobilePanel));
        this.elements.mobileBackdrop.tabIndex = this.mobilePanel ? 0 : -1;
      }
    }

    updateTouchPanState(active) {
      const enabled = Boolean(active);
      if (this.elements.shell) this.elements.shell.classList.toggle('is-touch-pan-mode', enabled);
      if (!this.elements.mobilePanButton) return;
      this.elements.mobilePanButton.setAttribute('aria-pressed', String(enabled));
      const label = this.t(enabled ? 'mobile.panDisableAria' : 'mobile.panEnableAria');
      this.elements.mobilePanButton.setAttribute('aria-label', label);
      this.elements.mobilePanButton.title = label;
    }

    toggleHelp(force) {
      this.helpOpen = typeof force === 'boolean' ? force : !this.helpOpen;
      if (this.elements.help) {
        this.elements.help.hidden = !this.helpOpen;
        this.elements.help.classList.toggle('is-visible', this.helpOpen);
        this.elements.help.setAttribute('aria-hidden', String(!this.helpOpen));
      }
      const helpButton = document.getElementById('help-button');
      if (helpButton) helpButton.setAttribute('aria-expanded', String(this.helpOpen));
    }

    loadAssets(assetStore) {
      this.assetStore = assetStore;
      this.updateAssetProgress(assetStore.status());
      assetStore.loadAll((status) => this.updateAssetProgress(status)).then((status) => {
        this.updateAssetProgress(status);
        const failed = this.collectionSize(status && status.failed);
        const failedBase = this.collectionSize(status && status.failedBase);
        const failedAnimations = this.collectionSize(status && status.failedAnimations);
        const reportsSplitFailures = status && (Array.isArray(status.failedBase) || Array.isArray(status.failedAnimations));
        if (failedBase) this.game.logKey('assets.failedNotice', { count: failedBase }, 'warning');
        if (failedAnimations) {
          this.game.logKey('assets.animationFailedNotice', { count: failedAnimations }, 'warning');
        } else if (failed && !reportsSplitFailures) {
          this.game.logKey('assets.failedNotice', { count: failed }, 'warning');
        }
        if (failed) {
          this.update(this.game, true);
        }
      });
    }

    updateAssetProgress(status) {
      const snapshot = status || { state: 'unavailable', total: 0, loaded: [], failed: [] };
      this.lastAssetStatus = snapshot;
      const loaded = this.collectionSize(snapshot.loaded);
      const failed = this.collectionSize(snapshot.failed);
      const inferredTotal = loaded + failed + this.collectionSize(snapshot.pending) + this.collectionSize(snapshot.idle);
      const declaredTotal = Number(snapshot.total);
      const total = Number.isFinite(declaredTotal) && declaredTotal > 0 ? declaredTotal : inferredTotal;
      const settled = snapshot.state === 'ready' || snapshot.state === 'degraded' || snapshot.state === 'unavailable';
      if (this.elements.startButton) {
        this.elements.startButton.disabled = !settled;
        this.elements.startButton.setAttribute('aria-busy', String(!settled));
      }
      if (settled) {
        this.text(this.elements.startButtonLabel, this.t('start.action'));
        this.text(this.elements.startButtonStatus, failed
          ? this.t('assets.status.degraded', { count: failed })
          : snapshot.state === 'unavailable' ? this.t('assets.status.procedural') : this.t('assets.status.ready'));
      } else {
        this.text(this.elements.startButtonLabel, total > 0
          ? this.t('assets.progress', { loaded, total }) : this.t('assets.preparing'));
        this.text(this.elements.startButtonStatus, this.t('assets.status.uplink'));
      }
    }

    collectionSize(value) {
      if (Array.isArray(value) || value instanceof Set || value instanceof Map) return value.size == null ? value.length : value.size;
      const count = Number(value);
      return Number.isFinite(count) && count > 0 ? count : 0;
    }

    onStateChange(game) {
      document.body.dataset.gameState = game.state;
      if (this.elements.shell) this.elements.shell.dataset.gameState = game.state;
      if (game.state !== 'running' && this.mobilePanel) this.closeMobilePanels();
      this.setOverlay(this.elements.start, game.state === 'menu');
      this.setOverlay(this.elements.pause, game.state === 'paused');
      this.setOverlay(this.elements.result, game.state === 'won' || game.state === 'lost');
      if (this.elements.pauseButton) {
        const paused = game.state === 'paused';
        this.elements.pauseButton.setAttribute('aria-label', this.t(paused ? 'controls.resumeAria' : 'controls.pauseAria'));
        this.elements.pauseButton.title = this.t(paused ? 'controls.resume' : 'controls.pause');
        this.elements.pauseButton.classList.toggle('is-active', paused);
      }
      if (game.result && (game.state === 'won' || game.state === 'lost')) this.renderResult(game);
      this.update(game, true);
    }

    setOverlay(element, visible) {
      if (!element) return;
      element.hidden = !visible;
      element.classList.toggle('is-visible', visible);
      element.setAttribute('aria-hidden', String(!visible));
    }

    update(game, force) {
      const now = performance.now();
      if (!force && now - this.lastUpdate < 100) return;
      this.lastUpdate = now;
      const powerDelta = game.power.player.supply - game.power.player.use;
      this.text(this.elements.credits, this.i18n && typeof this.i18n.formatNumber === 'function'
        ? this.i18n.formatNumber(Math.floor(game.resources.player)) : String(Math.floor(game.resources.player)));
      this.text(this.elements.power, `${powerDelta >= 0 ? '+' : ''}${powerDelta} MW`);
      this.text(this.elements.population, `${game.population.player.used} / ${game.population.player.cap}`);
      this.text(this.elements.timer, this.formatTime(game.time));
      const waveIn = game.ai ? Math.max(0, Math.ceil(game.ai.waveTimer)) : 0;
      this.text(this.elements.wave, this.t(game.wave === 0 ? 'hud.wave.first' : 'hud.wave.active', {
        wave: String(game.wave).padStart(2, '0'), seconds: waveIn,
      }));
      this.text(this.elements.objective, this.t(game.state === 'running'
        ? 'hud.objective.running' : game.state === 'paused' ? 'hud.objective.paused' : 'hud.objective.menu'));
      if (this.elements.power) this.elements.power.classList.toggle('is-critical', powerDelta < 0);
      this.renderSelection(game);
      this.renderControlGroups(game);
      this.renderQueue(game);
      this.renderLogs(game);
      this.renderBuildState(game);
      this.updateCommandState(game);
      if (this.elements.shell) {
        this.elements.shell.dataset.credits = String(Math.floor(game.resources.player));
        this.elements.shell.dataset.selected = String(game.selectedIds.size);
        this.elements.shell.dataset.wave = String(game.wave);
      }
    }

    renderSelection(game) {
      const container = this.elements.selection;
      if (!container) return;
      const selected = game.getSelected();
      if (selected.length === 0) {
        container.innerHTML = `<span class="selection-sigil" aria-hidden="true">Ø</span><div><strong>${this.escape(this.t('selection.none'))}</strong><small>${this.escape(this.t('selection.noneUnitHint'))}</small></div>`;
        return;
      }
      if (selected.length > 1) {
        const counts = {};
        let hp = 0;
        let maxHp = 0;
        selected.forEach((entity) => {
          const def = entity.kind === 'unit' ? Data.UNIT_TYPES[entity.type] : Data.BUILDING_TYPES[entity.type];
          const label = this.entityName(entity.kind, entity.type, true);
          counts[label] = (counts[label] || 0) + 1;
          hp += entity.hp;
          maxHp += entity.maxHp;
        });
        const roster = Object.entries(counts).map(([label, count]) => `${this.escape(label)} ×${count}`).join(' · ');
        container.innerHTML = `
          <span class="selection-sigil" aria-hidden="true">G${selected.length}</span>
          <div><strong>${this.escape(this.t('selection.group', { count: selected.length }))}</strong><small>${roster}</small>
          <span class="selection-meter"><i style="width:${Math.round((hp / maxHp) * 100)}%"></i></span></div>`;
        return;
      }
      const entity = selected[0];
      const def = entity.kind === 'unit' ? Data.UNIT_TYPES[entity.type] : Data.BUILDING_TYPES[entity.type];
      const hpPercent = Math.round((entity.hp / entity.maxHp) * 100);
      let status = this.t('status.standby');
      if (entity.kind === 'building') {
        if (!entity.complete) status = this.t('status.constructing', {
          percent: Math.round((entity.constructionElapsed / def.buildTime) * 100),
        });
        else if (entity.queue.length) status = this.t('status.producing', {
          unit: this.entityName('unit', entity.queue[0].type, true),
        });
        else status = this.t(game.getPowerFactor(entity.team) < 1 ? 'status.lowPower' : 'status.online');
      } else if (entity.type === 'harvester') {
        const stateKey = `status.harvester.${entity.harvestState || 'seeking'}`;
        status = this.t('status.harvester.cargo', {
          state: this.t(this.i18n && this.i18n.has(stateKey) ? stateKey : 'status.standby'),
          cargo: entity.cargo,
          capacity: def.cargo,
        });
      } else if (entity.command) {
        const statusKeys = {
          move: 'status.command.moving',
          attackMove: 'status.command.attackMove',
          patrol: 'status.command.patrol',
          hold: 'status.command.hold',
        };
        status = this.t(statusKeys[entity.command.type] || 'status.command.engaging');
      }
      const name = this.entityName(entity.kind, entity.type, false);
      const shortName = this.entityName(entity.kind, entity.type, true);
      const kind = this.t(entity.kind === 'unit' ? 'entity.kind.unit' : 'entity.kind.structure');
      container.innerHTML = `
        <span class="selection-sigil" aria-hidden="true">${this.escape(shortName)}</span>
        <div><strong>${this.escape(this.t('selection.entity', { name, kind, id: String(entity.id).padStart(3, '0') }))}</strong>
        <small>${this.escape(this.t('selection.health', { status, hp: Math.ceil(entity.hp), maxHp: entity.maxHp }))}</small>
        <span class="selection-meter"><i style="width:${hpPercent}%"></i></span></div>`;
    }

    recallControlGroup(slot, center) {
      if (typeof this.game.recallControlGroup === 'function') {
        this.game.recallControlGroup(String(slot), { center: Boolean(center) });
      } else {
        const stored = this.game.controlGroups instanceof Map
          ? this.game.controlGroups.get(String(slot)) : null;
        const ids = Array.isArray(stored) || stored instanceof Set ? [...stored] : [];
        const livingIds = ids.filter((id) => {
          const entity = typeof this.game.getEntity === 'function' ? this.game.getEntity(id) : null;
          return entity && entity.hp > 0;
        });
        if (livingIds.length) this.game.selectedIds = new Set(livingIds);
        if (center) this.centerCurrentSelection();
      }
      this.renderControlGroups(this.game);
    }

    centerCurrentSelection() {
      const selected = typeof this.game.getSelected === 'function' ? this.game.getSelected() : [];
      if (!selected.length || typeof this.game.centerCameraOn !== 'function') return;
      const center = selected.reduce((sum, entity) => ({
        x: sum.x + entity.x,
        y: sum.y + entity.y,
      }), { x: 0, y: 0 });
      this.game.centerCameraOn(center.x / selected.length, center.y / selected.length);
    }

    controlGroupMembers(game, slot) {
      let stored = null;
      if (typeof game.getControlGroup === 'function') {
        try { stored = game.getControlGroup(String(slot)); } catch (_) { stored = null; }
      }
      if (stored == null && game.controlGroups instanceof Map) stored = game.controlGroups.get(String(slot));
      if (stored && !Array.isArray(stored) && !(stored instanceof Set)) {
        stored = stored.entities || stored.members || stored.ids || [];
      }
      const values = Array.isArray(stored) || stored instanceof Set ? [...stored] : [];
      return values.map((value) => {
        if (value && typeof value === 'object') return value;
        return typeof game.getEntity === 'function' ? game.getEntity(value) : null;
      }).filter((entity) => entity && entity.hp > 0);
    }

    renderControlGroups(game) {
      const container = this.elements.controlGroups;
      if (!container || typeof container.querySelectorAll !== 'function') return;
      const selectedIds = game.selectedIds instanceof Set ? game.selectedIds : new Set();
      container.querySelectorAll('[data-control-group]').forEach((button) => {
        const slot = String(button.dataset.controlGroup);
        const members = this.controlGroupMembers(game, slot);
        const ids = new Set(members.map((entity) => entity.id));
        const active = ids.size > 0 && ids.size === selectedIds.size
          && [...ids].every((id) => selectedIds.has(id));
        const count = button.querySelector('.group-slot__count');
        if (count) count.textContent = members.length ? String(members.length) : '—';
        button.classList.toggle('is-empty', members.length === 0);
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        button.setAttribute('aria-disabled', String(members.length === 0));
        button.setAttribute('aria-label', this.t(members.length
          ? 'groups.slot.countAria' : 'groups.slot.emptyAria', { slot, count: members.length }));
      });
    }

    renderQueue(game) {
      const container = this.elements.queue;
      if (!container) return;
      const queues = game.entities.filter((entity) => entity.kind === 'building'
        && entity.team === 'player' && entity.hp > 0 && entity.queue.length > 0);
      if (queues.length === 0) {
        container.innerHTML = `<p class="empty-state"><span>${this.escape(this.t('queue.standby'))}</span><i>${this.escape(this.t('queue.empty'))}</i></p>`;
        return;
      }
      container.innerHTML = queues.map((building) => {
        const item = building.queue[0];
        const unit = Data.UNIT_TYPES[item.type];
        const progress = Math.min(100, Math.round((item.elapsed / item.total) * 100));
        return `<div class="queue-item" style="--progress:${progress}%">
          <span class="queue-code">${this.escape(this.entityName('unit', item.type, true))}</span>
          <div><b>${this.escape(this.entityName('unit', item.type, false))}</b><small>${this.escape(this.plural('queue.remaining', building.queue.length - 1))}</small></div>
          <strong>${progress}%</strong>
        </div>`;
      }).join('');
    }

    renderLogs(game) {
      const container = this.elements.eventLog;
      if (!container) return;
      if (game.logs.length === 0) {
        container.innerHTML = `<p><time>00:00</time><span>${this.escape(this.t('event.waiting'))}</span></p>`;
        return;
      }
      container.innerHTML = game.logs.map((entry) => `
        <p class="is-${this.escape(entry.tone)}"><time>${this.formatTime(entry.time)}</time><span>${this.escape(entry.key ? this.t(entry.key, entry.params) : entry.message)}</span></p>`).join('');
    }

    renderBuildState(game) {
      document.querySelectorAll('[data-build]').forEach((button) => {
        const type = button.dataset.build;
        const def = Data.BUILDING_TYPES[type];
        const available = game.hasPrerequisite('player', type);
        const affordable = game.resources.player >= def.cost;
        button.classList.toggle('is-locked', !available);
        button.classList.toggle('is-expensive', available && !affordable);
        button.classList.toggle('is-active', game.placementType === type);
        button.setAttribute('aria-pressed', String(game.placementType === type));
        const name = this.entityName('building', type, false);
        button.title = this.t('tooltip.production', { name, cost: def.cost, seconds: def.buildTime });
        const label = button.querySelector('.tile-copy b');
        if (label) label.textContent = name;
        const cost = button.querySelector('[data-cost]');
        if (cost) cost.textContent = String(def.cost);
        const copy = button.querySelector('.tile-copy small');
        if (copy) {
          copy.textContent = `${def.cost} · ${this.t(`build.role.${type}`)}`;
        }
      });
      document.querySelectorAll('[data-unit]').forEach((button) => {
        const type = button.dataset.unit;
        const def = Data.UNIT_TYPES[type];
        const producer = game.entities.some((entity) => entity.kind === 'building' && entity.team === 'player'
          && entity.complete && entity.hp > 0 && Data.BUILDING_TYPES[entity.type].production.includes(type));
        button.classList.toggle('is-locked', !producer);
        button.classList.toggle('is-expensive', producer && game.resources.player < def.cost);
        const name = this.entityName('unit', type, false);
        button.title = this.t('tooltip.production', { name, cost: def.cost, seconds: def.buildTime });
        const label = button.querySelector('.tile-copy b');
        if (label) label.textContent = name;
        const cost = button.querySelector('[data-cost]');
        if (cost) cost.textContent = String(def.cost);
        const copy = button.querySelector('.tile-copy small');
        if (copy) {
          copy.textContent = `${def.cost} · ${this.t(`unit.role.${type}`)}`;
        }
      });
    }

    updateCommandState(game) {
      document.querySelectorAll('[data-command]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.command === game.commandMode);
        button.setAttribute('aria-pressed', String(button.dataset.command === game.commandMode));
      });
    }

    renderResult(game) {
      const victory = game.state === 'won';
      this.text(this.elements.resultTitle, this.t(victory ? 'result.victory' : 'result.defeat'));
      this.text(this.elements.resultCopy, game.result.messageKey
        ? this.t(game.result.messageKey, game.result.messageParams) : game.result.message);
      if (this.elements.resultStats) {
        this.elements.resultStats.innerHTML = `
          <div><span>${this.escape(this.t('result.duration'))}</span><b>${this.formatTime(game.result.time)}</b></div>
          <div><span>${this.escape(this.t('result.kills'))}</span><b>${game.stats.player.kills}</b></div>
          <div><span>${this.escape(this.t('result.losses'))}</span><b>${game.stats.player.losses}</b></div>
          <div><span>${this.escape(this.t('result.harvested'))}</span><b>${this.i18n && typeof this.i18n.formatNumber === 'function' ? this.i18n.formatNumber(game.stats.player.harvested) : game.stats.player.harvested}</b></div>`;
      }
    }

    updateSoundButton(enabled) {
      if (!this.elements.soundButton) return;
      this.elements.soundButton.setAttribute('aria-pressed', String(enabled));
      this.elements.soundButton.setAttribute('aria-label', this.t(enabled ? 'controls.soundDisableAria' : 'controls.soundEnableAria'));
      this.elements.soundButton.title = this.t(enabled ? 'controls.soundEnabled' : 'controls.soundDisabled');
      this.elements.soundButton.classList.toggle('is-muted', !enabled);
    }

    formatTime(seconds) {
      const total = Math.max(0, Math.floor(seconds || 0));
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }

    text(element, value) {
      if (element) element.textContent = value;
    }

    escape(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
  }

  function boot() {
    const canvas = document.getElementById('game-canvas');
    const minimap = document.getElementById('minimap-canvas');
    const viewportElement = document.getElementById('battlefield-viewport');
    const i18n = root.IronI18n || null;
    if (i18n && typeof i18n.bind === 'function') i18n.bind(document);
    if (!canvas || !minimap) throw new Error(i18n ? i18n.t('error.canvasMissing') : '战场画布未找到');
    const assets = typeof root.IronAssetStore === 'function' ? new root.IronAssetStore({ timeoutMs: 8000 }) : null;
    const game = new root.IronGame(canvas, minimap, { viewportElement, assets, i18n });
    const ui = new IronUI(game);
    game.attachUI(ui);
    if (assets) ui.loadAssets(assets);
    else ui.updateAssetProgress({ state: 'unavailable', total: 0, loaded: [], failed: [] });
    root.ironDawnGame = game;
    root.ironDawnAssets = assets;
    root.__IRON_DAWN__ = Object.freeze({
      snapshot: () => game.snapshot(),
      diagnostics: () => game.diagnostics(),
      probeFrame: () => game.probeFrame(),
      start: (difficulty) => game.start(difficulty),
      step: (milliseconds) => game.step(milliseconds),
      spawnUnit: (type, team, x, y) => game.addUnit(type, team, x, y),
      damageEntity: (id, amount) => game.applyDamage(game.getEntity(id), amount, 0),
      reset: () => game.restart(),
      touchPanMode: () => game.touchPanMode,
      setTouchPanMode: (enabled) => game.setTouchPanMode(enabled),
      language: () => i18n ? i18n.getLocale() : 'zh-CN',
      setLanguage: (locale) => i18n ? i18n.setLocale(locale) : 'zh-CN',
    });
  }

  root.IronUI = IronUI;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
