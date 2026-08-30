(function startCloudCabinet() {
  "use strict";

  const logic = window.CloudCabinetLogic;
  if (!logic) throw new Error("CloudCabinetLogic 未加载");

  const STORAGE_KEY = "cloud-patisserie-case-v3";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const elements = {
    coinCount: document.querySelector("#coinCount"),
    coinWallet: document.querySelector("#coinWallet"),
    soundToggle: document.querySelector("#soundToggle"),
    caseNumber: document.querySelector("#caseNumber"),
    remainingCount: document.querySelector("#remainingCount"),
    openedCount: document.querySelector("#openedCount"),
    caseProgress: document.querySelector("#caseProgress"),
    boxGrid: document.querySelector("#boxGrid"),
    nextCaseButton: document.querySelector("#nextCaseButton"),
    refreshShelfButton: document.querySelector("#refreshShelfButton"),
    restartGameButton: document.querySelector("#restartGameButton"),
    boxInspector: document.querySelector("#boxInspector"),
    selectedBoxStage: document.querySelector("#selectedBoxStage"),
    selectedBoxNumber: document.querySelector("#selectedBoxNumber"),
    inspectorKicker: document.querySelector("#inspectorKicker"),
    inspectorTitle: document.querySelector("#inspectorTitle"),
    inspectorText: document.querySelector("#inspectorText"),
    clueStack: document.querySelector("#clueStack"),
    shakeButton: document.querySelector("#shakeButton"),
    openBoxButton: document.querySelector("#openBoxButton"),
    collectionUnlocked: document.querySelector("#collectionUnlocked"),
    collectionTotal: document.querySelector("#collectionTotal"),
    shelfCharacters: document.querySelector("#shelfCharacters"),
    speechBubble: document.querySelector("#speechBubble"),
    seriesStrip: document.querySelector("#seriesStrip"),
    showAllCharacters: document.querySelector("#showAllCharacters"),
    shelfBonusValue: document.querySelector("#shelfBonusValue"),
    packingIdle: document.querySelector("#packingIdle"),
    packingLive: document.querySelector("#packingLive"),
    packingResult: document.querySelector("#packingResult"),
    startPackingButton: document.querySelector("#startPackingButton"),
    packingAgainButton: document.querySelector("#packingAgainButton"),
    packingTimer: document.querySelector("#packingTimer"),
    packingTimeBar: document.querySelector("#packingTimeBar"),
    packingScore: document.querySelector("#packingScore"),
    targetDessert: document.querySelector("#targetDessert"),
    comboBadge: document.querySelector("#comboBadge"),
    dessertTrays: document.querySelector("#dessertTrays"),
    packingFeedback: document.querySelector("#packingFeedback"),
    packingEarned: document.querySelector("#packingEarned"),
    packingCorrect: document.querySelector("#packingCorrect"),
    packingBestCombo: document.querySelector("#packingBestCombo"),
    packingGame: document.querySelector("#packingGame"),
    earningModes: document.querySelector("#earningModes"),
    quizIntro: document.querySelector("#quizIntro"),
    quizModeIcon: document.querySelector("#quizModeIcon"),
    quizModeKicker: document.querySelector("#quizModeKicker"),
    quizModeTitle: document.querySelector("#quizModeTitle"),
    quizModeDescription: document.querySelector("#quizModeDescription"),
    quizRewardHint: document.querySelector("#quizRewardHint"),
    quizSourceLink: document.querySelector("#quizSourceLink"),
    startQuizButton: document.querySelector("#startQuizButton"),
    quizLive: document.querySelector("#quizLive"),
    quizModeBadge: document.querySelector("#quizModeBadge"),
    quizProgress: document.querySelector("#quizProgress"),
    quizScore: document.querySelector("#quizScore"),
    quizQuestionNumber: document.querySelector("#quizQuestionNumber"),
    quizQuestion: document.querySelector("#quizQuestion"),
    quizOptions: document.querySelector("#quizOptions"),
    quizFeedback: document.querySelector("#quizFeedback"),
    quizFeedbackTitle: document.querySelector("#quizFeedbackTitle"),
    quizExplanation: document.querySelector("#quizExplanation"),
    quizQuestionSource: document.querySelector("#quizQuestionSource"),
    quizNextButton: document.querySelector("#quizNextButton"),
    quizResult: document.querySelector("#quizResult"),
    quizResultStamp: document.querySelector("#quizResultStamp"),
    quizResultMode: document.querySelector("#quizResultMode"),
    quizEarned: document.querySelector("#quizEarned"),
    quizCorrect: document.querySelector("#quizCorrect"),
    quizBestStreak: document.querySelector("#quizBestStreak"),
    quizPerfectBonus: document.querySelector("#quizPerfectBonus"),
    quizAgainButton: document.querySelector("#quizAgainButton"),
    arcadeIntro: document.querySelector("#arcadeIntro"),
    arcadeModeIcon: document.querySelector("#arcadeModeIcon"),
    arcadeModeKicker: document.querySelector("#arcadeModeKicker"),
    arcadeModeTitle: document.querySelector("#arcadeModeTitle"),
    arcadeModeDescription: document.querySelector("#arcadeModeDescription"),
    arcadeRewardHint: document.querySelector("#arcadeRewardHint"),
    arcadeIntroInstructions: document.querySelector("#arcadeIntroInstructions"),
    startArcadeButton: document.querySelector("#startArcadeButton"),
    arcadeLive: document.querySelector("#arcadeLive"),
    arcadeModeBadge: document.querySelector("#arcadeModeBadge"),
    arcadeScore: document.querySelector("#arcadeScore"),
    arcadeCoinPreview: document.querySelector("#arcadeCoinPreview"),
    arcadeCanvas: document.querySelector("#arcadeCanvas"),
    arcadeStatus: document.querySelector("#arcadeStatus"),
    arcadeTouchControls: document.querySelector("#arcadeTouchControls"),
    arcadeLiveInstructions: document.querySelector("#arcadeLiveInstructions"),
    arcadeAbandonButton: document.querySelector("#arcadeAbandonButton"),
    arcadeResult: document.querySelector("#arcadeResult"),
    arcadeResultStamp: document.querySelector("#arcadeResultStamp"),
    arcadeResultReason: document.querySelector("#arcadeResultReason"),
    arcadeFinalScore: document.querySelector("#arcadeFinalScore"),
    arcadeEarned: document.querySelector("#arcadeEarned"),
    arcadeResultMode: document.querySelector("#arcadeResultMode"),
    arcadeBestScore: document.querySelector("#arcadeBestScore"),
    arcadeAgainButton: document.querySelector("#arcadeAgainButton"),
    revealDialog: document.querySelector("#revealDialog"),
    revealCard: document.querySelector("#revealCard"),
    revealStatus: document.querySelector("#revealStatus"),
    revealCharacter: document.querySelector("#revealCharacter"),
    revealConfetti: document.querySelector("#revealConfetti"),
    revealDetails: document.querySelector("#revealDetails"),
    revealRarity: document.querySelector("#revealRarity"),
    revealEnglish: document.querySelector("#revealEnglish"),
    revealName: document.querySelector("#revealName"),
    revealRole: document.querySelector("#revealRole"),
    revealQuote: document.querySelector("#revealQuote"),
    unlockTicket: document.querySelector("#unlockTicket"),
    revealContinue: document.querySelector("#revealContinue"),
    revealClose: document.querySelector("#revealClose"),
    oddsDialog: document.querySelector("#oddsDialog"),
    openOdds: document.querySelector("#openOdds"),
    closeOdds: document.querySelector("#closeOdds"),
    resetGame: document.querySelector("#resetGame"),
    toast: document.querySelector("#toast"),
  };

  let startupMessage = "";
  let toastTimer = null;
  let revealTimers = [];
  let packingRound = null;
  let packingEndsAt = 0;
  let packingInterval = null;
  let selectedEarningMode = "packing";
  let quizRound = null;
  let arcadeController = null;
  let arcadeRun = null;
  let arcadeSessionToken = 0;
  let audioContext = null;
  let arcadeMusicPlayer = null;

  function isValidState(candidate) {
    return candidate
      && candidate.version === 3
      && Number.isFinite(candidate.coins)
      && candidate.collection
      && Array.isArray(candidate.currentCase?.boxes)
      && candidate.currentCase.boxes.length === logic.CASE_SIZE;
  }

  function loadState() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return logic.createInitialState();
    try {
      const parsed = JSON.parse(saved);
      if (!isValidState(parsed)) throw new Error("存档结构不是版本 3");
      return parsed;
    } catch (error) {
      console.error("无法读取本地存档：", error);
      window.localStorage.removeItem(STORAGE_KEY);
      startupMessage = "旧存档无法用于新玩法，已为你送来一箱全新的盲盒。";
      return logic.createInitialState();
    }
  }

  let state = loadState();

  function saveState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  function loadCharacterSheet(character) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth !== 2048 || image.naturalHeight !== 512) {
          reject(new Error(`角色 ${character.id} 的差分动画尺寸为 ${image.naturalWidth}×${image.naturalHeight}，应为 2048×512`));
          return;
        }
        resolve();
      };
      image.onerror = () => reject(new Error(`角色 ${character.id} 的差分动画加载失败：${character.animation.sheet}`));
      image.src = character.animation.sheet;
    });
  }

  function preloadCharacterSheets() {
    return Promise.all(logic.CHARACTERS.map(loadCharacterSheet));
  }

  function formatCaseNumber(number) {
    return String(number).padStart(2, "0");
  }

  function rarityColor(character) {
    return {
      common: "#777586",
      rare: "#df5e99",
      epic: "#2eb39c",
      hidden: "#dca02b",
    }[character.rarity];
  }

  function characterMarkup(character, copyCount = 1) {
    if (!character.animation?.sheet) throw new Error(`角色 ${character.id} 缺少差分动画路径`);

    const classes = [
      "toy",
      "pixel-character",
      `toy--${character.id}`,
      `rarity-${character.rarity}`,
      copyCount >= 2 ? "has-accessory" : "",
      copyCount >= 3 ? "has-celebration" : "",
    ].filter(Boolean).join(" ");

    return `
      <div
        class="${classes}"
        data-animation-name="${character.animation.motion}"
        style="--toy-primary:${character.colors[0]};--toy-soft:${character.colors[1]};--toy-dark:${character.colors[2]};--character-sheet:url('${character.animation.sheet}');--frame-duration:${character.animation.durationMs}ms"
      >
        <span class="toy__aura" aria-hidden="true"></span>
        <span
          class="toy__sprite"
          aria-hidden="true"
          data-character-sprite="${character.id}"
        ></span>
        <span class="toy__accessory" aria-hidden="true">✦</span>
        <span class="toy__celebration" aria-hidden="true"><i>♥</i><i>✦</i><i>♥</i></span>
      </div>
    `;
  }

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("当前浏览器不支持 Web Audio 声音");
    audioContext ||= new AudioContextClass();
    return audioContext;
  }

  function getArcadeMusicPlayer() {
    if (!window.CloudArcadeMusic?.createPlayer) throw new Error("街机配乐脚本未加载");
    arcadeMusicPlayer ||= window.CloudArcadeMusic.createPlayer({ getContext: getAudioContext });
    return arcadeMusicPlayer;
  }

  function startArcadeMusic(mode) {
    if (!state.soundOn) {
      elements.arcadeLive.dataset.musicActive = "false";
      return;
    }
    getArcadeMusicPlayer().start(mode);
    elements.arcadeLive.dataset.musicActive = "true";
  }

  function stopArcadeMusic() {
    if (arcadeMusicPlayer) arcadeMusicPlayer.stop();
    elements.arcadeLive.dataset.musicActive = "false";
  }

  function playNotes(notes, noteLength = 0.1) {
    if (!state.soundOn) return;
    try {
      const context = getAudioContext();
      if (context.state === "suspended") context.resume().catch(() => {});
      const start = context.currentTime;
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = start + index * noteLength * 0.72;
        oscillator.type = index % 2 ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.065, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteLength);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + noteLength + 0.03);
      });
    } catch (error) {
      console.warn("声音无法播放：", error);
    }
  }

  const revealSounds = Object.fromEntries(Object.entries(logic.RARITY_META).map(([rarity, meta]) => {
    const audio = new Audio(meta.sound);
    audio.preload = "auto";
    audio.volume = 0.72;
    return [rarity, audio];
  }));

  function playRevealSound(rarity) {
    if (!state.soundOn) return;
    const audio = revealSounds[rarity];
    if (!audio) throw new Error(`稀有度 ${rarity} 缺少揭晓音效`);
    audio.currentTime = 0;
    audio.play().catch((error) => console.warn(`揭晓音效 ${rarity} 无法播放：`, error));
  }

  function renderWallet() {
    elements.coinCount.textContent = String(state.coins);
    elements.soundToggle.classList.toggle("is-muted", !state.soundOn);
    elements.soundToggle.setAttribute("aria-label", state.soundOn ? "关闭声音" : "打开声音");
  }

  function boxMarkup(box) {
    const selected = state.currentCase.selectedIndex === box.index;
    return `
      <button
        class="case-box ${selected ? "is-selected" : ""} ${box.opened ? "is-opened" : ""}"
        type="button"
        data-box-index="${box.index}"
        aria-label="第 ${box.index + 1} 盒，${box.opened ? "已经拆开" : selected ? "当前选择" : "可以选择"}"
        aria-pressed="${selected}"
        style="--box-index:${box.index}"
        ${box.opened ? "disabled" : ""}
      >
        <span class="case-box__object" aria-hidden="true">
          <span class="case-box__lid"></span>
          <span class="case-box__front"><b>?</b><small>CLOUD · ${formatCaseNumber(box.index + 1)}</small></span>
          <span class="case-box__number">${formatCaseNumber(box.index + 1)}</span>
        </span>
      </button>
    `;
  }

  function renderCase() {
    const opened = logic.getOpenedCount(state.currentCase);
    elements.caseNumber.textContent = formatCaseNumber(state.currentCase.number);
    elements.remainingCount.textContent = String(logic.CASE_SIZE - opened);
    elements.openedCount.textContent = String(opened);
    elements.caseProgress.style.width = `${(opened / logic.CASE_SIZE) * 100}%`;
    elements.boxGrid.innerHTML = state.currentCase.boxes.map(boxMarkup).join("");
    elements.nextCaseButton.hidden = opened !== logic.CASE_SIZE;
    elements.refreshShelfButton.disabled = opened === logic.CASE_SIZE;
    renderInspector();
  }

  function setInspectorStep(activeStep) {
    const order = ["pick", "shake", "open"];
    elements.boxInspector.querySelectorAll("[data-step]").forEach((stepElement) => {
      const step = stepElement.dataset.step;
      stepElement.classList.toggle("is-active", step === activeStep);
      stepElement.classList.toggle("is-done", order.indexOf(step) < order.indexOf(activeStep));
    });
  }

  function renderInspector() {
    const selectedIndex = state.currentCase.selectedIndex;
    const clueLevel = state.currentCase.clueLevel;
    const hasSelection = selectedIndex !== null;
    elements.selectedBoxStage.classList.toggle("has-selection", hasSelection);
    elements.shakeButton.disabled = !hasSelection || clueLevel >= 2;
    elements.openBoxButton.disabled = !hasSelection || clueLevel < 1;

    if (!hasSelection) {
      setInspectorStep("pick");
      elements.selectedBoxNumber.textContent = "PICK ONE";
      elements.inspectorKicker.textContent = "STEP 01 · PICK";
      elements.inspectorTitle.textContent = "哪一盒在叫你？";
      elements.inspectorText.textContent = "从陈列箱中挑一个位置。选错也没关系，直觉本来就没有标准答案。";
      elements.clueStack.innerHTML = `
        <div class="clue-ticket is-locked"><span>01 · 声音</span><p>摇一摇后记录</p></div>
        <div class="clue-ticket is-locked"><span>02 · 重心</span><p>再摇一次后记录</p></div>
      `;
      elements.shakeButton.querySelector("b").textContent = "摇一摇";
      return;
    }

    const box = state.currentCase.boxes[selectedIndex];
    const character = logic.getCharacter(box.characterId);
    elements.selectedBoxNumber.textContent = `BOX ${formatCaseNumber(selectedIndex + 1)}`;
    elements.inspectorTitle.textContent = `你挑中了第 ${formatCaseNumber(selectedIndex + 1)} 盒`;

    if (clueLevel === 0) {
      setInspectorStep("shake");
      elements.inspectorKicker.textContent = "STEP 02 · SHAKE";
      elements.inspectorText.textContent = "先别急着拆。拿起来轻轻摇一次，听听它愿意透露什么。";
    } else {
      setInspectorStep("open");
      elements.inspectorKicker.textContent = clueLevel === 1 ? "ONE CLUE FOUND" : "TWO CLUES FOUND";
      elements.inspectorText.textContent = clueLevel === 1
        ? "已经有第一条线索。你可以相信直觉直接拆，也可以再摇一次。"
        : "线索就到这里。现在，决定要不要相信它。";
    }

    elements.clueStack.innerHTML = character.clues.map((clue, index) => {
      const revealed = index < clueLevel;
      return `
        <div class="clue-ticket ${revealed ? "is-revealed" : "is-locked"}">
          <span>0${index + 1} · ${index === 0 ? "声音" : "重心"}</span>
          <p>${revealed ? clue : index === 0 ? "摇一摇后记录" : "再摇一次后记录"}</p>
        </div>
      `;
    }).join("");
    elements.shakeButton.querySelector("b").textContent = clueLevel === 0 ? "摇一摇" : clueLevel === 1 ? "再摇一次" : "线索已记下";
  }

  function renderShelf() {
    const stats = logic.getCollectionStats(state);
    const owned = logic.CHARACTERS.filter((character) => state.collection[character.id] > 0);
    elements.collectionUnlocked.textContent = String(stats.unlocked);
    elements.collectionTotal.textContent = String(stats.total);
    elements.shelfBonusValue.textContent = `+${logic.getPackingStartBonus(state)}`;

    if (owned.length === 0) {
      elements.shelfCharacters.innerHTML = `
        <div class="window-empty"><span>还没开灯</span><p>拆开第一盒，就会有店员来这里等你。</p></div>
      `;
    } else {
      elements.shelfCharacters.innerHTML = owned.map((character) => {
        const count = state.collection[character.id];
        return `
          <button
            class="shelf-character rarity-${character.rarity}"
            type="button"
            data-character-id="${character.id}"
            aria-label="和${character.name}说话，已获得 ${count} 次"
          >
            ${characterMarkup(character, count)}
            <span class="shelf-character__name">${character.name}</span>
            ${count > 1 ? `<span class="shelf-character__level">×${count}</span>` : ""}
          </button>
        `;
      }).join("");
    }

    elements.seriesStrip.innerHTML = logic.CHARACTERS.map((character, index) => {
      const ownedCount = state.collection[character.id] || 0;
      const isSecretLocked = character.rarity === logic.RARITY.HIDDEN && !ownedCount;
      return `
        <div
          class="series-token rarity-${character.rarity} ${ownedCount ? "is-owned" : ""}"
          data-symbol="${logic.RARITY_META[character.rarity].symbol}"
          style="--token-color:${rarityColor(character)}"
          title="${ownedCount ? `${character.name} · ${logic.RARITY_META[character.rarity].label}` : "尚未遇见"}"
        >
          <small>${ownedCount ? character.name : isSecretLocked ? "SECRET" : formatCaseNumber(index + 1)}</small>
        </div>
      `;
    }).join("");
  }

  function renderAll() {
    renderWallet();
    renderCase();
    renderShelf();
  }

  function selectBox(index) {
    try {
      state = logic.selectBox(state, index);
      saveState();
      renderCase();
      playNotes([330, 440], 0.08);
    } catch (error) {
      showToast(error.message);
    }
  }

  function shakeBox() {
    try {
      const result = logic.shakeSelectedBox(state);
      state = result.nextState;
      saveState();
      elements.selectedBoxStage.classList.remove("is-shaking");
      void elements.selectedBoxStage.offsetWidth;
      elements.selectedBoxStage.classList.add("is-shaking");
      window.setTimeout(() => elements.selectedBoxStage.classList.remove("is-shaking"), 600);
      window.setTimeout(renderInspector, reducedMotion ? 0 : 360);
      playNotes(result.clueLevel === 1 ? [180, 210, 175] : [220, 178, 246], 0.1);
    } catch (error) {
      showToast(error.message);
    }
  }

  function createConfetti(character) {
    const count = logic.RARITY_META[character.rarity].rank >= 2 ? 56 : 30;
    const colors = [character.colors[0], character.colors[1], "#f2ba4b", "#fff7e8", "#70d0b5"];
    elements.revealConfetti.innerHTML = Array.from({ length: count }, (_, index) => `
      <i style="--x:${Math.round(Math.random() * 100)}%;--c:${colors[index % colors.length]};--d:${1.6 + Math.random() * 1.5}s;--delay:${Math.random() * .55}s;--r:${Math.round(Math.random() * 180)}deg;--drift:${Math.round((Math.random() - .5) * 150)}px"></i>
    `).join("");
  }

  function clearRevealTimers() {
    revealTimers.forEach((timer) => window.clearTimeout(timer));
    revealTimers = [];
  }

  function scheduleReveal(callback, delay) {
    const timer = window.setTimeout(callback, reducedMotion ? 0 : delay);
    revealTimers.push(timer);
  }

  function showReveal(result) {
    clearRevealTimers();
    const { character, copyCount, unlock } = result;
    const meta = logic.RARITY_META[character.rarity];
    elements.revealCard.className = `reveal-card rarity-${character.rarity}`;
    elements.revealCard.dataset.sound = meta.sound;
    elements.revealCard.style.setProperty("--reveal-color", rarityColor(character));
    elements.revealStatus.textContent = "正在撕开封条…";
    elements.revealDetails.hidden = true;
    elements.revealClose.hidden = true;
    elements.revealCharacter.innerHTML = characterMarkup(character, copyCount);
    elements.revealRarity.textContent = `${meta.symbol} ${meta.english} · ${meta.label}`;
    elements.revealEnglish.textContent = character.english.toUpperCase();
    elements.revealName.textContent = character.name;
    elements.revealRole.textContent = character.role;
    elements.revealQuote.textContent = `“${character.quote}”`;
    elements.unlockTicket.innerHTML = `${unlock.label}<small>${copyCount === 1 ? character.ability : copyCount === 2 ? "橱窗里的角色现在会佩戴一枚金色店章。" : copyCount === 3 ? "角色现在会带着像素爱心开心地跳起来。" : "更高星级会记录在橱窗名牌上。"}</small>`;
    elements.revealConfetti.innerHTML = "";
    elements.revealDialog.showModal();

    scheduleReveal(() => {
      elements.revealCard.classList.add("stage-tearing");
      playNotes([156, 139, 185], 0.13);
    }, 80);
    scheduleReveal(() => {
      elements.revealCard.classList.remove("stage-tearing");
      elements.revealCard.classList.add("stage-silhouette");
      elements.revealStatus.textContent = "先看到了一道小小的轮廓…";
      playNotes([220, 277], 0.15);
    }, 720);
    scheduleReveal(() => {
      elements.revealCard.classList.add("stage-revealed");
      elements.revealStatus.textContent = meta.reveal;
      createConfetti(character);
      playRevealSound(character.rarity);
    }, 1450);
    scheduleReveal(() => {
      elements.revealStatus.hidden = true;
      elements.revealDetails.hidden = false;
      elements.revealClose.hidden = false;
    }, 2250);
  }

  function openSelectedBox() {
    try {
      const result = logic.openSelectedBox(state);
      state = result.nextState;
      saveState();
      renderAll();
      showReveal(result);
    } catch (error) {
      showToast(error.message);
      if (/云朵币不足/.test(error.message)) {
        window.setTimeout(() => document.querySelector("#packing").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }), 450);
      }
    }
  }

  function closeReveal(destination = "case") {
    clearRevealTimers();
    elements.revealDialog.close();
    elements.revealStatus.hidden = false;
    if (destination === "cabinet") {
      document.querySelector("#cabinet").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    } else {
      document.querySelector("#case").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    }
  }

  function speakWithCharacter(characterId, button) {
    const character = logic.getCharacter(characterId);
    const count = state.collection[characterId];
    elements.shelfCharacters.querySelectorAll(".shelf-character").forEach((item) => item.classList.remove("is-speaking"));
    void button.offsetWidth;
    button.classList.add("is-speaking");
    const upgrade = count >= 3 ? " · 今天的表情看起来特别开心。" : count >= 2 ? " · 他正在佩戴你解锁的金色店章。" : "";
    elements.speechBubble.innerHTML = `<small>${character.role} · ${logic.RARITY_META[character.rarity].label}</small><p>“${character.quote}”${upgrade}</p>`;
    playNotes([300 + logic.RARITY_META[character.rarity].rank * 55, 390 + logic.RARITY_META[character.rarity].rank * 60], 0.1);
  }

  function dessertMarkup(dessert) {
    return `
      <button class="dessert-tray" type="button" data-dessert-id="${dessert.id}" aria-label="打包${dessert.name}">
        <span class="dessert-icon dessert-icon--${dessert.className}" aria-hidden="true"></span>
        <span>${dessert.name}</span>
      </button>
    `;
  }

  function updatePackingReadout() {
    const target = logic.DESSERTS.find((dessert) => dessert.id === packingRound.targetId);
    elements.targetDessert.textContent = target.name;
    elements.packingScore.textContent = String(packingRound.score);
    elements.comboBadge.textContent = `COMBO ×${packingRound.combo}`;
  }

  function updatePackingTimer() {
    if (!packingRound?.active) return;
    const remaining = Math.max(0, packingEndsAt - Date.now());
    elements.packingTimer.textContent = (remaining / 1000).toFixed(1);
    elements.packingTimeBar.style.width = `${(remaining / packingRound.durationMs) * 100}%`;
    elements.packingTimeBar.classList.toggle("is-low", remaining < 5_000);
    if (remaining <= 0) finishPacking();
  }

  function startPacking() {
    if (packingInterval) window.clearInterval(packingInterval);
    selectedEarningMode = "packing";
    updateEarningModeButtons();
    hideEarningViews();
    packingRound = logic.createPackingRound(state);
    packingEndsAt = Date.now() + packingRound.durationMs;
    elements.packingIdle.hidden = true;
    elements.packingResult.hidden = true;
    elements.packingLive.hidden = false;
    elements.dessertTrays.innerHTML = logic.DESSERTS.map(dessertMarkup).join("");
    elements.packingFeedback.textContent = packingRound.shelfBonus
      ? `橱窗店员为你带来 ☁ ${packingRound.shelfBonus} 开局人气！`
      : "看准再打包！";
    elements.packingFeedback.className = "packing-feedback";
    updatePackingReadout();
    updatePackingTimer();
    packingInterval = window.setInterval(updatePackingTimer, 100);
    playNotes([262, 330, 392], 0.1);
  }

  function answerPacking(dessertId) {
    if (!packingRound?.active) return;
    if (Date.now() >= packingEndsAt) {
      finishPacking();
      return;
    }
    try {
      const result = logic.answerPackingOrder(packingRound, dessertId);
      packingRound = result.nextRound;
      packingEndsAt -= result.timePenaltyMs;
      elements.packingFeedback.className = `packing-feedback ${result.correct ? "is-correct" : "is-wrong"}`;
      elements.packingFeedback.textContent = result.correct
        ? result.capped
          ? `打包正确！本班已达到 ☁ ${logic.PACKING_MAX_PAYOUT} 收益上限，自动收工。`
          : `打包正确！小费 +${result.earned}${packingRound.combo >= 3 ? "，连击正在升温" : ""}`
        : "拿错托盘，连击清空，时间 -2.5 秒";
      elements.comboBadge.classList.toggle("is-hot", result.correct && packingRound.combo >= 3);
      void elements.packingFeedback.offsetWidth;
      updatePackingReadout();
      updatePackingTimer();
      playNotes(result.correct ? [440, 554] : [170, 135], 0.08);
      if (result.capped) {
        elements.dessertTrays.querySelectorAll("button").forEach((button) => { button.disabled = true; });
        window.setTimeout(finishPacking, 420);
      }
    } catch (error) {
      showToast(error.message);
    }
  }

  function finishPacking() {
    if (!packingRound?.active || packingRound.settled) return;
    window.clearInterval(packingInterval);
    packingInterval = null;
    const finishedSnapshot = packingRound;
    const result = logic.finishPackingRound(state, packingRound);
    state = result.nextState;
    packingRound = result.nextRound;
    saveState();
    renderWallet();
    renderShelf();
    elements.packingLive.hidden = true;
    elements.packingIdle.hidden = true;
    elements.packingResult.hidden = false;
    elements.packingEarned.textContent = String(result.earned);
    elements.packingCorrect.textContent = String(finishedSnapshot.correctCount);
    elements.packingBestCombo.textContent = String(finishedSnapshot.bestCombo);
    playNotes([294, 370, 440, 587], 0.13);
  }

  function getPerfectQuizReward(config) {
    let total = config.perfectBonus;
    for (let streak = 1; streak <= logic.QUIZ_LENGTH; streak += 1) {
      total += config.baseReward + Math.min(config.streakCap, (streak - 1) * config.streakStep);
    }
    return total;
  }

  function hideEarningViews() {
    [
      elements.packingIdle,
      elements.packingLive,
      elements.packingResult,
      elements.quizIntro,
      elements.quizLive,
      elements.quizResult,
      elements.arcadeIntro,
      elements.arcadeLive,
      elements.arcadeResult,
    ].forEach((view) => { view.hidden = true; });
  }

  function updateEarningModeButtons() {
    elements.earningModes.querySelectorAll("[data-earning-mode]").forEach((button) => {
      const active = button.dataset.earningMode === selectedEarningMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.packingGame.dataset.mode = selectedEarningMode;
  }

  function showQuizIntro(mode) {
    const config = logic.QUIZ_CONFIG[mode];
    if (!config) throw new Error("答题路线不存在");
    elements.quizModeIcon.textContent = config.icon;
    elements.quizModeKicker.textContent = config.english;
    elements.quizModeTitle.textContent = config.label;
    elements.quizModeDescription.textContent = config.description;
    elements.quizRewardHint.textContent = `☁ ${getPerfectQuizReward(config)}`;
    elements.quizSourceLink.hidden = !config.sourceUrl;
    if (config.sourceUrl) {
      elements.quizSourceLink.href = config.sourceUrl;
      elements.quizSourceLink.textContent = `${config.sourceLabel} ↗`;
    }
    elements.quizIntro.hidden = false;
  }

  function isArcadeMode(mode) {
    return Boolean(logic.ARCADE_CONFIG[mode]);
  }

  function getArcadeModule(mode) {
    if (mode === "platformer") return window.CloudPlatformerGame;
    if (mode === "tetris") return window.CloudTetrisGame;
    if (mode === "shooter") return window.CloudShooterGame;
    throw new Error("街机关卡不存在");
  }

  function showArcadeIntro(mode) {
    const config = logic.ARCADE_CONFIG[mode];
    if (!config) throw new Error("街机关卡不存在");
    elements.arcadeModeIcon.textContent = config.icon;
    elements.arcadeModeKicker.textContent = config.english;
    elements.arcadeModeTitle.textContent = config.label;
    elements.arcadeModeDescription.textContent = config.description;
    elements.arcadeRewardHint.textContent = "游戏得分与入账均不封顶";
    elements.arcadeIntroInstructions.textContent = config.instructions;
    elements.arcadeIntro.hidden = false;
  }

  function destroyArcade(clearRun = false) {
    arcadeSessionToken += 1;
    stopArcadeMusic();
    if (arcadeController) arcadeController.destroy();
    arcadeController = null;
    if (clearRun) arcadeRun = null;
  }

  function updateArcadeHud(score, details, token) {
    if (token !== arcadeSessionToken || !arcadeRun?.active) return;
    const safeScore = Math.max(0, Math.floor(Number(score) || 0));
    const nextDetails = details && typeof details === "object" ? details : {};
    arcadeRun = {
      ...arcadeRun,
      score: safeScore,
      lines: Number.isFinite(nextDetails.lines) ? Math.max(0, Math.floor(nextDetails.lines)) : arcadeRun.lines,
    };
    elements.arcadeScore.textContent = String(safeScore).padStart(6, "0");
    elements.arcadeCoinPreview.textContent = String(logic.calculateArcadeReward(
      arcadeRun.mode,
      safeScore,
      arcadeRun,
    ));
    const statusBits = [];
    if (Number.isFinite(nextDetails.lines)) statusBits.push(`消除 ${nextDetails.lines} 行`);
    if (Number.isFinite(nextDetails.level)) statusBits.push(`等级 ${nextDetails.level}`);
    if (Number.isFinite(nextDetails.wave)) statusBits.push(`波次 ${nextDetails.wave}`);
    const lives = Number.isFinite(nextDetails.lives) ? nextDetails.lives : nextDetails.player?.lives;
    if (Number.isFinite(lives)) statusBits.push(`生命 ${lives}`);
    elements.arcadeStatus.textContent = statusBits.length ? `无限时 · ${statusBits.join(" · ")}` : "无限时夜班 · 分数越高，入账越多";
  }

  function finishArcade(payload, token) {
    if (token !== arcadeSessionToken || !arcadeRun?.active) return;
    const details = payload && typeof payload === "object" ? payload : {};
    const score = Math.max(0, Math.floor(Number(details.score) || arcadeRun.score || 0));
    arcadeRun = {
      ...arcadeRun,
      ...details,
      score,
      lines: Number.isFinite(details.lines) ? Math.max(0, Math.floor(details.lines)) : arcadeRun.lines,
      reason: details.reason || details.status || "complete",
      active: false,
      completed: true,
    };
    try {
      const finishedRun = arcadeRun;
      const result = logic.finishArcadeRun(state, arcadeRun);
      state = result.nextState;
      arcadeRun = result.nextRun;
      destroyArcade(false);
      saveState();
      renderWallet();
      renderShelf();
      hideEarningViews();
      elements.arcadeResult.hidden = false;
      const cleared = ["won", "clear", "cleared"].includes(finishedRun.reason);
      elements.arcadeResultStamp.textContent = cleared ? "STAGE COMPLETE" : "SHIFT COMPLETE";
      elements.arcadeResultReason.textContent = cleared ? "漂亮完成，夜班奖金已经记账" : "本轮结束，沿途分数已经换成云朵币";
      elements.arcadeFinalScore.textContent = String(score).padStart(6, "0");
      elements.arcadeEarned.textContent = String(result.earned);
      elements.arcadeResultMode.textContent = logic.ARCADE_CONFIG[finishedRun.mode].label;
      elements.arcadeBestScore.textContent = String(state.arcadeBestScores?.[finishedRun.mode] || score);
      elements.arcadeAgainButton.focus({ preventScroll: true });
      playNotes(cleared ? [294, 440, 587, 880] : [262, 330, 392, 523], 0.12);
    } catch (error) {
      destroyArcade(true);
      showToast(error.message);
    }
  }

  function startArcade() {
    const mode = selectedEarningMode;
    const config = logic.ARCADE_CONFIG[mode];
    if (!config) return;
    try {
      destroyArcade(true);
      const token = arcadeSessionToken;
      const module = getArcadeModule(mode);
      if (!module?.mount) throw new Error(`${config.label}关卡脚本未加载`);
      arcadeRun = {
        mode,
        active: true,
        completed: false,
        settled: false,
        score: 0,
        lines: 0,
        reason: null,
      };
      hideEarningViews();
      elements.arcadeLive.hidden = false;
      elements.arcadeLive.dataset.arcadeMode = mode;
      elements.arcadeModeBadge.textContent = config.label;
      elements.arcadeScore.textContent = "000000";
      elements.arcadeCoinPreview.textContent = "0";
      elements.arcadeStatus.textContent = "无限时夜班 · 分数越高，入账越多";
      elements.arcadeLiveInstructions.textContent = config.instructions;
      elements.arcadeTouchControls.hidden = mode !== "tetris";

      if (mode === "platformer") {
        arcadeController = module.mount(elements.arcadeCanvas, {
          onScore: (score) => updateArcadeHud(score, {}, token),
          onFinish: (result) => finishArcade({ ...result, reason: result.status }, token),
        });
      } else if (mode === "tetris") {
        arcadeController = module.mount(elements.arcadeCanvas, {
          onScore: (snapshot) => updateArcadeHud(snapshot.score, snapshot, token),
          onFinish: (result) => finishArcade(result, token),
        });
      } else {
        elements.arcadeCanvas.width = 720;
        elements.arcadeCanvas.height = 420;
        arcadeController = module.mount(elements.arcadeCanvas, {
          onScore: (score, _reward, session) => updateArcadeHud(score, session, token),
          onFinish: (result) => finishArcade(result, token),
        });
      }
      arcadeController.start();
      elements.arcadeCanvas.focus({ preventScroll: true });
      startArcadeMusic(mode);
    } catch (error) {
      destroyArcade(true);
      hideEarningViews();
      showArcadeIntro(mode);
      showToast(error.message);
    }
  }

  function abandonArcade() {
    if (!arcadeRun?.active) return;
    destroyArcade(true);
    hideEarningViews();
    showArcadeIntro(selectedEarningMode);
    showToast("本局已放弃，没有结算云朵币。" );
  }

  function selectEarningMode(mode) {
    if (mode !== "packing" && !logic.QUIZ_CONFIG[mode] && !isArcadeMode(mode)) throw new Error("赚钱路线不存在");
    if (mode === selectedEarningMode && (packingRound?.active || quizRound?.active || arcadeRun?.active)) return;

    if (packingRound?.active && !packingRound.settled) finishPacking();
    if (quizRound?.active && !quizRound.settled) {
      quizRound = null;
      showToast("上一张未完成的题签已经放回柜台，没有结算奖励。" );
    }
    if (arcadeRun?.active && !arcadeRun.settled) {
      destroyArcade(true);
      showToast("上一局街机已经停止，没有结算奖励。" );
    }

    selectedEarningMode = mode;
    updateEarningModeButtons();
    hideEarningViews();
    if (mode === "packing") elements.packingIdle.hidden = false;
    else if (logic.QUIZ_CONFIG[mode]) showQuizIntro(mode);
    else showArcadeIntro(mode);
  }

  function quizOptionMarkup(option, index) {
    const letter = String.fromCharCode(65 + index);
    return `<button class="quiz-option" type="button" data-quiz-option="${index}"><span>${letter}</span><b>${option}</b></button>`;
  }

  function renderQuizQuestion() {
    if (!quizRound?.active) return;
    const question = quizRound.questions[quizRound.currentIndex];
    const config = logic.QUIZ_CONFIG[quizRound.mode];
    elements.quizModeBadge.textContent = config.label;
    elements.quizProgress.textContent = `${quizRound.currentIndex + 1} / ${quizRound.questions.length}`;
    elements.quizScore.textContent = String(quizRound.score);
    elements.quizQuestionNumber.textContent = String(quizRound.currentIndex + 1).padStart(2, "0");
    elements.quizQuestion.textContent = question.prompt;
    elements.quizOptions.innerHTML = question.options.map(quizOptionMarkup).join("");

    if (quizRound.answered) {
      elements.quizOptions.querySelectorAll("[data-quiz-option]").forEach((button) => {
        const index = Number(button.dataset.quizOption);
        button.disabled = true;
        button.classList.toggle("is-correct", index === question.answer);
        button.classList.toggle("is-wrong", index === quizRound.selectedIndex && index !== question.answer);
      });
    }

    elements.quizFeedback.hidden = !quizRound.answered;
    elements.quizNextButton.hidden = !quizRound.answered;
    if (quizRound.answered) {
      const correct = quizRound.selectedIndex === question.answer;
      elements.quizFeedback.className = `quiz-feedback ${correct ? "is-correct" : "is-wrong"}`;
      elements.quizFeedbackTitle.textContent = correct ? "回答正确，云朵币记账中" : "这题没答对，看看解析";
      elements.quizExplanation.textContent = question.explanation;
      elements.quizQuestionSource.hidden = !question.sourceUrl;
      if (question.sourceUrl) elements.quizQuestionSource.href = question.sourceUrl;
      elements.quizNextButton.innerHTML = quizRound.currentIndex === quizRound.questions.length - 1
        ? "结算这一轮 <span>→</span>"
        : "下一题 <span>→</span>";
    } else {
      elements.quizQuestionSource.hidden = true;
    }
  }

  function renderQuizAnswerState(result) {
    const question = quizRound.questions[quizRound.currentIndex];
    elements.quizScore.textContent = String(quizRound.score);
    elements.quizOptions.querySelectorAll("[data-quiz-option]").forEach((button) => {
      const index = Number(button.dataset.quizOption);
      button.disabled = true;
      button.classList.toggle("is-correct", index === question.answer);
      button.classList.toggle("is-wrong", index === quizRound.selectedIndex && index !== question.answer);
    });
    elements.quizFeedback.hidden = false;
    elements.quizFeedback.className = `quiz-feedback ${result.correct ? "is-correct" : "is-wrong"}`;
    elements.quizFeedbackTitle.textContent = result.correct
      ? `回答正确 · +${result.earned} 云朵币`
      : "这题没答对 · 连对清零";
    elements.quizExplanation.textContent = question.explanation;
    elements.quizQuestionSource.hidden = !question.sourceUrl;
    if (question.sourceUrl) elements.quizQuestionSource.href = question.sourceUrl;
    elements.quizNextButton.hidden = false;
    elements.quizNextButton.innerHTML = quizRound.currentIndex === quizRound.questions.length - 1
      ? "结算这一轮 <span>→</span>"
      : "下一题 <span>→</span>";
  }

  function restoreScrollPosition(x, y) {
    const rootStyle = document.documentElement.style;
    const previousBehavior = rootStyle.scrollBehavior;
    rootStyle.scrollBehavior = "auto";
    window.scrollTo(x, y);
    window.requestAnimationFrame(() => {
      window.scrollTo(x, y);
      rootStyle.scrollBehavior = previousBehavior;
    });
  }

  function startQuiz() {
    try {
      quizRound = logic.createQuizRound(selectedEarningMode);
      hideEarningViews();
      elements.quizLive.hidden = false;
      renderQuizQuestion();
      playNotes(selectedEarningMode === "rl" ? [220, 330, 495] : [330, 440, 554], 0.1);
    } catch (error) {
      showToast(error.message);
    }
  }

  function answerQuiz(optionIndex) {
    if (!quizRound?.active || quizRound.answered) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    try {
      const result = logic.answerQuizQuestion(quizRound, optionIndex);
      quizRound = result.nextRound;
      renderQuizAnswerState(result);
      restoreScrollPosition(scrollX, scrollY);
      playNotes(result.correct ? [392, 494, 659] : [185, 147], 0.09);
    } catch (error) {
      showToast(error.message);
    }
  }

  function advanceOrFinishQuiz() {
    if (!quizRound?.active || !quizRound.answered) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    try {
      quizRound = logic.advanceQuizQuestion(quizRound);
      if (!quizRound.completed) {
        renderQuizQuestion();
        restoreScrollPosition(scrollX, scrollY);
        return;
      }

      const finishedSnapshot = quizRound;
      const result = logic.finishQuizRound(state, quizRound);
      state = result.nextState;
      quizRound = result.nextRound;
      saveState();
      renderWallet();
      hideEarningViews();
      elements.quizResult.hidden = false;
      elements.quizResultStamp.textContent = result.perfect ? "PERFECT ROUND" : "QUIZ COMPLETE";
      elements.quizResultMode.textContent = logic.QUIZ_CONFIG[finishedSnapshot.mode].label;
      elements.quizEarned.textContent = String(result.earned);
      elements.quizCorrect.textContent = String(finishedSnapshot.correctCount);
      elements.quizBestStreak.textContent = String(finishedSnapshot.bestStreak);
      elements.quizPerfectBonus.hidden = !result.perfect;
      if (result.perfect) elements.quizPerfectBonus.textContent = `满分印章 · 额外 ☁ ${result.perfectBonus} 已入账`;
      restoreScrollPosition(scrollX, scrollY);
      playNotes(result.perfect ? [294, 440, 587, 880] : [294, 370, 494, 587], 0.13);
    } catch (error) {
      showToast(error.message);
    }
  }

  elements.boxGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-box-index]");
    if (!button) return;
    selectBox(Number(button.dataset.boxIndex));
  });

  elements.shakeButton.addEventListener("click", shakeBox);
  elements.openBoxButton.addEventListener("click", openSelectedBox);
  elements.nextCaseButton.addEventListener("click", () => {
    try {
      state = logic.createNextCase(state);
      saveState();
      renderCase();
      showToast(`第 ${formatCaseNumber(state.currentCase.number)} 箱已经送到。`);
      playNotes([220, 330, 440], 0.12);
    } catch (error) {
      showToast(error.message);
    }
  });

  elements.refreshShelfButton.addEventListener("click", () => {
    try {
      const preserved = logic.getOpenedCount(state.currentCase);
      state = logic.refreshShelf(state);
      saveState();
      renderCase();
      elements.boxGrid.classList.add("is-refreshing");
      window.setTimeout(() => elements.boxGrid.classList.remove("is-refreshing"), 900);
      showToast(preserved
        ? `已刷新 ${logic.CASE_SIZE - preserved} 个未拆位置，${preserved} 个空位和全部收藏已保留。`
        : "12 个位置已经换成新的一批，余额和收藏没有变化。"
      );
      playNotes([392, 330, 494, 440], 0.08);
    } catch (error) {
      showToast(error.message);
    }
  });

  elements.shelfCharacters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-character-id]");
    if (button) speakWithCharacter(button.dataset.characterId, button);
  });

  elements.startPackingButton.addEventListener("click", startPacking);
  elements.packingAgainButton.addEventListener("click", startPacking);
  elements.dessertTrays.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dessert-id]");
    if (button) answerPacking(button.dataset.dessertId);
  });
  elements.earningModes.addEventListener("click", (event) => {
    const button = event.target.closest("[data-earning-mode]");
    if (!button) return;
    try {
      selectEarningMode(button.dataset.earningMode);
    } catch (error) {
      showToast(error.message);
    }
  });
  elements.startQuizButton.addEventListener("click", startQuiz);
  elements.quizAgainButton.addEventListener("click", startQuiz);
  elements.quizOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-quiz-option]");
    if (button) answerQuiz(Number(button.dataset.quizOption));
  });
  elements.quizNextButton.addEventListener("click", advanceOrFinishQuiz);
  elements.startArcadeButton.addEventListener("click", startArcade);
  elements.arcadeAgainButton.addEventListener("click", startArcade);
  elements.arcadeAbandonButton.addEventListener("click", abandonArcade);
  elements.arcadeTouchControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-arcade-action]");
    if (!button || selectedEarningMode !== "tetris" || !arcadeRun?.active || !arcadeController) return;
    const action = button.dataset.arcadeAction;
    if (action === "left" || action === "right") arcadeController.move(action);
    else if (action === "rotate-left") arcadeController.rotate(-1);
    else if (action === "rotate") arcadeController.rotate(1);
    else if (action === "drop") arcadeController.drop();
    elements.arcadeCanvas.focus({ preventScroll: true });
  });

  elements.coinWallet.addEventListener("click", () => document.querySelector("#packing").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }));
  elements.soundToggle.addEventListener("click", () => {
    state = { ...state, soundOn: !state.soundOn };
    saveState();
    renderWallet();
    if (state.soundOn) {
      if (arcadeRun?.active) startArcadeMusic(arcadeRun.mode);
      else playNotes([392, 523], 0.09);
    } else {
      stopArcadeMusic();
      Object.values(revealSounds).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  });

  elements.revealContinue.addEventListener("click", () => closeReveal("case"));
  elements.revealClose.addEventListener("click", () => closeReveal("case"));
  elements.revealDialog.addEventListener("cancel", (event) => {
    if (elements.revealDetails.hidden) event.preventDefault();
    else closeReveal("case");
  });

  elements.openOdds.addEventListener("click", () => elements.oddsDialog.showModal());
  elements.closeOdds.addEventListener("click", () => elements.oddsDialog.close());
  elements.oddsDialog.addEventListener("click", (event) => {
    if (event.target === elements.oddsDialog) elements.oddsDialog.close();
  });

  elements.showAllCharacters.addEventListener("click", () => {
    const stats = logic.getCollectionStats(state);
    const missing = stats.total - stats.unlocked;
    showToast(missing ? `全系列 ${stats.total} 位，你还没有遇见其中 ${missing} 位。` : "全系列已经点亮，今晚的橱窗属于你。" );
  });

  function restartWholeGame() {
    const confirmed = window.confirm("刷新整场游戏会清空当前橱窗、整箱进度和云朵币。确定重新开始吗？");
    if (!confirmed) return;
    window.localStorage.removeItem(STORAGE_KEY);
    state = logic.createInitialState();
    packingRound = null;
    quizRound = null;
    destroyArcade(true);
    selectedEarningMode = "packing";
    if (packingInterval) window.clearInterval(packingInterval);
    packingInterval = null;
    updateEarningModeButtons();
    hideEarningViews();
    elements.packingIdle.hidden = false;
    elements.speechBubble.innerHTML = "<small>橱窗留言</small><p>这里还空着。拆开第一盒，就会有人来点亮店里的灯。</p>";
    saveState();
    renderAll();
    showToast("整场游戏已经刷新。新角色池和第一箱都准备好了。" );
  }

  elements.restartGameButton.addEventListener("click", restartWholeGame);
  elements.resetGame.addEventListener("click", restartWholeGame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopArcadeMusic();
    else if (arcadeRun?.active && state.soundOn) startArcadeMusic(arcadeRun.mode);
  });
  window.addEventListener("beforeunload", () => destroyArcade(true));

  async function startGame() {
    try {
      await preloadCharacterSheets();
      renderAll();
      if (startupMessage) window.setTimeout(() => showToast(startupMessage), 300);
    } catch (error) {
      console.error(error);
      elements.toast.textContent = error.message;
      elements.toast.classList.add("is-visible", "is-fatal");
    }
  }

  startGame();
})();
