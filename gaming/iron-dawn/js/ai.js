(function attachIronAI(root) {
  'use strict';

  const Data = root.IronData;

  class IronAI {
    constructor(game) {
      this.game = game;
      this.reset(Data.BALANCE.defaultDifficulty);
    }

    reset(difficultyKey) {
      this.config = Data.DIFFICULTY[difficultyKey] || Data.DIFFICULTY.normal;
      this.decisionTimer = 1.2;
      this.waveTimer = this.config.firstWaveTime;
      this.waveWarningSent = false;
      this.buildCursor = 0;
      this.productionCursor = 0;
    }

    update(dt) {
      const game = this.game;
      if (game.state !== 'running' || !game.findBuilding('enemy', 'hq')) return;
      this.waveTimer -= dt;
      if (this.waveTimer <= 12 && !this.waveWarningSent) {
        this.waveWarningSent = true;
        game.logKey('ai.wave.incoming', null, 'critical');
        game.playTone('alert');
      }
      if (this.waveTimer <= 0) this.launchWave();

      this.decisionTimer -= dt;
      if (this.decisionTimer > 0) return;
      this.decisionTimer = 1.35 + game.rng() * 0.7;
      this.manageBase();
      this.manageProduction();
    }

    manageBase() {
      const game = this.game;
      const power = game.power.enemy;
      const count = (type) => game.countType('enemy', 'building', type, true);
      const constructing = (type) => game.countType('enemy', 'building', type, false) > count(type);

      if (power.supply < power.use + 35 && !constructing('powerPlant')) {
        game.aiBuild('powerPlant');
        return;
      }
      if (count('barracks') === 0 && !constructing('barracks')) {
        game.aiBuild('barracks');
        return;
      }
      if (count('factory') === 0 && game.time > 35 && !constructing('factory')) {
        game.aiBuild('factory');
        return;
      }
      if (count('airfield') === 0 && game.time > 90
        && game.resources.enemy >= Data.BUILDING_TYPES.airfield.cost && !constructing('airfield')) {
        game.aiBuild('airfield');
        return;
      }
      if (count('refinery') < 2 && game.time > 155 && game.resources.enemy > 1900 && !constructing('refinery')) {
        game.aiBuild('refinery');
        return;
      }
      const turretLimit = game.time > 260 ? 3 : 2;
      if (count('turret') < turretLimit && game.resources.enemy > 1100 && !constructing('turret')) {
        game.aiBuild('turret');
      }
    }

    manageProduction() {
      const game = this.game;
      const harvesters = game.countType('enemy', 'unit', 'harvester', false);
      if (harvesters < 2 && game.findBuilding('enemy', 'factory')) {
        if (game.queueUnit('harvester', 'enemy')) return;
      }
      const combatUnits = game.entities.filter((entity) => entity.kind === 'unit'
        && entity.team === 'enemy' && entity.type !== 'harvester' && entity.hp > 0).length;
      const targetArmy = Math.min(34, 7 + game.wave * 5 + Math.floor(game.time / 90) * 2);
      if (combatUnits >= targetArmy) return;

      let plan;
      if (game.time < 95) plan = ['rifle', 'rocket', 'rifle', 'scout'];
      else if (game.time < 230) plan = ['rocket', 'scout', 'fighter', 'rifle', 'tank', 'rocket'];
      else plan = ['tank', 'fighter', 'rocket', 'scout', 'tank', 'fighter', 'rifle'];
      for (let offset = 0; offset < plan.length; offset += 1) {
        const index = (this.productionCursor + offset) % plan.length;
        if (game.queueUnit(plan[index], 'enemy')) {
          this.productionCursor = (index + 1) % plan.length;
          return;
        }
      }
    }

    launchWave() {
      const game = this.game;
      const playerHq = game.findBuilding('player', 'hq');
      if (!playerHq) return;
      const enemyHq = game.findBuilding('enemy', 'hq');
      const units = game.entities.filter((entity) => entity.kind === 'unit'
        && entity.team === 'enemy' && entity.type !== 'harvester' && entity.hp > 0);
      units.sort((a, b) => {
        const ad = enemyHq ? root.IronCore.distanceSquared(a, enemyHq) : 0;
        const bd = enemyHq ? root.IronCore.distanceSquared(b, enemyHq) : 0;
        return ad - bd;
      });
      const defenders = Math.min(this.config.defenders, Math.floor(units.length / 3));
      const attackers = units.slice(defenders);
      if (attackers.length < 3) {
        this.waveTimer = 20;
        this.waveWarningSent = false;
        return;
      }
      const alternateTarget = game.wave % 2 === 1
        ? game.entities.find((entity) => entity.kind === 'building' && entity.team === 'player'
          && entity.type === 'refinery' && entity.hp > 0)
        : null;
      const target = alternateTarget || playerHq;
      attackers.forEach((unit) => {
        unit.command = {
          type: 'attackMove',
          x: target.x,
          y: target.y,
          targetId: null,
        };
      });
      game.wave += 1;
      game.effects.push({
        type: 'signal', x: target.x, y: target.y, age: 0, duration: 2.2, team: 'enemy',
      });
      const waveKey = game.i18n && typeof game.i18n.plural === 'function'
        ? `ai.wave.launched.${new Intl.PluralRules(game.i18n.getLocale()).select(attackers.length)}`
        : 'ai.wave.launched.other';
      game.logKey(waveKey, { wave: game.wave, count: attackers.length }, 'critical');
      game.playTone('alert');
      this.waveTimer = Math.max(45, this.config.waveInterval - game.wave * 3);
      this.waveWarningSent = false;
    }
  }

  root.IronAI = IronAI;
})(window);
