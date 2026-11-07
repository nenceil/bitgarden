// Game State
let plots = [];
let gold = 25;
let energy = 30;
let maxEnergy = 30;

// Weather State
let current_weather = 'clear';
let weather_last_change = 0;
let last_flash_time = 0;
let last_mutation_heartbeat = 0;
let serverTimeOffset = 0;
const WEATHER_DURATION = 180000; // 3 minutes in ms

// Auth State
let authToken = localStorage.getItem('farm_token');
let authUser = localStorage.getItem('farm_user');

// items[key] = quantity
// item objects: { id: uniqueId, key: itemKey, weight: float, value: int }
let inventory = [];
let quests = [];
let energyBase = 0;        // energi terakhir yang dikabarkan server
let energyBaseAt = null;   // detik server saat energi itu dihitung (untuk tampilan regen)
const MAX_PLOTS = 20;

// Item Definitions
const ITEMS = {
    seeds_wheat: { name: 'Wheat Seed', type: 'seed', cropKey: 'wheat', price: 1, description: 'Basic seed that grows into Wheat in 30 seconds.', image: asset('img/seeds_wheat.png'), emoji: '🌱' },
    seeds_tomato: { name: 'Tomato Seed', type: 'seed', cropKey: 'tomato', price: 5, description: 'Premium seed that grows into juicy Tomatoes in 2 minutes.', image: asset('img/seeds_tomato.png'), emoji: '🍅' },
    tool_watering_can: { name: 'Watering Can', type: 'tool', price: 100, description: 'Used to water plots, speeding up growth by 1 minute.', image: asset('img/tool_watering_can.png'), emoji: '🚿' },
    item_pesticide: { name: 'Bug Spray', type: 'consumable', price: 25, description: 'Immediately clears all pests from a plot.', image: asset('img/item_pesticide.png'), emoji: '🧪' },
    crop_wheat: { name: 'Wheat', type: 'resource', sellPrice: 5, description: 'A common staple crop.', image: asset('img/crop_wheat.png'), emoji: '🌾' },
    crop_tomato: { name: 'Tomato', type: 'resource', sellPrice: 40, description: 'A valuable vegetable crop.', image: asset('img/crop_tomato.png'), emoji: '🍅' },
    crop_wheat_wet: { name: 'Wheat Wet', type: 'resource', sellPrice: 10, isMutation: true, description: 'Extra hydrated wheat. Worth 2x normal wheat.', image: asset('img/crop_wheat.png'), emoji: '🌾' },
    crop_wheat_shocked: { name: 'Wheat Shocked', type: 'resource', sellPrice: 25, isShocked: true, description: 'Electrified wheat! Worth 5x normal wheat.', image: asset('img/crop_wheat.png'), emoji: '⚡' },
    crop_wheat_wet_shocked: { name: 'Wheat Wet Shocked', type: 'resource', sellPrice: 35, isMutation: true, isShocked: true, description: 'WET + SHOCKED! Worth 7x normal wheat.', image: asset('img/crop_wheat.png'), emoji: '🌟' },
    crop_tomato_wet: { name: 'Tomato Wet', type: 'resource', sellPrice: 80, isMutation: true, description: 'A succulent wet tomato. Worth 2x normal tomatoes.', image: asset('img/crop_tomato.png'), emoji: '🍅' },
    crop_tomato_shocked: { name: 'Tomato Shocked', type: 'resource', sellPrice: 200, isShocked: true, description: 'A surging tomato! Worth 5x normal tomatoes.', image: asset('img/crop_tomato.png'), emoji: '🍅' },
    crop_tomato_wet_shocked: { name: 'Tomato Wet Shocked', type: 'resource', sellPrice: 280, isMutation: true, isShocked: true, description: 'WET + SHOCKED! Worth 7x normal tomatoes.', image: asset('img/crop_tomato.png'), emoji: '🍅' },
    fish_rainbow: { name: 'Rainbow Fish', type: 'resource', sellPrice: 1, tier: 1, description: 'A colorful common fish found in the river.', image: asset('img/fish_rainbow.png'), emoji: '🐠' },
    fish_archer: { name: 'Archer Fish', type: 'resource', sellPrice: 3, tier: 2, description: 'Known for its precision.', image: asset('img/fish_archer.png'), emoji: '🐟' },
    fish_snakehead: { name: 'Snakehead Murrel', type: 'resource', sellPrice: 8, tier: 3, description: 'A fierce river predator.', image: asset('img/fish_snakehead.png'), emoji: '🐟' },
    fish_gourami: { name: 'Giant Gourami', type: 'resource', sellPrice: 20, tier: 4, description: 'A large, prized fish.', image: asset('img/fish_gourami.png'), emoji: '🐡' },
    fish_wallago: { name: 'Wallago Catfish', type: 'resource', sellPrice: 60, tier: 5, description: 'The legendary river giant.', image: asset('img/fish_wallago.png'), emoji: '🐋' },
    bait_grasshopper: { name: 'Grasshopper', type: 'bait', bonus: 30, description: 'Bait that significantly increases catch rate of better fish.', image: asset('img/bait_grasshopper.png'), emoji: '🦗' },
    bait_caterpillar: { name: 'Caterpillar', type: 'bait', bonus: 40, description: 'Great bait for higher value fish.', image: asset('img/bait_caterpillar.png'), emoji: '🐛' },
    bait_spider: { name: 'Bush Spider', type: 'bait', bonus: 50, description: 'Legendary bait for the most elusive fish.', image: asset('img/bait_spider.png'), emoji: '🕷️' },
    tool_fishing_rod: { name: 'Basic Rod', type: 'tool', price: 500, description: 'A simple wooden rod.', image: asset('img/tool_fishing_rod.png'), emoji: '🎣' },
    tool_silver_rod: { name: 'Silver Rod', type: 'tool', price: 2500, description: 'A reinforced silver rod.', image: asset('img/tool_silver_rod.png'), emoji: '🎣' },
    seeds_potato: { name: 'Potato Seed', type: 'seed', cropKey: 'potato', price: 10, description: 'A reliable crop that grows in 5 minutes.', image: asset('img/seeds_potato.png'), emoji: '🥔' },
    seeds_carrot: { name: 'Carrot Seed', type: 'seed', cropKey: 'carrot', price: 25, description: 'A high-value vegetable that takes 15 minutes to grow.', image: asset('img/seeds_carrot.png'), emoji: '🥕' },
    crop_potato: { name: 'Potato', type: 'resource', sellPrice: 100, description: 'A versatile tuber.', image: asset('img/crop_potato.png'), emoji: '🥔' },
    crop_carrot: { name: 'Carrot', type: 'resource', sellPrice: 400, description: 'A crunchy orange root.', image: asset('img/crop_carrot.png'), emoji: '🥕' },
    crop_potato_wet: { name: 'Potato Wet', type: 'resource', sellPrice: 200, isMutation: true, description: 'A premium wet potato.', image: asset('img/crop_potato.png'), emoji: '🥔' },
    crop_potato_shocked: { name: 'Potato Shocked', type: 'resource', sellPrice: 500, isShocked: true, description: 'A high-voltage potato.', image: asset('img/crop_potato.png'), emoji: '🥔' },
    crop_potato_wet_shocked: { name: 'Potato Wet Shocked', type: 'resource', sellPrice: 700, isMutation: true, isShocked: true, description: 'Wet + Shocked (7x value).', image: asset('img/crop_potato.png'), emoji: '🥔' },
    crop_carrot_wet: { name: 'Carrot Wet', type: 'resource', sellPrice: 800, isMutation: true, description: 'A shiny wet carrot.', image: asset('img/crop_carrot.png'), emoji: '🥕' },
    crop_carrot_shocked: { name: 'Carrot Shocked', type: 'resource', sellPrice: 2000, isShocked: true, description: 'A powerful orange carrot.', image: asset('img/crop_carrot.png'), emoji: '🥕' },
    crop_carrot_wet_shocked: { name: 'Carrot Wet Shocked', type: 'resource', sellPrice: 2800, isMutation: true, isShocked: true, description: 'Wet + Shocked (7x value).', image: asset('img/crop_carrot.png'), emoji: '🥕' },
    seeds_banana: { name: 'Banana Seed', type: 'seed', cropKey: 'banana', price: 100, description: 'Tropical seed that grows in 1 hour.', image: asset('img/seeds_banana.png'), emoji: '🍌' },
    seeds_apple: { name: 'Apple Seed', type: 'seed', cropKey: 'apple', price: 500, description: 'Sweet fruit seed that grows in 3 hours.', image: asset('img/seeds_apple.png'), emoji: '🍎' },
    crop_banana: { name: 'Banana', type: 'resource', sellPrice: 2500, description: 'A long yellow fruit.', image: asset('img/crop_banana.png'), emoji: '🍌' },
    crop_apple: { name: 'Apple', type: 'resource', sellPrice: 15000, description: 'A crunchy red fruit.', image: asset('img/crop_apple.png'), emoji: '🍎' },
    crop_banana_wet: { name: 'Banana Wet', type: 'resource', sellPrice: 5000, isMutation: true, description: 'A shiny tropical banana.', image: asset('img/crop_banana.png'), emoji: '🍌' },
    crop_banana_shocked: { name: 'Banana Shocked', type: 'resource', sellPrice: 12500, isShocked: true, description: 'Dangerous yellow energy fruit.', image: asset('img/crop_banana.png'), emoji: '🍌' },
    crop_banana_wet_shocked: { name: 'Banana Wet Shocked', type: 'resource', sellPrice: 17500, isMutation: true, isShocked: true, description: 'Wet + Shocked (7x value).', image: asset('img/crop_banana.png'), emoji: '🍌' },
    crop_apple_wet: { name: 'Apple Wet', type: 'resource', sellPrice: 30000, isMutation: true, description: 'A glistening premium apple.', image: asset('img/crop_apple.png'), emoji: '🍎' },
    crop_apple_shocked: { name: 'Apple Shocked', type: 'resource', sellPrice: 75000, isShocked: true, description: 'Zapping red premium fruit.', image: asset('img/crop_apple.png'), emoji: '🍎' },
    crop_apple_wet_shocked: { name: 'Apple Wet Shocked', type: 'resource', sellPrice: 105000, isMutation: true, isShocked: true, description: 'Wet + Shocked (7x value).', image: asset('img/crop_apple.png'), emoji: '🍎' },
    seeds_durian: { name: 'Durian Seed', type: 'seed', cropKey: 'durian', price: 2000, description: 'The King of Fruits. Grows in 8 hours.', image: asset('img/seeds_durian.png'), emoji: '🍈' },
    crop_durian: { name: 'Durian', type: 'resource', sellPrice: 80000, description: 'Strong aroma, exquisite taste.', image: asset('img/crop_durian.png'), emoji: '🍈' },
    crop_durian_wet: { name: 'Durian Wet', type: 'resource', sellPrice: 160000, isMutation: true, description: 'A heavy, premium wet durian.', image: asset('img/crop_durian.png'), emoji: '🍈' },
    crop_durian_shocked: { name: 'Durian Shocked', type: 'resource', sellPrice: 400000, isShocked: true, description: 'A legendary electrified durian.', image: asset('img/crop_durian.png'), emoji: '🍈' },
    crop_durian_wet_shocked: { name: 'Durian Wet Shocked', type: 'resource', sellPrice: 560000, isMutation: true, isShocked: true, description: 'Wet + Shocked (7x value).', image: asset('img/crop_durian.png'), emoji: '🍈' },
    item_energy_boost: { name: 'Vitamins', type: 'upgrade', price: 1000, description: 'Permanently increases Max Energy by 1.', image: asset('img/item_energy_boost.png'), emoji: '💊' }
};

// ---- Helper bersama ----------------------------------------------------
// Waktu server (jam browser bisa salah); offset di-update dari setiap balasan server.
function nowMs() {
    return Date.now() + serverTimeOffset;
}

// Harga jual: integer math supaya tidak kena floating point (mis. 100 * (1 - 0.8) = 19.99..).
// Sama dengan sellValue() di src/gamedata.js.
function sellBase(key) {
    const it = ITEMS[key];
    if (!it) return null;
    if (it.sellPrice !== undefined) return it.sellPrice;
    if (it.type === 'consumable') return Math.floor(it.price * 0.5) || 5;
    return null;
}

function sellValue(key, penalty = 0) {
    const base = sellBase(key);
    if (base === null) return null;
    const pct = Math.min(100, Math.max(0, Math.round((Number(penalty) || 0) * 100)));
    return Math.floor((base * (100 - pct)) / 100);
}

// Terapkan angka resmi dari server (gold / energi), lalu segarkan tampilan
function applyUser(u) {
    if (!u) return;
    gold = u.gold;
    energy = u.energy;
    if (u.maxEnergy) maxEnergy = u.maxEnergy;
    if (u.lastUpdated !== undefined && u.lastUpdated !== null) {
        energyBase = u.energy;
        energyBaseAt = u.lastUpdated;
    }
    updateStats();
}

function normalizePlot(p) {
    const cropType = p.cropType || null;
    return {
        id: parseInt(p.id, 10),
        state: p.state || 'empty',
        plantTime: Number(p.plantTime) || 0,
        growthDuration: parseInt(p.growthDuration, 10) || 0,
        cropType,
        cropName: cropType ? (CROPS[cropType] ? CROPS[cropType].name : cropType) : '',
        pestLevel: parseInt(p.pestLevel, 10) || 0,
        targetPest: parseInt(p.targetPest, 10) || 0,
        watered: !!p.watered,
        mutations: { wet: !!(p.mutations && p.mutations.wet), shocked: !!(p.mutations && p.mutations.shocked) }
    };
}

function emptyPlotFields() {
    return {
        state: 'empty', cropType: null, cropName: '', pestLevel: 0, targetPest: 0, watered: false,
        plantTime: 0, growthDuration: 0, mutations: { wet: false, shocked: false }
    };
}

function getQty() {
    const n = parseInt(document.getElementById('buy-qty').value, 10);
    return Number.isFinite(n) ? Math.min(99, Math.max(1, n)) : 1;
}

function renderIcon(itemKey, customClass = "", customData = null) {
    let item = ITEMS[itemKey];

    // Fallback for special UI items or unknown keys
    if (!item) {
        const special = {
            'empty_plot': { emoji: '🟫', image: asset('img/ui_empty.png') },
            'growing': { emoji: '🌱', image: asset('img/ui_growing.png') },
            'ready_wheat': { emoji: '🌾', image: asset('img/crop_wheat.png') },
            'ready_tomato': { emoji: '🍅', image: asset('img/crop_tomato.png') },
            'pest_1': { emoji: '🐜', image: '' },
            'pest_2': { emoji: '🪲', image: '' },
            'pest_3': { emoji: '🦗', image: '' },
            'ready_potato': { emoji: '🥔', image: asset('img/crop_potato.png') },
            'ready_carrot': { emoji: '🥕', image: asset('img/crop_carrot.png') },
            'harvest_all': { emoji: '🧺', image: '' },
            'buy_land': { emoji: '🏗️', image: asset('img/ui_buy_land.png') },
            'fishing_waiting': { emoji: '🎣', image: asset('img/fishing_waiting.png') },
            'fishing_on': { emoji: '❕', image: asset('img/fishing_on.png') },
            'fishing_none': { emoji: '🌊', image: asset('img/map_river.png') },
            'thicket_none': { emoji: '🦗', image: asset('img/map_thicket.png') },
            'thicket_searching': { emoji: '🌿', image: asset('img/thicket_searching.png') },
            'thicket_fail': { emoji: '🍃', image: asset('img/thicket_fail.png') },
            'fishing_lose': { emoji: '❌', image: asset('img/fishing_lose.png') },
            'ready_banana': { emoji: '🍌', image: asset('img/crop_banana.png') },
            'ready_apple': { emoji: '🍎', image: asset('img/crop_apple.png') },
            'ready_durian': { emoji: '🍈', image: asset('img/crop_durian.png') }
        };
        item = special[itemKey] || { emoji: '❓', image: '' };
    }

    let overlays = '';
    const isWet = item.isMutation || (customData && customData.isWet);
    const isShocked = item.isShocked || (customData && customData.isShocked);

    if (isWet) {
        overlays += `<div style="position:absolute; bottom:1px; left:1px; color:#fff; font-size:12px; pointer-events:none; z-index:2; filter: drop-shadow(1px 1px 1px #000);">💧</div>`;
    }

    if (isShocked) {
        overlays += `<div style="position:absolute; bottom:1px; right:1px; color:#fff; font-size:12px; pointer-events:none; z-index:2; filter: drop-shadow(1px 1px 1px #000);">⚡</div>`;
    }

    const imgHTML = item.image
        ? `<img src="${item.image}" class="item-img ${customClass}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                     <span class="fallback-emoji" style="display:none;">${item.emoji}</span>`
        : `<span class="fallback-emoji" style="display:block;">${item.emoji}</span>`;

    if (overlays) {
        return `<div class="mutation-container" style="position:relative; display:inline-block; border-radius:4px; overflow:hidden;">
                    ${imgHTML}
                    ${overlays}
                </div>`;
    }

    return imgHTML;
}

// --- Weather System ---
function initRain() {
    const overlay = document.getElementById('weather-overlay');
    overlay.innerHTML = '<div class="rain"></div>';
    const rainContainer = overlay.querySelector('.rain');
    const dropCount = 100;

    for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('div');
        drop.className = 'drop';
        drop.style.left = Math.random() * 100 + '%';
        drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
        drop.style.animationDelay = Math.random() * 2 + 's';
        rainContainer.appendChild(drop);
    }
}

let audioFadeInterval = null;
function fadeAudio(audioEl, newSrc) {
    if (!audioEl) return;
    if (audioFadeInterval) clearInterval(audioFadeInterval);

    const isSame = audioEl.src && audioEl.src.includes(newSrc);
    if (isSame) return;

    if (audioEl.paused) {
        audioEl.src = newSrc;
        audioEl.load();
        return;
    }

    let volume = audioEl.volume;
    audioFadeInterval = setInterval(() => {
        if (volume > 0.05) {
            volume -= 0.05;
            audioEl.volume = volume;
        } else {
            clearInterval(audioFadeInterval);
            audioFadeInterval = null;
            audioEl.volume = 0;
            audioEl.src = newSrc;
            audioEl.load();
            audioEl.play().then(() => {
                let fadeInVol = 0;
                audioFadeInterval = setInterval(() => {
                    if (fadeInVol < 0.95) {
                        fadeInVol += 0.05;
                        audioEl.volume = fadeInVol;
                    } else {
                        audioEl.volume = 1.0;
                        clearInterval(audioFadeInterval);
                        audioFadeInterval = null;
                    }
                }, 50);
            }).catch(e => {
                audioEl.volume = 1.0;
                audioFadeInterval = null;
            });
        }
    }, 50);
}

function updateWeather(type) {
    current_weather = type;
    const overlay = document.getElementById('weather-overlay');
    const info = document.getElementById('weather-info');
    const bgm = document.getElementById('bg-music');

    // Weather BGM Mapping
    const weatherBGM = {
        'clear': asset('audio/bgm.mp3'),
        'rain': asset('audio/rain.mp3'),
        'thunder': asset('audio/thunder.mp3')
    };

    if (bgm) {
        const targetSrc = weatherBGM[type] || asset('audio/bgm.mp3');
        fadeAudio(bgm, targetSrc);
    }

    if (type === 'rain') {
        overlay.classList.add('active');
        overlay.classList.remove('thunder-mode');
        initRain();
        if (info) info.innerHTML = '<span>🌧️</span> Rain';
        console.log("Weather Update: Rain activated");
    } else if (type === 'thunder') {
        overlay.classList.add('active');
        overlay.classList.add('thunder-mode');
        initRain(); // Thunder includes rain
        if (info) info.innerHTML = '<span>⛈️</span> Thunder';
        console.log("Weather Update: Thunder activated");
    } else {
        overlay.classList.remove('active');
        overlay.classList.remove('thunder-mode');
        overlay.innerHTML = '';
        if (info) info.innerHTML = '<span>☀️</span> Clear';
    }
}

function weatherAtMs(ms) {
    // Harus sama persis dengan weatherAt() di src/gamedata.js: jadwal berdasarkan waktu UTC server
    const slotLen = 30 * 60 * 1000;
    const slotMin = Math.floor((ms % slotLen) / 60000);
    if (slotMin <= 2) return 'rain';
    if (slotMin <= 5) {
        const n = Math.floor(ms / slotLen);
        return (((n * 2654435761) >>> 16) & 1) === 0 ? 'thunder' : 'clear';
    }
    return 'clear';
}

function getScheduledWeather() {
    return weatherAtMs(nowMs());
}

function triggerLightning() {
    const flash = document.getElementById('lightning-flash');
    if (!flash) return;
    flash.classList.remove('flash-active');
    void flash.offsetWidth; // Trigger reflow
    flash.classList.add('flash-active');
}

const CROPS = {
    wheat: { name: 'Wheat', duration: 30000, cost: 0, isSeed: true, seedKey: 'seeds_wheat', resultKey: 'crop_wheat' },
    tomato: { name: 'Tomato', duration: 120000, cost: 0, isSeed: true, seedKey: 'seeds_tomato', resultKey: 'crop_tomato' },
    potato: { name: 'Potato', duration: 300000, cost: 0, isSeed: true, seedKey: 'seeds_potato', resultKey: 'crop_potato' },
    carrot: { name: 'Carrot', duration: 900000, cost: 0, isSeed: true, seedKey: 'seeds_carrot', resultKey: 'crop_carrot' },
    banana: { name: 'Banana', duration: 3600000, cost: 0, isSeed: true, seedKey: 'seeds_banana', resultKey: 'crop_banana' },
    apple: { name: 'Apple', duration: 10800000, cost: 0, isSeed: true, seedKey: 'seeds_apple', resultKey: 'crop_apple' },
    durian: { name: 'Durian', duration: 28800000, cost: 0, isSeed: true, seedKey: 'seeds_durian', resultKey: 'crop_durian' }
};

// DOM Elements
const goldEl = document.getElementById('gold-display');
const energyValEl = document.getElementById('energy-display');
const containerEl = document.getElementById('plot-container');
const inventoryListEl = document.getElementById('inventory-list');

// ... (views, navBtns...)

// ...

function updateStats() {
    // Update Gold
    if (goldEl) goldEl.textContent = gold;

    // Update Energy Text (x/y)
    if (energyValEl) {
        energyValEl.textContent = `${energy}/${maxEnergy}`;
    }

    // HP is removed from UI
}

// Views
const views = {
    farm: document.getElementById('farm-view'),
    shop: document.getElementById('shop-view'),
    inventory: document.getElementById('inventory-view'),
    town: document.getElementById('town-container'),
    river: document.getElementById('river-container'),
    thicket: document.getElementById('thicket-container'),
    plotDetail: document.getElementById('plot-detail-view'),
    leaderboard: document.getElementById('leaderboard-view'),
    profile: document.getElementById('profile-view'),
    quests: document.getElementById('quests-view')
};

const navBtns = {
    farm: document.getElementById('nav-farm'),
    shop: document.getElementById('nav-shop'),
    inventory: document.getElementById('nav-inventory'),
    town: document.getElementById('nav-town'),
    quests: document.getElementById('nav-quests'),
    leaderboard: document.getElementById('nav-leaderboard')
};

// Fishing State
let isFishing = false;
let fishBiteTimeout = null;
let fishingMinigameActive = false;
let fishingNumbers = [];
let minigameTimeout = null;
let pendingFish = null;      // hasil lemparan dari server { key, snapped, difficulty }
let resolvingFish = false;
let weatherTickBusy = false;
let harvestAllBusy = false;
let buyBusy = false;

let currentPlotId = null; // New Global

// --- BACKEND LOAD ---
let welcomed = false;
async function loadGame() {
    try {
        const json = await performAction('init', {});
        if (json && json.success) {
            const data = json.data;
            if (data.serverTime) serverTimeOffset = data.serverTime - Date.now();
            applyUser(data.user);
            plots = data.plots.map(normalizePlot).sort((a, b) => a.id - b.id);
            inventory = data.inventory.map(i => ({ id: i.id, key: i.key, penalty: i.penalty || 0 }));
            quests = data.quests || [];

            updateStats();
            renderPlots();
            if (typeof renderInventory === 'function') renderInventory();
            if (!welcomed) {
                welcomed = true;
                showMessage("Welcome to your Farm!");
            }
        } else {
            console.error("Load failed:", json && json.message);
        }
    } catch (e) {
        console.error("Error loading game:", e);
        showMessage("Offline Mode: Could not connect.");
    }
}




// Initialize
async function init() {
    // Auth Listeners
    document.getElementById('btn-login').onclick = handleLogin;
    document.getElementById('btn-to-register').onclick = () => showAuthState('register');
    document.getElementById('btn-to-login').onclick = () => showAuthState('login');
    document.getElementById('btn-to-login-2').onclick = () => showAuthState('login');
    document.getElementById('btn-to-login-3').onclick = () => showAuthState('login');
    document.getElementById('link-forgot').onclick = () => showAuthState('forgot');
    document.getElementById('btn-register').onclick = handleRegister;
    document.getElementById('btn-forgot-submit').onclick = handleForgot;
    document.getElementById('btn-reset-submit').onclick = handleReset;
    document.getElementById('btn-guest').onclick = handleGuestLogin;

    // Header Logout
    const btnLogoutHeader = document.getElementById('btn-logout-header');
    if (btnLogoutHeader) btnLogoutHeader.onclick = () => handleLogout();

    // Setup Nav
    Object.keys(navBtns).forEach(key => {
        if (navBtns[key]) {
            navBtns[key].onclick = (e) => {
                e.preventDefault();
                switchView(key);
            };
        }
    });

    const btnBackFarm = document.getElementById('btn-back-farm');
    if (btnBackFarm) btnBackFarm.onclick = () => switchView('farm');

    // Setup Travel
    const btnRiver = document.getElementById('btn-travel-river');
    if (btnRiver) btnRiver.onclick = () => switchView('river');

    const btnReturn = document.getElementById('btn-return-town');
    if (btnReturn) btnReturn.onclick = () => switchView('town');

    // Setup Fishing
    const btnCast = document.getElementById('btn-cast-rod');
    const btnPull = document.getElementById('btn-pull-rod');
    if (btnCast) btnCast.onclick = castRod;
    if (btnPull) btnPull.onclick = pullRod;

    const btnFishSell = document.getElementById('btn-fish-sell');
    const btnFishKeep = document.getElementById('btn-fish-keep');
    if (btnFishSell) btnFishSell.onclick = sellCaughtFish;
    if (btnFishKeep) btnFishKeep.onclick = keepCaughtFish;

    // Setup Thicket
    const btnThicket = document.getElementById('btn-travel-thicket');
    if (btnThicket) btnThicket.onclick = () => switchView('thicket');

    const btnSearchBait = document.getElementById('btn-search-bait');
    if (btnSearchBait) btnSearchBait.onclick = searchBait;

    const btnReturn2 = document.getElementById('btn-return-town-2');
    if (btnReturn2) btnReturn2.onclick = () => switchView('town');

    // Setup Profile
    const headerUser = document.getElementById('header-user-name');
    if (headerUser) headerUser.onclick = () => switchView('profile');

    const btnProfileHeader = document.getElementById('btn-profile-header');
    if (btnProfileHeader) btnProfileHeader.onclick = () => switchView('profile');

    const btnProfBack = document.getElementById('btn-prof-back');
    if (btnProfBack) btnProfBack.onclick = () => switchView('farm');

    const btnQuestBack = document.getElementById('btn-quest-back');
    if (btnQuestBack) btnQuestBack.onclick = () => switchView('farm');

    // Avatar Upload
    const profUploadBtn = document.getElementById('prof-upload-btn');
    const avatarInput = document.getElementById('avatar-input');
    if (profUploadBtn && avatarInput) {
        profUploadBtn.onclick = () => avatarInput.click();
        avatarInput.onchange = handleAvatarUpload;
    }

    updateWeather(getScheduledWeather());
    requestAnimationFrame(gameLoop);
    initChat();

    // Auth Check (listener sudah terpasang, jadi tombol tetap hidup walau server lambat merespons)
    if (authToken) {
        document.getElementById('auth-modal').style.display = 'none';
        const name = authUser || 'FARMER';
        document.querySelector('.user-name').textContent = name;
        if (document.getElementById('farm-title')) {
            document.getElementById('farm-title').textContent = `${name.toUpperCase()}'S FARM`;
        }
        await loadGame();
        renderPlots();
        updateStats();
    } else {
        document.getElementById('auth-modal').style.display = 'flex';
    }

    // Check for Reset Token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    if (resetToken) {
        document.getElementById('auth-modal').style.display = 'flex';
        showAuthState('reset');
    }
}

/* --- THICKET LOGIC --- */
let isSearching = false;
let searchBaitTimeout = null;

function resetThicket(msg = null) {
    isSearching = false;
    clearTimeout(searchBaitTimeout);

    const btn = document.getElementById('btn-search-bait');
    const status = document.getElementById('thicket-status');
    const visual = document.getElementById('thicket-visual');

    if (btn) btn.style.display = 'inline-block';

    if (msg) {
        status.textContent = msg;
        // Keep the result icon/msg for a bit, then revert via timeout in searchBait
    } else {
        if (status) status.textContent = "Search for bait among the leaves...";
        if (visual) visual.innerHTML = renderIcon('thicket_none', 'item-img-small');
        if (status) status.style.color = "#fff";
    }
}
async function searchBait() {
    if (isSearching) return;
    if (energy < 1) {
        showMessage("Need 1 Energy!");
        return;
    }
    isSearching = true;

    const visual = document.getElementById('thicket-visual');
    const status = document.getElementById('thicket-status');
    const btn = document.getElementById('btn-search-bait');

    visual.innerHTML = renderIcon('thicket_searching', 'item-img-small');
    status.textContent = "Searching bush...";
    status.style.color = "#fff";
    btn.style.display = 'none';

    // Hasil (dan energi 1) ditentukan server; animasi pencarian 1-5 detik tetap dipertahankan
    const started = Date.now();
    const res = await performAction('search_bait', {});
    if (res && res.success && res.item) {
        inventory.push({ id: res.item.id, key: res.item.key, penalty: 0 });
    }
    if (!isSearching) return; // pemain sudah pindah halaman

    if (!res || !res.success) {
        isSearching = false;
        btn.style.display = 'inline-block';
        status.textContent = (res && res.message) || "Search failed";
        showMessage(status.textContent);
        return;
    }

    const duration = Math.random() * 4000 + 1000;
    const wait = Math.max(0, duration - (Date.now() - started));

    searchBaitTimeout = setTimeout(() => {
        isSearching = false;
        btn.style.display = 'inline-block';

        if (res.found) {
            const itemDef = ITEMS[res.found];
            visual.innerHTML = renderIcon(res.found, "item-img-small");
            const resultMsg = `Found ${itemDef.name}! Added to Inventory.`;
            status.textContent = resultMsg;
            status.style.color = "#ffeb3b";
            searchBaitTimeout = setTimeout(() => {
                if (!isSearching && status.textContent === resultMsg) resetThicket();
            }, 3000);
        } else {
            visual.innerHTML = renderIcon('thicket_fail', 'item-img-small');
            const failMsg = "Found nothing, try again!";
            status.textContent = failMsg;
            status.style.color = "#fff";
            searchBaitTimeout = setTimeout(() => {
                if (!isSearching && status.textContent === failMsg) resetThicket();
            }, 3000);
        }
    }, wait);
}

// Tampilan regen energi: dihitung dari waktu server (server tetap yang berwenang)
setInterval(() => {
    if (energyBaseAt === null || energy >= maxEnergy) return;
    const projected = Math.min(maxEnergy, energyBase + Math.floor((nowMs() / 1000 - energyBaseAt) / 60));
    if (projected > energy) {
        energy = projected;
        updateStats();
    }
}, 1000);

// Audio
const music = document.getElementById('bg-music');
const muteBtn = document.getElementById('btn-mute');
if (music) {
    music.volume = 1.0;
    let userMuted = false;
    const syncMuteIcon = () => { if (muteBtn) muteBtn.textContent = music.paused ? '🔇' : '🔊'; };
    music.addEventListener('play', syncMuteIcon);
    music.addEventListener('pause', syncMuteIcon);
    syncMuteIcon();
    music.play().catch(e => console.log("Audio autoplay blocked", e));
    // Browser memblokir autoplay: mulai musik di interaksi pertama (kecuali pemain sudah mematikannya)
    document.addEventListener('pointerdown', () => {
        if (music.paused && !userMuted) music.play().catch(() => { });
    }, { once: true });
    if (muteBtn) {
        muteBtn.onclick = () => {
            if (music.paused) { userMuted = false; music.play().catch(() => { }); }
            else { userMuted = true; music.pause(); }
        };
    }
}

/* --- FISHING LOGIC --- */
let selectedBaitKey = '';

function openBaitModal() {
    updateBaitGrid();
    document.getElementById('bait-modal').style.display = 'flex';
}

function closeBaitModal() {
    document.getElementById('bait-modal').style.display = 'none';
}

function selectBait(key) {
    selectedBaitKey = key;
    const nameEl = document.getElementById('bait-name');
    const iconEl = document.getElementById('bait-icon');

    if (!key) {
        nameEl.textContent = "(None)";
        iconEl.innerHTML = "🪱";
        iconEl.style.display = 'flex';
    } else {
        const item = ITEMS[key];
        nameEl.textContent = item.name;
        iconEl.innerHTML = "";
        iconEl.style.display = 'none'; // Hide the icon container entirely for "text only"
    }
    closeBaitModal();
}

function updateBaitGrid() {
    const grid = document.getElementById('bait-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // None Option
    const noneCard = document.createElement('div');
    noneCard.className = 'bait-item-card none';
    noneCard.onclick = () => selectBait('');
    noneCard.innerHTML = `<div class="name">NO BAIT</div>`;
    grid.appendChild(noneCard);

    // Group baits in inventory
    const baits = {};
    inventory.forEach(item => {
        const itemDef = ITEMS[item.key];
        if (itemDef && itemDef.type === 'bait') {
            if (!baits[item.key]) baits[item.key] = { name: itemDef.name, count: 0, bonus: itemDef.bonus };
            baits[item.key].count++;
        }
    });

    Object.keys(baits).forEach(key => {
        const b = baits[key];
        const card = document.createElement('div');
        card.className = 'bait-item-card';
        card.onclick = () => selectBait(key);
        card.innerHTML = `
            <div class="icon">${renderIcon(key)}</div>
            <div class="name">${b.name} (x${b.count})</div>
            <div class="bonus">+${b.bonus}% Chance</div>
        `;
        grid.appendChild(card);
    });
}



/* --- SEED SELECTION LOGIC --- */
function openSeedModal() {
    updateSeedGrid();
    document.getElementById('seed-modal').style.display = 'flex';
}

function closeSeedModal() {
    document.getElementById('seed-modal').style.display = 'none';
}

async function selectSeed(cropKey) {
    closeSeedModal();
    await plantSeed(currentPlotId, cropKey);
    renderPlotDetail();
}

function updateSeedGrid() {
    const grid = document.getElementById('seed-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Group seeds in inventory
    const seeds = {};
    inventory.forEach(item => {
        const itemDef = ITEMS[item.key];
        if (itemDef && itemDef.type === 'seed') {
            if (!seeds[item.key]) {
                seeds[item.key] = {
                    name: itemDef.name,
                    count: 0,
                    cropKey: itemDef.cropKey,
                    desc: itemDef.description
                };
            }
            seeds[item.key].count++;
        }
    });

    const seedKeys = Object.keys(seeds);
    if (seedKeys.length === 0) {
        grid.innerHTML = '<div style="grid-column: span 2; padding: 20px; text-align: center; color: #5d4037; font-size: 10px;">No seeds in inventory. Visit the Shop to buy some!</div>';
        return;
    }

    seedKeys.forEach(key => {
        const s = seeds[key];
        const card = document.createElement('div');
        card.className = 'bait-item-card';
        card.onclick = () => selectSeed(s.cropKey);
        card.innerHTML = `
            <div class="icon">${renderIcon(key)}</div>
            <div class="name">${s.name} (x${s.count})</div>
        `;
        grid.appendChild(card);
    });
}


async function castRod() {
    if (isFishing) return;
    // Check for ANY rod (future-proofing)
    const hasRod = inventory.some(i => i.key.includes('rod'));
    if (!hasRod) {
        showMessage("Need a Rod (Check Shop)!");
        return;
    }
    if (energy < 2) {
        showMessage("Need 2 Energy!");
        return;
    }

    // Check Bait
    let waitTime = 5000; // Default NO BAIT
    let baitId = null;
    if (selectedBaitKey) {
        const bait = inventory.find(i => i.key === selectedBaitKey);
        if (bait) {
            baitId = bait.id;
            waitTime = 3000; // BAIT TIME
        } else {
            selectedBaitKey = ''; // Safeguard if bait was somehow removed
        }
    }

    isFishing = true;

    // UI Update
    document.getElementById('btn-cast-rod').style.display = 'none';
    const baitCont = document.getElementById('bait-selector-container');
    if (baitCont) baitCont.style.display = 'none';
    document.getElementById('fishing-status').textContent = "Casting...";
    document.getElementById('fishing-visual').innerHTML = renderIcon('fishing_waiting', "item-img-small");

    // Server memotong energi + umpan dan MENENTUKAN ikannya (tidak bisa dimanipulasi dari browser)
    const res = await performAction('cast_rod', { baitId });
    if (res && res.success && res.baitUsed) {
        const bi = inventory.findIndex(i => i.id === res.baitUsed);
        if (bi > -1) inventory.splice(bi, 1);
    }
    if (!isFishing) return; // pemain sudah pindah halaman
    if (!res || !res.success) {
        resetFishing((res && res.message) || "Could not cast the line");
        return;
    }
    selectBait(''); // umpan sudah terpakai
    pendingFish = { key: res.fishKey, snapped: res.snapped, difficulty: res.difficulty };

    document.getElementById('fishing-status').textContent = "Waiting for fish...";

    fishBiteTimeout = setTimeout(() => {
        if (!isFishing) return; // Cancelled?
        document.getElementById('fishing-status').textContent = "FISH ON! PULL NOW!";
        document.getElementById('fishing-visual').innerHTML = renderIcon('fishing_on', "item-img-small");
        document.getElementById('btn-pull-rod').style.display = 'inline-block';

        // Auto lose if not pulled in 3 seconds
        fishBiteTimeout = setTimeout(() => {
            resetFishing("Fish got away...");
        }, 3000);

    }, waitTime);
}

function pullRod() {
    clearTimeout(fishBiteTimeout); // Stop lose timer
    document.getElementById('btn-pull-rod').style.display = 'none';

    startFishingMinigame();
}

let currentFishKey = 'fish_rainbow'; // Default

function startFishingMinigame() {
    const fish = pendingFish;
    if (!fish) {
        resetFishing();
        return;
    }
    fishingMinigameActive = true;
    document.getElementById('fishing-minigame').style.display = 'block';

    // Ikan terlalu kuat untuk pancing ini (ditentukan server)
    if (fish.snapped) {
        document.getElementById('fishing-status').textContent = "SOMETHING HUGE BIT...";
        setTimeout(() => {
            if (!isFishing) return;
            resetFishing(`Line Snapped! ${ITEMS[fish.key].name} was too strong for your rod!`);
        }, 1000);
        return;
    }

    currentFishKey = fish.key;
    document.getElementById('fishing-status').textContent = `HOOKED A BIG ONE! Click the numbers in order! 2 SECONDS PER CLICK!`;

    // Generate N random unique numbers 1-20
    fishingNumbers = [];
    while (fishingNumbers.length < fish.difficulty) {
        const n = Math.floor(Math.random() * 20) + 1;
        if (!fishingNumbers.includes(n)) fishingNumbers.push(n);
    }

    renderMinigameNumbers();
    startMinigameTimer();
}

function startMinigameTimer() {
    clearTimeout(minigameTimeout);
    minigameTimeout = setTimeout(() => {
        if (fishingMinigameActive) {
            resetFishing("Line broke! You were too slow!");
        }
    }, 2000); // 2 Seconds per click
}



function renderMinigameNumbers() {
    const container = document.getElementById('fishing-numbers');
    container.innerHTML = '';
    // Flex wrap style
    container.style.display = 'flex';
    container.style.flexWrap = 'wrap';
    container.style.justifyContent = 'center';
    container.style.gap = '10px';

    fishingNumbers.forEach(num => {
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.textContent = num;
        btn.style.width = '55px';
        btn.style.height = '50px';
        btn.style.fontSize = '14px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.onclick = () => handleMinigameClick(num);
        container.appendChild(btn);
    });
}

function handleMinigameClick(num) {
    if (!fishingMinigameActive) return;

    // Check if lowest
    const sorted = [...fishingNumbers].sort((a, b) => a - b);
    if (num === sorted[0]) {
        // Correct
        fishingNumbers = fishingNumbers.filter(n => n !== num);
        renderMinigameNumbers();

        if (fishingNumbers.length === 0) {
            catchFish();
        } else {
            // Reset the 2-second timer for the next number
            startMinigameTimer();
        }
    } else {
        // Wrong
        resetFishing("Wrong number! Fish escaped!");
    }
}

let lastCaughtFish = null;
let lastCaughtPrice = 0;

function catchFish() {
    clearTimeout(minigameTimeout); // Stop fail
    fishingMinigameActive = false;
    document.getElementById('fishing-minigame').style.display = 'none';
    document.getElementById('fishing-choice').style.display = 'block';

    // Ikan baru dihitung sebagai tangkapan setelah pemain memilih SELL / KEEP (di server)
    lastCaughtFish = { key: currentFishKey };
    lastCaughtPrice = sellValue(currentFishKey, 0);

    const fishName = ITEMS[currentFishKey].name;
    const msg = `You caught a <span style="color:#e53935;">${fishName}!</span> Worth ${lastCaughtPrice}g`;
    document.getElementById('fishing-status').innerHTML = msg;
    document.getElementById('fishing-visual').innerHTML = renderIcon(currentFishKey, "item-img-small");
    document.getElementById('btn-fish-sell').textContent = `SELL (${lastCaughtPrice}g)`;
}

async function resolveFish(choice) {
    if (!lastCaughtFish || resolvingFish) return;
    resolvingFish = true;
    try {
        const res = await performAction('resolve_fish', { choice });
        lastCaughtFish = null;
        pendingFish = null;
        if (res && res.success) {
            const def = ITEMS[res.fishKey];
            if (choice === 'sell') {
                resetFishing(`Sold ${def.name} for ${res.value}g!`);
            } else {
                inventory.push({ id: res.item.id, key: res.item.key, penalty: 0 });
                resetFishing(`Kept ${def.name} in storage.`);
            }
        } else {
            resetFishing((res && res.message) || "The fish got away...");
        }
    } finally {
        resolvingFish = false;
    }
}

function sellCaughtFish() { return resolveFish('sell'); }

function keepCaughtFish() { return resolveFish('keep'); }

function resetFishing(msg) {
    isFishing = false;
    fishingMinigameActive = false;
    pendingFish = null;

    // Clear any active timers
    clearTimeout(fishBiteTimeout);
    clearTimeout(minigameTimeout);

    // Reset UI to initial "Cast Rod" state
    document.getElementById('btn-cast-rod').style.display = 'inline-block';
    const baitCont = document.getElementById('bait-selector-container');
    if (baitCont) baitCont.style.display = 'block';

    document.getElementById('btn-pull-rod').style.display = 'none';
    document.getElementById('fishing-minigame').style.display = 'none';
    const choiceEl = document.getElementById('fishing-choice');
    if (choiceEl) choiceEl.style.display = 'none';

    // Reset bait selection
    selectBait('');

    if (msg) {
        // Show the message briefly in the status area
        const statusEl = document.getElementById('fishing-status');
        statusEl.textContent = msg;

        // Determine icon based on message content
        const isLose = msg.includes('away') || msg.includes('escaped') || msg.includes('broke') || msg.includes('Snapped') || msg.includes('slow');
        const iconKey = isLose ? 'fishing_lose' : 'fishing_none';
        document.getElementById('fishing-visual').innerHTML = renderIcon(iconKey, 'item-img-small');

        // Feedback in popup
        showMessage(msg);

        // Revert to "Cast your line" text after 3 seconds
        setTimeout(() => {
            if (!isFishing && statusEl.textContent === msg) {
                statusEl.textContent = "Cast your line to start fishing...";
                document.getElementById('fishing-visual').innerHTML = renderIcon('fishing_none', 'item-img-small');
            }
        }, 3000);
    } else {
        // Immediate reset to default
        document.getElementById('fishing-status').textContent = "Cast your line to start fishing...";
        document.getElementById('fishing-visual').innerHTML = renderIcon('fishing_none', 'item-img-small');
    }
}

function switchView(viewName) {
    // If moving away from river OR currently active in a fishing state, reset it
    const isChoiceActive = document.getElementById('fishing-choice') && document.getElementById('fishing-choice').style.display === 'block';

    if (isFishing || fishingMinigameActive || isChoiceActive) {
        if (viewName !== 'river') {
            if (isChoiceActive && lastCaughtFish) {
                keepCaughtFish(); // ikan yang sudah ditangkap jangan dibuang: simpan otomatis
            } else {
                resetFishing(); // Silent reset when changing maps/views
            }
        }
    }

    if (isSearching) {
        if (viewName !== 'thicket') {
            resetThicket(); // Silent reset when leaving thicket
        }
    }

    // Hide all views first
    Object.values(views).forEach(view => {
        if (view) view.style.display = 'none';
    });

    // Show the requested view
    const targetView = views[viewName];
    if (targetView) {
        targetView.style.display = 'block';
        if (viewName === 'farm') renderPlots();
        if (viewName === 'inventory') renderInventory();
        if (viewName === 'shop') renderShop();
        if (viewName === 'quests') renderQuests();
        if (viewName === 'river') {
            // Ensure river starts in a clean state (kecuali sedang memilih nasib ikan)
            if (!lastCaughtFish) {
                resetFishing();
                selectBait('');
            }
        }
        if (viewName === 'thicket') {
            // Ensure thicket starts in a clean state
            resetThicket();
        }
    } else if (viewName === 'town') {
        if (views.town) views.town.style.display = 'block';
    }

    // Handle specific view styling/logic
    document.body.style.backgroundImage = "none";
    if (viewName === 'farm') {
        document.body.style.backgroundColor = "#8bc34a"; // Light Green
    } else if (viewName === 'shop') {
        document.body.style.backgroundColor = "#ffcc80"; // Light Orange
    } else if (viewName === 'inventory') {
        document.body.style.backgroundColor = "#e0e0e0"; // Light Gray
    } else if (viewName === 'river') {
        document.body.style.backgroundColor = "#4fc3f7";
    } else if (viewName === 'thicket') {
        document.body.style.backgroundColor = "#2e7d32"; // Dark Green
    } else {
        // Town / Map default
        document.body.style.backgroundColor = "#fff";
    }
}

// Duplicate buyItem removed.

// Duplicate renderShop removed.

// ... stat update removed since it is now at the top


function showMessage(msg, icon = '📜') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = 'notification';
    const iconEl = document.createElement('div');
    iconEl.className = 'icon';
    iconEl.textContent = icon;
    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = msg; // textContent: pesan dari server tidak bisa menyisipkan HTML
    notif.append(iconEl, content);

    container.appendChild(notif);

    // Auto remove
    setTimeout(() => {
        notif.classList.add('fade-out');
        setTimeout(() => {
            if (notif.parentNode) container.removeChild(notif);
        }, 500);
    }, 3000);
}

/* --- FARM LOGIC --- */

function renderPlots() {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    // Safety check if plots not loaded yet
    if (!plots || plots.length === 0) {
        containerEl.innerHTML = '<div style="color:white; padding:20px;">Loading Farm... (or Error)</div>';
        return;
    }

    plots.forEach((plot, index) => {
        const card = document.createElement('div');
        card.className = 'plot-card';
        card.id = `plot-card-${index}`;
        card.innerHTML = getPlotHTML(plot);
        containerEl.appendChild(card);
    });

    // Simplified Quick Actions (Harvest All)
    const quickActionsEl = document.getElementById('farm-quick-actions');
    if (quickActionsEl) {
        quickActionsEl.innerHTML = '';
        const readyPlots = plots.filter(p => p.state === 'ready');
        if (readyPlots.length > 0) {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.style.backgroundColor = '#ffd700';
            btn.style.color = '#000';
            btn.style.width = '100%';
            btn.style.margin = '0';
            btn.innerHTML = `🌟 HARVEST ALL (${readyPlots.length}) 🌟`;
            btn.onclick = harvestAll;
            quickActionsEl.appendChild(btn);
        }
    }

    // Add "Buy Land" Card
    // First plot is free/initial. Next plot (plots.length 1 to 2) cost 250.
    // 1st upgrade (plot 2): 250
    // 2nd upgrade (plot 3): 500
    // formula: 250 * (2 ** (plots.length - 1))
    if (plots.length >= MAX_PLOTS) {
        attachPlotListeners();
        return;
    }
    const landCost = 250 * (Math.pow(2, plots.length - 1));
    const buyCard = document.createElement('div');
    buyCard.className = 'plot-card';
    buyCard.style.backgroundColor = '#d7ccc8';
    buyCard.style.borderStyle = 'dashed';
    buyCard.style.cursor = 'pointer';
    buyCard.onclick = () => buyLand(landCost);
    buyCard.innerHTML = `
        <div class="plot-icon" style="background:transparent; border:none;">
            ${renderIcon('buy_land')}
        </div>
        <div class="plot-details">
            <div class="plot-name">Expand Farm</div>
            <div class="plot-status">Next Plot: ${landCost.toLocaleString()}g</div>
        </div>
    `;
    containerEl.appendChild(buyCard);

    // Attach Listeners
    attachPlotListeners();
}



function renderShop() {
    const container = document.getElementById('shop-container');
    if (!container) return;
    container.innerHTML = '';
    console.log("Shop opened, ITEMS count:", Object.keys(ITEMS).length);

    const categories = { 'Seeds': [], 'Tools': [], 'Supplies': [] };

    Object.keys(ITEMS).forEach(key => {
        const item = ITEMS[key];
        if (item.price) {
            if (item.type === 'seed') categories['Seeds'].push(key);
            else if (item.type === 'tool') categories['Tools'].push(key);
            else if (item.type === 'consumable' || item.type === 'bait' || item.type === 'upgrade') categories['Supplies'].push(key);
        }
    });

    for (let cat in categories) {
        // Sort items in this category by price
        categories[cat].sort((a, b) => ITEMS[a].price - ITEMS[b].price);

        const section = document.createElement('div');
        section.innerHTML = `<div class="location-title" style="margin-top:20px;">${cat}</div>`;
        const list = document.createElement('div');
        list.className = 'shop-list';

        categories[cat].forEach(itemKey => {
            const item = ITEMS[itemKey];
            const isOwned = item.type === 'tool' && countItem(itemKey) > 0;

            const card = document.createElement('div');
            card.className = 'item-card-compact';
            if (isOwned) {
                card.style.opacity = '0.7';
                card.style.cursor = 'default';
            } else {
                card.onclick = () => openItemModal(itemKey, 'buy');
            }

            card.innerHTML = `
                <div class="plot-icon">${renderIcon(itemKey)}</div>
                <div class="plot-name">${item.name}</div>
                ${isOwned ? '<div style="font-size:8px; color:#2e7d32; font-weight:bold;">OWNED</div>' : ''}
            `;
            list.appendChild(card);
        });
        section.appendChild(list);
        container.appendChild(section);
    }
}

async function buyLand(cost) {
    if (plots.length >= MAX_PLOTS) {
        showMessage("You already own the maximum number of plots!");
        return;
    }
    if (gold < cost) {
        showMessage(`Need ${cost}g to expand!`);
        return;
    }
    const res = await performAction('buy_land', {});
    if (res && res.success) {
        plots.push(normalizePlot(res.plot));
        renderPlots();
        showMessage(`Expanded Farm! (-${cost}g)`);
    } else {
        showMessage((res && res.message) || "Could not expand farm");
    }
}

// --- PLOT DETAIL LOGIC ---

function openPlotDetail(index) {
    currentPlotId = index;
    renderPlotDetail();
    switchView('plotDetail');
}

function renderPlotDetail() {
    const plot = plots[currentPlotId];
    if (!plot) return;

    const titleEl = document.getElementById('plot-detail-title');
    if (titleEl) titleEl.textContent = `PLOT #${plot.id + 1}`;

    // Status & Icon
    const iconEl = document.getElementById('plot-detail-icon');
    const statusEl = document.getElementById('plot-detail-status');
    const actionsEl = document.getElementById('plot-actions-container');
    actionsEl.innerHTML = '';

    if (plot.state === 'empty') {
        iconEl.innerHTML = renderIcon('empty_plot');
        statusEl.textContent = "Soil is ready for planting.";

        const plantBtn = createActionButton('PLANT', '#81c784', () => {
            openSeedModal();
        });
        actionsEl.appendChild(plantBtn);
    } else if (plot.state === 'growing' || plot.state === 'ready') {
        const mutData = { isWet: plot.mutations.wet, isShocked: plot.mutations.shocked };
        // Icon
        if (plot.state === 'growing') {
            iconEl.innerHTML = renderIcon('growing', "", mutData);
            const elapsed = nowMs() - plot.plantTime;
            const progress = Math.min(100, Math.floor((elapsed / plot.growthDuration) * 100));
            statusEl.textContent = `${plot.cropName} is growing... (${progress}%)`;
        } else {
            iconEl.innerHTML = renderIcon('ready_' + plot.cropType, "", mutData);
            statusEl.textContent = "Crop is ready to harvest!";
        }

        // PESTS Warning Override
        if (plot.pestLevel > 0) {
            const levels = ['', 'Light', 'Medium', 'HEAVY'];
            statusEl.innerHTML += `<br><span style="color:red; font-weight:bold;">⚠️ ${levels[plot.pestLevel]} Pests!</span>`;

            // Spray Action
            const hasSpray = countItem('item_pesticide') > 0;
            const sprayBtn = createActionButton(hasSpray ? 'USE BUG SPRAY' : 'NEED SPRAY', hasSpray ? '#e53935' : '#bdbdbd', () => {
                if (!hasSpray) { switchView('shop'); showMessage("Need Bug Spray!"); return; }
                usePesticide(plot);
            });
            actionsEl.appendChild(sprayBtn);
        }

        // Growing Actions
        if (plot.state === 'growing') {
            // Water
            const hasCan = countItem('tool_watering_can') > 0;
            const isWatered = plot.watered || false;
            const waterText = isWatered ? 'WATERED' : (hasCan ? 'WATER' : 'NEED CAN');
            const waterColor = (isWatered || !hasCan) ? '#b0bec5' : '#42a5f5';

            const btnWater = createActionButton(waterText, waterColor, () => {
                if (isWatered) { showMessage("Already watered!"); return; }
                if (!hasCan) { switchView('shop'); showMessage("Buy a Watering Can!"); return; }
                waterPlot(plot);
            });
            actionsEl.appendChild(btnWater);
        }

        // Harvest Action
        if (plot.state === 'ready') {
            const btnHarvest = createActionButton('HARVEST', '#ffd700', async () => {
                await harvestCrop(currentPlotId);
                openPlotDetail(currentPlotId);
            });
            actionsEl.appendChild(btnHarvest);
        }

        // Shovel (Always available to clear)
        const btnShovel = createActionButton('SHOVEL', '#795548', () => {
            openConfirmModal("Destroy crop?", "This will remove the current plant permanently.", () => {
                destroyPlot(currentPlotId);
            });
        });
        actionsEl.appendChild(btnShovel);
    }
}

// Penyiraman disimpan di server (percepat 1 menit, sekali per tanaman)
async function waterPlot(plot) {
    if (plot.busy) return;
    plot.busy = true;
    try {
        const res = await performAction('water', { plotIndex: plot.id });
        if (res && res.success) {
            plot.plantTime = res.plantTime;
            plot.watered = true;
            showMessage("Growth speed up by 1m!");
        } else {
            showMessage((res && res.message) || "Could not water");
        }
    } finally {
        plot.busy = false;
    }
    renderPlotDetail();
    renderPlots();
}

async function usePesticide(plot) {
    if (plot.busy) return;
    plot.busy = true;
    try {
        const res = await performAction('use_spray', { plotIndex: plot.id });
        if (res && res.success) {
            let i = inventory.findIndex(it => it.id === res.sprayId);
            if (i < 0) i = inventory.findIndex(it => it.key === 'item_pesticide');
            if (i > -1) inventory.splice(i, 1);
            plot.pestLevel = 0;
            plot.targetPest = 0;
            showMessage("Pests cleared!");
        } else {
            showMessage((res && res.message) || "Could not use Bug Spray");
        }
    } finally {
        plot.busy = false;
    }
    renderPlotDetail();
    renderPlots();
}

async function destroyPlot(index) {
    const plot = plots[index];
    if (!plot || plot.busy) return;
    plot.busy = true;
    try {
        const res = await performAction('destroy_plot', { plotIndex: plot.id });
        if (res && res.success) {
            Object.assign(plot, emptyPlotFields());
            showMessage("Crop destroyed.");
        } else {
            showMessage((res && res.message) || "Could not destroy crop");
        }
    } finally {
        plot.busy = false;
    }
    renderPlots();
    openPlotDetail(index);
}

// Mutasi cuaca dilempar di server (client hanya menampilkan hasilnya)
function applyMutations(changes) {
    let changed = false;
    changes.forEach(c => {
        const plot = plots.find(p => p.id === c.plotIndex);
        if (!plot) return;
        plot.mutations = { wet: !!c.mutations.wet, shocked: !!c.mutations.shocked };
        (c.added || []).forEach(kind => {
            showMessage(kind === 'wet' ? `Plot #${plot.id + 1} Mutated: WET! 💧` : `Plot #${plot.id + 1} Mutated: SHOCKED! ⚡`);
        });
        changed = true;
    });
    if (!changed) return;
    if (views.farm && views.farm.style.display !== 'none') renderPlots();
    if (currentPlotId !== null && plots[currentPlotId] && views.plotDetail && views.plotDetail.style.display !== 'none') renderPlotDetail();
}

function createActionButton(text, color, onClick) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.style.backgroundColor = color;
    btn.textContent = text;
    btn.onclick = onClick;
    return btn;
}

function attachPlotListeners() {
    plots.forEach((plot, index) => {
        const card = document.getElementById(`plot-card-${index}`);
        if (!card) return;
        card.style.cursor = 'pointer';
        card.onclick = () => openPlotDetail(index);
    });
}

function getPlotHTML(plot) {
    let iconContent = '🟫';
    let statusText = 'Empty';
    let pestOverlay = '';

    if (plot.pestLevel > 0) {
        pestOverlay = `<div style="position:absolute; top:0; right:0; width:20px; height:20px;">${renderIcon('pest_' + plot.pestLevel)}</div>`;
    }

    if (plot.state === 'growing') {
        const mutData = { isWet: plot.mutations?.wet, isShocked: plot.mutations?.shocked };
        iconContent = renderIcon('growing', "", mutData);
        statusText = 'Growing...';
    } else if (plot.state === 'ready') {
        const mutData = { isWet: plot.mutations?.wet, isShocked: plot.mutations?.shocked };
        iconContent = renderIcon('ready_' + plot.cropType, "", mutData);
        statusText = 'READY!';
    } else {
        iconContent = renderIcon('empty_plot');
    }

    const showProgress = plot.state === 'growing' ? 'display:block;' : 'display:none;';

    return `
        <div class="plot-icon ${plot.state}" style="position:relative;">
            ${iconContent}
            ${pestOverlay}
        </div>
        <div class="plot-details">
            <div class="plot-name">PLOT #${plot.id + 1}</div>
            <div class="plot-status">${statusText}</div>
            <div class="progress-container" style="${showProgress}">
                <div class="progress-fill" id="progress-fill-${plot.id}"></div>
            </div>
        </div>
    `;
}



async function plantSeed(index, type) {
    const crop = CROPS[type];
    const plot = plots[index];
    if (!crop || !plot || plot.busy) return;
    if (energy < 1) {
        showMessage("Need 1 Energy!");
        return;
    }
    if (!inventory.some(i => i.key === crop.seedKey)) {
        showMessage("No seeds!");
        return;
    }

    plot.busy = true;
    try {
        // Server memotong bibit + energi dan menentukan waktu tanam / durasi / hama
        const res = await performAction('plant', { plotIndex: plot.id, cropType: type });
        if (res && res.success) {
            let i = inventory.findIndex(it => it.id === res.seedId);
            if (i < 0) i = inventory.findIndex(it => it.key === crop.seedKey);
            if (i > -1) inventory.splice(i, 1);
            Object.assign(plot, normalizePlot(res.plot));
            renderPlots();
            showMessage(`Planted ${crop.name} !`);
        } else {
            showMessage((res && res.message) || "Could not plant");
        }
    } finally {
        plot.busy = false;
    }
}

async function harvestCrop(index) {
    const plot = plots[index];
    if (!plot || plot.busy) return false;
    if (energy < 1) {
        showMessage("Need 1 Energy!");
        return false;
    }

    plot.busy = true;
    try {
        const res = await performAction('harvest', { plotIndex: plot.id });
        if (res && res.success) {
            const it = { id: res.item.id, key: res.item.key, penalty: res.item.penalty || 0 };
            inventory.push(it);
            Object.assign(plot, emptyPlotFields());
            renderPlots();

            const def = ITEMS[it.key];
            let msg = `Got ${def ? def.name : it.key}`;
            if (it.penalty > 0) msg += ` (Damage: -${Math.round(it.penalty * 100)}%)`;
            if (res.mutated) msg = `MUTATION! ${msg} `;
            showMessage(msg);
            return true;
        }
        // Jam browser/server sedikit beda: tanaman belum benar-benar matang
        if (res && res.message === 'Crop is not ready yet') plot.state = 'growing';
        showMessage((res && res.message) || "Harvest failed");
        return false;
    } finally {
        plot.busy = false;
    }
}

async function harvestAll() {
    if (harvestAllBusy) return;
    const ready = plots.filter(p => p.state === 'ready');
    if (ready.length === 0) return;

    // Check energy
    if (energy < ready.length) {
        showMessage(`Need ${ready.length} Energy to harvest all!`);
        return;
    }

    harvestAllBusy = true;
    let done = 0;
    try {
        for (const p of ready) {
            if (await harvestCrop(plots.indexOf(p))) done++;
            else break;
        }
    } finally {
        harvestAllBusy = false;
    }
    if (done > 0) showMessage(`Harvested ${done} crops!`);
}

/* --- INVENTORY LOGIC --- */





function countItem(key) {
    return inventory.filter(i => i.key === key).length;
}

function renderInventory() {
    if (!inventoryListEl) return;
    inventoryListEl.innerHTML = '';
    inventoryListEl.className = 'inventory-container';

    const categoriesMap = {
        'Produce': ['resource'],
        'Seeds \u0026 Bait': ['seed', 'bait'],
        'Tools \u0026 Supplies': ['tool', 'consumable']
    };

    const groupedByCategory = {
        'Produce': {},
        'Seeds \u0026 Bait': {},
        'Tools \u0026 Supplies': {}
    };

    inventory.forEach(item => {
        const itemDef = ITEMS[item.key];
        if (!itemDef) return; // item tak dikenal: lewati, jangan bikin crash
        let category = 'Produce';
        for (const [catName, types] of Object.entries(categoriesMap)) {
            if (types.includes(itemDef.type)) {
                category = catName;
                break;
            }
        }

        const uniqueKey = item.key + (item.penalty ? '_p' + item.penalty : '');
        if (!groupedByCategory[category][uniqueKey]) {
            groupedByCategory[category][uniqueKey] = { ...item, count: 0, rawItems: [] };
        }
        groupedByCategory[category][uniqueKey].count++;
        groupedByCategory[category][uniqueKey].rawItems.push(item);
    });

    for (const [catName, groups] of Object.entries(groupedByCategory)) {
        const sortedGroups = Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));

        if (sortedGroups.length === 0) continue;

        const section = document.createElement('div');
        section.className = 'inventory-section';

        const header = document.createElement('div');
        header.className = 'section-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        header.style.marginTop = '20px';
        header.style.borderBottom = '2px solid #5d4037';
        header.style.paddingBottom = '5px';

        const title = document.createElement('h3');
        title.style.margin = '0';
        title.style.fontSize = '12px';
        title.style.color = '#5d4037';
        title.textContent = catName.toUpperCase();
        header.appendChild(title);

        if (catName === 'Produce') {
            const sellAllBtn = document.createElement('button');
            sellAllBtn.className = 'action-btn';
            sellAllBtn.style.padding = '5px 10px';
            sellAllBtn.style.fontSize = '8px';
            sellAllBtn.style.width = 'auto';
            sellAllBtn.style.margin = '0';
            sellAllBtn.style.background = '#f44336';
            sellAllBtn.style.color = '#fff';
            sellAllBtn.textContent = 'SELL ALL PRODUCE';
            sellAllBtn.onclick = () => {
                const produceIds = [];
                let totalVal = 0;
                inventory.forEach(i => {
                    if (ITEMS[i.key] && ITEMS[i.key].type === 'resource') {
                        produceIds.push(i.id);
                        totalVal += sellValue(i.key, i.penalty) || 0;
                    }
                });
                if (produceIds.length > 0) {
                    openConfirmModal("Sell All Produce?", `Sell ${produceIds.length} items for ${totalVal}g?`, () => {
                        sellAllProduce(produceIds, totalVal);
                    });
                } else {
                    showMessage("No produce to sell!");
                }
            };
            header.appendChild(sellAllBtn);
        }

        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'shop-list';

        sortedGroups.forEach(group => {
            const itemDef = ITEMS[group.key];
            const card = document.createElement('div');
            card.className = 'item-card-compact';
            card.onclick = () => openItemModal(group.key, 'sell', group.rawItems);

            const countDisplay = group.count > 1 ? `<br>x${group.count}` : '';
            const penaltyTag = group.penalty ? `<div class="plot-weight" style="background:#ffbd2e; color:#000; font-weight:bold;">-${group.penalty * 100}%</div>` : '';

            card.innerHTML = `
                <div class="plot-icon">${renderIcon(group.key)}</div>
                <div class="plot-name">${itemDef.name}${group.penalty ? ' (Damaged)' : ''}${countDisplay}</div>
                ${penaltyTag}
            `;
            grid.appendChild(card);
        });

        section.appendChild(grid);
        inventoryListEl.appendChild(section);
    }

    if (inventory.length === 0) {
        inventoryListEl.innerHTML = '<div style="padding:20px; text-align:center; color:#5d4037;">Storage is empty.</div>';
    }
}

async function sellAllProduce(ids) {
    await sellAllItems(ids);
}

async function sellItem(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const res = await performAction('sell_item', { itemId: id });
    if (res && res.success) {
        inventory = inventory.filter(i => i.id !== id);
        renderInventory();
        showMessage(`Sold ${ITEMS[item.key].name} for ${res.value}g`);
    } else {
        showMessage((res && res.message) || "Could not sell item");
    }
}

async function sellAllItems(ids) {
    const res = await performAction('sell_all', { itemIds: ids });
    if (res && res.success) {
        const sold = new Set(res.sold);
        inventory = inventory.filter(i => !sold.has(i.id));
        renderInventory();
        showMessage(`Sold ${res.sold.length} items for ${res.total}g!`);
    } else {
        showMessage((res && res.message) || "Could not sell items");
    }
}


function gameLoop() {
    const now = Date.now();
    const srvNow = nowMs(); // semua hitungan tanaman memakai jam server, bukan jam browser
    plots.forEach((plot, index) => {
        if (plot.state === 'growing') {
            const elapsed = srvNow - plot.plantTime;

            // Pest Trigger: Appears after 40% growth if rolled (diundi & disimpan server)
            if (plot.pestLevel === 0 && plot.targetPest > 0) {
                const progress = elapsed / plot.growthDuration;
                if (progress > 0.4) {
                    plot.pestLevel = plot.targetPest;
                    plot.targetPest = 0; // Clear it so it doesn't trigger again

                    if (views.farm && views.farm.style.display !== 'none') renderPlots();
                    if (currentPlotId === index) renderPlotDetail();

                    const pName = plot.cropName || 'Plot';
                    const types = ['', 'Light', 'Medium', 'HEAVY'];
                    showMessage(`${types[plot.pestLevel]} Pests attacked ${pName} #${index + 1} !`);
                }
            }

            // Check if finished
            if (elapsed >= plot.growthDuration) {
                if (plot.state !== 'ready') {
                    plot.state = 'ready';

                    // Refresh Farm List if visible
                    if (views.farm && views.farm.style.display !== 'none') renderPlots();

                    // Refresh Detail View if looking at this plot
                    if (views.plotDetail && views.plotDetail.style.display !== 'none' && currentPlotId === index) {
                        renderPlotDetail();
                    }
                }
            } else {
                // Update Progress Text
                const progress = Math.min(100, Math.floor((elapsed / plot.growthDuration) * 100));

                // 1. Update List Card
                if (views.farm && views.farm.style.display !== 'none') {
                    const statusEl = document.querySelector(`#plot-card-${index} .plot-status`);
                    const progressFill = document.getElementById(`progress-fill-${plot.id}`);

                    if (statusEl) {
                        statusEl.innerHTML = `Growing: ${progress}%`;
                        if (plot.pestLevel > 0) {
                            const pestIcons = ['', 'Light 🐜', 'MED 🪲', 'HEAVY 🦗'];
                            statusEl.innerHTML += ` <span style="color:${plot.pestLevel === 3 ? 'red' : (plot.pestLevel === 2 ? 'orange' : 'yellow')}; font-size:9px;">${pestIcons[plot.pestLevel]}</span>`;
                        }
                    }

                    if (progressFill) {
                        progressFill.style.width = `${progress}%`;
                    }
                }

                // 2. Update Detail View
                if (views.plotDetail && views.plotDetail.style.display !== 'none' && currentPlotId === index) {
                    const detailStatusEl = document.getElementById('plot-detail-status');
                    if (detailStatusEl) {
                        const pestIcons = ['', '(Light Pests)', '(Medium Pests)', '(HEAVY PESTS)'];
                        const pestText = plot.pestLevel > 0 ? `<br><span style="color:#e53935;">⚠️ ${pestIcons[plot.pestLevel]}</span>` : '';
                        detailStatusEl.innerHTML = `${plot.cropName} is growing... (${progress}%) ${pestText}`;
                    }
                }
            }
        }
    });

    // --- Weather Mutation Heartbeat (Every 10 seconds): diundi di server ---
    if (now - last_mutation_heartbeat > 10000) {
        last_mutation_heartbeat = now;
        if (current_weather !== 'clear' && !weatherTickBusy && plots.some(p => p.state === 'growing')) {
            weatherTickBusy = true;
            performAction('weather_tick', {})
                .then(res => { if (res && res.success && res.changes && res.changes.length) applyMutations(res.changes); })
                .catch(() => { })
                .finally(() => { weatherTickBusy = false; });
        }
    }

    // --- Deterministic Scheduled Weather System ---
    const scheduled = getScheduledWeather();
    if (scheduled !== current_weather) {
        const oldWeather = current_weather;
        updateWeather(scheduled);

        let msg = "";
        if (scheduled === 'rain') msg = "It started raining! 🌧️";
        else if (scheduled === 'thunder') msg = "A thunderstorm has arrived! ⛈️⚡";
        else if (oldWeather !== 'clear') msg = "The weather has cleared. ☀️";

        if (msg) showMessage(msg);
    }

    // Thunder Logic: Lightning every 10 seconds
    if (current_weather === 'thunder' && now - last_flash_time > 10000) {
        last_flash_time = now;
        triggerLightning();
    }

    requestAnimationFrame(gameLoop);
}

function renderQuests() {
    const list = document.getElementById('quest-list');
    if (!list) return;
    list.innerHTML = '';

    if (quests.length === 0) {
        list.innerHTML = '<div class="plot-card">No quests available today.</div>';
        return;
    }

    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = 'plot-card' + (q.completed ? ' completed' : '');
        card.style.width = '100%';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'stretch';
        card.style.gap = '5px';
        card.style.textAlign = 'left';

        const progressPercent = Math.min(100, (q.progress / q.target) * 100);

        let actionBtn = '';
        if (q.completed && !q.claimed) {
            actionBtn = `<button class="action-btn" onclick="claimQuestReward(${q.id})" style="background:#81c784; width:100%; margin-top:10px;">CLAIM ${q.reward} G</button>`;
        } else if (q.claimed) {
            actionBtn = `<button class="action-btn" disabled style="background:#cfd8dc; width:100%; margin-top:10px; cursor:default;">CLAIMED</button>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <div style="font-size:10px; font-weight:bold; color:#3e2723;">${q.desc}</div>
                <div style="font-size:8px; color:#1b5e20;">${q.reward} G</div>
            </div>
            <div style="font-size:8px; color:#5d4037; margin-bottom:5px;">Progress: ${q.progress} / ${q.target}</div>
            <div class="progress-bar" style="width:100%; height:8px; background:#efebe9; border:1px solid #d7ccc8; border-radius:4px; overflow:hidden;">
                <div style="width:${progressPercent}%; height:100%; background:${q.completed ? '#4caf50' : '#ffa726'}; transition: width 0.3s;"></div>
            </div>
            ${actionBtn}
        `;
        list.appendChild(card);
    });
}

async function buyItem(itemKey, count = 1) {
    const item = ITEMS[itemKey];
    if (!item) return false;
    if (item.type === 'upgrade') return upgradeEnergy(count);

    if (item.type === 'tool' && countItem(itemKey) > 0) {
        showMessage("Already owned!");
        return false;
    }
    if (gold < item.price * count) {
        showMessage("Not enough gold!", '❌');
        return false;
    }

    // Harga dihitung & dipotong di server; item baru memakai id dari server
    const res = await performAction('buy_item', { itemKey, qty: count });
    if (res && res.success) {
        res.items.forEach(it => inventory.push({ id: it.id, key: it.key, penalty: 0 }));
        return true;
    }
    showMessage((res && res.message) || "Purchase failed", '❌');
    return false;
}

async function upgradeEnergy(count) {
    const price = ITEMS.item_energy_boost.price * count;
    if (gold < price) {
        showMessage("Not enough gold!", '❌');
        return false;
    }
    const res = await performAction('upgrade_energy', { qty: count });
    if (res && res.success) return true;
    showMessage((res && res.message) || "Upgrade failed", '❌');
    return false;
}

async function claimQuestReward(questId) {
    try {
        const res = await performAction('claim_quest', { questId });
        if (res && res.success) {
            quests = res.quests;
            renderQuests();
            showMessage(`Claimed ${res.reward} Gold!`);
        } else {
            showMessage("Error: " + ((res && res.message) || "Unknown"));
        }
    } catch (e) {
        showMessage("Connection error");
    }
}

// Backend Integration
// Backend Integration
// Guest State
let isGuest = false;

// Backend Integration
// Semua aksi ke server dijalankan berurutan. Tanpa ini, dua aksi cepat (mis. dua kali jual) bisa
// sampai ke server terbalik urutannya, lalu gold lama menimpa gold baru.
var actionQueue = null;
async function performAction(action, payload) {
    // Guest Mode Interception
    if (isGuest) {
        return mockBackendAction(action, payload).then(processActionResult);
    }
    const run = () => performActionNow(action, payload);
    const result = (actionQueue || Promise.resolve()).then(run, run);
    actionQueue = result.catch(() => { });
    return result;
}

async function performActionNow(action, payload) {
    if (!authToken && action !== 'login' && action !== 'register') {
        return { success: false, message: 'Not logged in' };
    }

    let text;
    try {
        const body = { action, token: authToken, ...payload };
        // Timeout 20 detik supaya satu request yang macet tidak menahan seluruh antrean
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        let response;
        try {
            response = await fetch('/api/backend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: ctrl.signal
            });
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) throw new Error(response.statusText || `HTTP ${response.status}`);
        text = await response.text();
    } catch (e) {
        console.error("Action failed", e);
        return { success: false, message: e.name === 'AbortError' ? 'Request timed out' : e.message };
    }

    let res;
    try {
        res = JSON.parse(text);
    } catch (e) {
        console.error("JSON Error", text);
        return { success: false, message: 'Bad response from server' };
    }

    // Session Expired?
    if (res.message === "Invalid Session" || res.message === "Not logged in") {
        handleLogout(false);
    }
    return processActionResult(res);
}

// Dipakai server asli DAN mode tamu: sinkronkan jam & angka resmi (gold, energi) + quest
function processActionResult(res) {
    if (res.serverTime) serverTimeOffset = res.serverTime - Date.now();
    if (res.user) applyUser(res.user);
    if (res.quests) {
        quests = res.quests;
        if (document.getElementById('quests-view')?.style.display === 'block') {
            renderQuests();
        }
    }
    return res;
}

// --- GUEST MODE LOGIC ---
let guestState = null;

async function handleGuestLogin() {
    isGuest = true;
    authUser = "GUEST";
    document.getElementById('auth-modal').style.display = 'none';
    document.querySelector('.user-name').textContent = authUser;
    if (document.getElementById('farm-title')) {
        document.getElementById('farm-title').textContent = `${authUser}'S FARM`;
    }

    // Init Guest State (meniru data server; hilang saat halaman ditutup)
    const baitKeys = ['bait_grasshopper', 'bait_caterpillar', 'bait_spider'];
    const randomBaits = [];
    for (let i = 0; i < 2; i++) {
        const rKey = baitKeys[Math.floor(Math.random() * baitKeys.length)];
        randomBaits.push({ id: 4 + i, key: rKey, penalty: 0 });
    }

    guestState = {
        user: {
            username: 'Guest Farmer',
            gold: 25,
            energy: 30,
            maxEnergy: 30,
            fishCaught: 0,
            lastRegen: Date.now(),
            pendingFish: null,
            pendingFishAt: 0
        },
        plots: [{ id: 0, ...emptyPlotFields() }],
        inventory: [
            { id: 1, key: 'seeds_wheat', penalty: 0 },
            { id: 2, key: 'seeds_wheat', penalty: 0 },
            { id: 3, key: 'seeds_wheat', penalty: 0 },
            ...randomBaits
        ],
        quests: [
            { id: 1, type: 'plant', target: 5, reward: 5, desc: 'Plant 5 seeds on your farm.', progress: 0, completed: false, claimed: false },
            { id: 2, type: 'harvest', target: 10, reward: 15, desc: 'Harvest 10 mature crops.', progress: 0, completed: false, claimed: false },
            { id: 3, type: 'fish', target: 3, reward: 2, desc: 'Catch 3 fish from the river.', progress: 0, completed: false, claimed: false },
            { id: 4, type: 'search_bait', target: 5, reward: 3, desc: 'Search for bait in the thicket 5 times.', progress: 0, completed: false, claimed: false }
        ],
        nextId: 6
    };

    await loadGame();
    // Rendering handled by loadGame now
}

// Data & undian untuk mode tamu. Server asli punya salinannya di src/gamedata.js
const GUEST_FISH = {
    fish_rainbow: { tier: 1, difficulty: 5 },
    fish_archer: { tier: 2, difficulty: 7 },
    fish_snakehead: { tier: 3, difficulty: 10 },
    fish_gourami: { tier: 4, difficulty: 12 },
    fish_wallago: { tier: 5, difficulty: 17 }
};
const GUEST_FISH_BY_TIER = ['', 'fish_rainbow', 'fish_archer', 'fish_snakehead', 'fish_gourami', 'fish_wallago'];
const GUEST_ROD_CAPACITY = { tool_fishing_rod: 2, tool_silver_rod: 5 };
const GUEST_PEST_PENALTY = [0, 0.2, 0.5, 0.8];

function guestTierOf(r) { return r < 50 ? 1 : r < 70 ? 2 : r < 85 ? 3 : r < 95 ? 4 : 5; }

function guestRollFish(bonus, capacity) {
    const natural = Math.random() * 100;
    const naturalTier = guestTierOf(natural);
    if (naturalTier > capacity) return { key: GUEST_FISH_BY_TIER[naturalTier], snapped: true };
    return { key: GUEST_FISH_BY_TIER[Math.min(guestTierOf(natural + bonus), capacity)], snapped: false };
}

function guestRollBait() {
    const r = Math.random() * 100;
    if (r < 20) return 'bait_spider';
    if (r < 40) return 'bait_caterpillar';
    if (r < 80) return 'bait_grasshopper';
    return null;
}

function guestRollPest() {
    const r = Math.random() * 100;
    if (r < 1) return 3;
    if (r < 3) return 2;
    if (r < 8) return 1;
    return 0;
}

function guestEffectivePest(p, srvNow) {
    let level = p.pestLevel || 0;
    let target = p.targetPest || 0;
    if (p.state === 'growing' && level === 0 && target > 0 && p.growthDuration > 0 &&
        (srvNow - p.plantTime) / p.growthDuration > 0.4) {
        level = target;
        target = 0;
    }
    return { level, target };
}

function guestRegen() {
    const u = guestState.user;
    const now = Date.now();
    if (u.energy >= u.maxEnergy) { u.lastRegen = now; return; }
    const d = Math.floor((now - u.lastRegen) / 60000);
    if (d > 0) {
        u.energy = Math.min(u.maxEnergy, u.energy + d);
        u.lastRegen += d * 60000;
        if (u.energy >= u.maxEnergy) u.lastRegen = now;
    }
}

// Meniru server: bentuk balasan sama persis, jadi seluruh kode game tidak perlu tahu bedanya
function mockBackendAction(action, payload) {
    const g = guestState;
    const u = g.user;
    guestRegen();
    const now = Date.now();
    const res = { success: true };

    const finish = () => {
        res.user = { gold: u.gold, energy: u.energy, maxEnergy: u.maxEnergy, lastUpdated: Math.floor(u.lastRegen / 1000) };
        res.serverTime = now;
        return Promise.resolve(res);
    };
    const bad = (msg) => { res.success = false; res.message = msg; return finish(); };
    const spendEnergy = (n) => { if (u.energy < n) return false; u.energy -= n; return true; };
    const addItem = (key, penalty = 0) => { const it = { id: g.nextId++, key, penalty }; g.inventory.push(it); return it; };
    const takeItem = (key) => { const i = g.inventory.findIndex(x => x.key === key); return i > -1 ? g.inventory.splice(i, 1)[0] : null; };
    const hasItem = (key) => g.inventory.some(x => x.key === key);
    const plotBy = (idx) => g.plots.find(p => p.id === Number(payload.plotIndex !== undefined ? payload.plotIndex : idx));
    const bump = (type) => {
        const qst = g.quests.find(x => x.type === type);
        if (qst && !qst.completed) {
            qst.progress++;
            if (qst.progress >= qst.target) qst.completed = true;
        }
        res.quests = g.quests;
    };
    const copy = (o) => JSON.parse(JSON.stringify(o));

    switch (action) {
        case 'init':
            return Promise.resolve({
                success: true,
                data: {
                    user: { gold: u.gold, energy: u.energy, maxEnergy: u.maxEnergy, lastUpdated: Math.floor(u.lastRegen / 1000) },
                    plots: copy(g.plots),
                    inventory: copy(g.inventory),
                    quests: g.quests,
                    serverTime: now
                }
            });

        case 'plant': {
            const crop = CROPS[payload.cropType];
            const p = plotBy();
            if (!crop || !p) return bad('Plot not found');
            if (p.state !== 'empty') return bad('Plot is not empty');
            if (!hasItem(crop.seedKey)) return bad('No seeds!');
            if (!spendEnergy(1)) return bad('Need 1 Energy!');
            const seed = takeItem(crop.seedKey);
            Object.assign(p, {
                state: 'growing', cropType: payload.cropType, cropName: crop.name, plantTime: now,
                growthDuration: crop.duration, pestLevel: 0, targetPest: guestRollPest(), watered: false,
                mutations: { wet: false, shocked: false }
            });
            bump('plant');
            res.seedId = seed.id;
            res.plot = copy(p);
            return finish();
        }

        case 'harvest': {
            const p = plotBy();
            if (!p || p.state !== 'growing') return bad('Nothing to harvest');
            if (now - p.plantTime < p.growthDuration - 1000) return bad('Crop is not ready yet');
            if (!spendEnergy(1)) return bad('Need 1 Energy!');
            const pest = guestEffectivePest(p, now);
            const penalty = GUEST_PEST_PENALTY[pest.level] || 0;
            let key = CROPS[p.cropType].resultKey;
            if (p.mutations.wet && p.mutations.shocked) key += '_wet_shocked';
            else if (p.mutations.shocked) key += '_shocked';
            else if (p.mutations.wet) key += '_wet';
            const it = addItem(key, penalty);
            res.item = { ...it };
            res.mutated = p.mutations.wet || p.mutations.shocked;
            Object.assign(p, emptyPlotFields());
            bump('harvest');
            return finish();
        }

        case 'water': {
            const p = plotBy();
            if (!p || p.state !== 'growing') return bad('Nothing is growing here');
            if (p.watered) return bad('Already watered!');
            if (!hasItem('tool_watering_can')) return bad('Buy a Watering Can!');
            p.plantTime -= 60000;
            p.watered = true;
            res.plantTime = p.plantTime;
            return finish();
        }

        case 'use_spray': {
            const p = plotBy();
            if (!p || p.state !== 'growing') return bad('Nothing is growing here');
            if (guestEffectivePest(p, now).level === 0) return bad('No pests here');
            const spray = takeItem('item_pesticide');
            if (!spray) return bad('Need Bug Spray!');
            p.pestLevel = 0;
            p.targetPest = 0;
            res.sprayId = spray.id;
            return finish();
        }

        case 'destroy_plot': {
            const p = plotBy();
            if (p) Object.assign(p, emptyPlotFields());
            return finish();
        }

        case 'weather_tick': {
            const w = weatherAtMs(now);
            res.weather = w;
            res.changes = [];
            if (w === 'clear') return finish();
            g.plots.forEach(p => {
                if (p.state !== 'growing') return;
                const added = [];
                if (!p.mutations.wet && Math.random() < 0.2) { p.mutations.wet = true; added.push('wet'); }
                if (!p.mutations.shocked && w === 'thunder' && Math.random() < 0.15) { p.mutations.shocked = true; added.push('shocked'); }
                if (added.length) res.changes.push({ plotIndex: p.id, mutations: { ...p.mutations }, added });
            });
            return finish();
        }

        case 'buy_item': {
            const item = ITEMS[payload.itemKey];
            if (!item || item.type === 'upgrade' || !item.price) return bad('This item is not for sale');
            const n = item.type === 'tool' ? 1 : Math.min(99, Math.max(1, parseInt(payload.qty, 10) || 1));
            if (item.type === 'tool' && hasItem(payload.itemKey)) return bad('Already owned!');
            if (u.gold < item.price * n) return bad('Not enough gold!');
            u.gold -= item.price * n;
            res.items = [];
            for (let i = 0; i < n; i++) res.items.push({ id: addItem(payload.itemKey).id, key: payload.itemKey });
            return finish();
        }

        case 'upgrade_energy': {
            const n = Math.min(99, Math.max(1, parseInt(payload.qty, 10) || 1));
            const price = ITEMS.item_energy_boost.price * n;
            if (u.gold < price) return bad('Not enough gold!');
            u.gold -= price;
            u.maxEnergy += n;
            u.energy += n;
            res.new_max_energy = u.maxEnergy;
            res.message = 'Max Energy increased!';
            return finish();
        }

        case 'sell_item': {
            const i = g.inventory.findIndex(x => x.id === Number(payload.itemId));
            if (i < 0) return bad('Item not found');
            const value = sellValue(g.inventory[i].key, g.inventory[i].penalty);
            if (value === null) return bad('This item cannot be sold');
            g.inventory.splice(i, 1);
            u.gold += value;
            res.value = value;
            return finish();
        }

        case 'sell_all': {
            const ids = new Set((payload.itemIds || []).map(Number));
            const rows = g.inventory.filter(x => ids.has(x.id));
            if (rows.length === 0) return bad('Items not found');
            let total = 0;
            for (const r of rows) {
                const v = sellValue(r.key, r.penalty);
                if (v === null) return bad('Some items cannot be sold');
                total += v;
            }
            g.inventory = g.inventory.filter(x => !ids.has(x.id));
            u.gold += total;
            res.sold = rows.map(r => r.id);
            res.total = total;
            return finish();
        }

        case 'buy_land': {
            if (g.plots.length >= MAX_PLOTS) return bad('You already own the maximum number of plots!');
            const cost = 250 * Math.pow(2, g.plots.length - 1);
            if (u.gold < cost) return bad('Not enough gold!');
            u.gold -= cost;
            const plot = { id: g.plots.length, ...emptyPlotFields() };
            g.plots.push(plot);
            res.plot = copy(plot);
            return finish();
        }

        case 'search_bait': {
            if (!spendEnergy(1)) return bad('Need 1 Energy!');
            const key = guestRollBait();
            res.found = key;
            res.item = null;
            if (key) {
                res.item = { ...addItem(key) };
                bump('search_bait');
            }
            return finish();
        }

        case 'cast_rod': {
            const rods = g.inventory.filter(x => GUEST_ROD_CAPACITY[x.key]);
            if (rods.length === 0) return bad('Need a Rod (Check Shop)!');
            const capacity = Math.max(...rods.map(r => GUEST_ROD_CAPACITY[r.key]));
            if (!spendEnergy(2)) return bad('Need 2 Energy!');
            let bonus = 0;
            if (payload.baitId) {
                const i = g.inventory.findIndex(x => x.id === Number(payload.baitId) && ITEMS[x.key] && ITEMS[x.key].type === 'bait');
                if (i < 0) { u.energy += 2; return bad('Bait not found'); }
                bonus = ITEMS[g.inventory[i].key].bonus || 0;
                res.baitUsed = g.inventory[i].id;
                g.inventory.splice(i, 1);
            }
            const fish = guestRollFish(bonus, capacity);
            u.pendingFish = fish.snapped ? null : fish.key;
            u.pendingFishAt = now;
            res.fishKey = fish.key;
            res.snapped = fish.snapped;
            res.difficulty = GUEST_FISH[fish.key].difficulty;
            return finish();
        }

        case 'resolve_fish': {
            if (!u.pendingFish) return bad('No fish on the line');
            if (now - u.pendingFishAt < 3500) return bad('That was too fast!');
            const key = u.pendingFish;
            u.pendingFish = null;
            u.fishCaught++;
            res.fishKey = key;
            res.choice = payload.choice === 'sell' ? 'sell' : 'keep';
            if (res.choice === 'sell') {
                res.value = sellValue(key, 0);
                u.gold += res.value;
            } else {
                res.item = { ...addItem(key) };
            }
            bump('fish');
            return finish();
        }

        case 'claim_quest': {
            const qst = g.quests.find(x => x.id === Number(payload.questId));
            if (!qst || !qst.completed || qst.claimed) return bad('Quest not ready to claim');
            qst.claimed = true;
            u.gold += qst.reward;
            res.reward = qst.reward;
            res.quests = g.quests;
            return finish();
        }

        case 'get_profile':
            res.profile = {
                username: u.username || authUser || 'GUEST',
                gold: u.gold,
                fish_caught: u.fishCaught || 0,
                energy: u.energy,
                max_energy: u.maxEnergy,
                avatar: null,
                current_title: null
            };
            return finish();

        case 'get_titles':
            res.titles = [];
            return finish();

        default:
            return finish(); // equip_title, logout, dll: tidak ada efek di mode tamu
    }
}

// --- AUTH FUNCTIONS ---

function showAuthState(state) {
    const loginActions = document.getElementById('login-actions');
    const registerActions = document.getElementById('register-actions');
    const forgotActions = document.getElementById('forgot-actions');
    const resetActions = document.getElementById('reset-actions');
    const emailInput = document.getElementById('auth-email');
    const userInput = document.getElementById('auth-username');
    const passInput = document.getElementById('auth-password');
    const authMsg = document.getElementById('auth-msg');

    authMsg.textContent = "";
    authMsg.style.color = 'red';

    // Hide all actions
    [loginActions, registerActions, forgotActions, resetActions].forEach(el => el.style.display = 'none');

    // Default visibility
    emailInput.style.display = 'none';
    userInput.style.display = 'block';
    passInput.style.display = 'block';

    if (state === 'login') {
        loginActions.style.display = 'block';
    } else if (state === 'register') {
        registerActions.style.display = 'block';
        emailInput.style.display = 'block';
    } else if (state === 'forgot') {
        forgotActions.style.display = 'block';
        emailInput.style.display = 'block';
        userInput.style.display = 'none';
        passInput.style.display = 'none';
    } else if (state === 'reset') {
        resetActions.style.display = 'block';
        userInput.style.display = 'none';
        emailInput.style.display = 'none';
    }
}

async function handleLogin() {
    const u = document.getElementById('auth-username').value;
    const p = document.getElementById('auth-password').value;
    const msg = document.getElementById('auth-msg');

    if (!u || !p) { msg.textContent = "Please enter username and password"; return; }
    if (!/^[a-z0-9]+$/i.test(u)) { msg.textContent = "Username only letters and numbers!"; return; }

    msg.textContent = "Logging in...";

    try {
        const response = await fetch('/api/backend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', username: u, password: p })
        });

        const res = await response.json();
        if (res.success) {
            authToken = res.token;
            authUser = res.username;
            isGuest = false; // MUST reset guest flag
            localStorage.setItem('farm_token', authToken);
            localStorage.setItem('farm_user', authUser);

            document.getElementById('auth-modal').style.display = 'none';
            document.querySelector('.user-name').textContent = authUser.toUpperCase();
            if (document.getElementById('farm-title')) {
                document.getElementById('farm-title').textContent = `${authUser.toUpperCase()}'S FARM`;
            }

            await loadGame();
            renderPlots();
            updateStats();
        } else {
            msg.textContent = res.message;
        }
    } catch (e) {
        msg.textContent = "Error: " + e.message;
    }
}

async function handleRegister() {
    const u = document.getElementById('auth-username').value;
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-password').value;
    const msg = document.getElementById('auth-msg');

    if (!u || !e || !p) { msg.textContent = "Need username, email and password"; return; }
    if (!/^[a-z0-9]+$/i.test(u)) { msg.textContent = "Username only letters and numbers!"; return; }

    if (p.length < 6) { msg.textContent = "Password too short (min 6 characters)!"; return; }
    if (e.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { msg.textContent = "Invalid email address!"; return; }

    msg.textContent = "Creating account...";

    try {
        const response = await fetch('/api/backend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'register', username: u, email: e, password: p })
        });

        const res = await response.json();
        if (res.success) {
            isGuest = false; // Reset guest if they just registered
            msg.textContent = res.message;
            msg.style.color = 'green';
            setTimeout(() => showAuthState('login'), 2000);
        } else {
            msg.textContent = res.message;
            msg.style.color = 'red';
        }
    } catch (e) {
        msg.textContent = "Error: " + e.message;
    }
}

async function handleForgot() {
    const e = document.getElementById('auth-email').value;
    const msg = document.getElementById('auth-msg');

    if (!e) { msg.textContent = "Enter your email address"; return; }

    msg.textContent = "Checking...";

    try {
        const response = await fetch('/api/backend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'forgot_password', email: e })
        });
        const res = await response.json();
        msg.textContent = res.message;
        msg.style.color = res.success ? 'green' : 'red';
    } catch (err) {
        msg.textContent = "Error sending request";
    }
}

async function handleReset() {
    const p = document.getElementById('auth-password').value;
    const msg = document.getElementById('auth-msg');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('reset_token');

    if (!p) { msg.textContent = "Enter a new password"; return; }
    if (!token) { msg.textContent = "Missing reset token"; return; }

    try {
        const response = await fetch('/api/backend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset_password', token: token, password: p })
        });
        const res = await response.json();
        msg.textContent = res.message;
        msg.style.color = res.success ? 'green' : 'red';
        if (res.success) {
            setTimeout(() => {
                window.history.replaceState({}, document.title, window.location.pathname);
                showAuthState('login');
            }, 3000);
        }
    } catch (err) {
        msg.textContent = "Error resetting password";
    }
}

/* --- POPUP MODAL LOGIC --- */
let currentModalItem = null;
let currentModalRawItems = [];

function openItemModal(itemKey, mode, items = []) {
    const item = ITEMS[itemKey];
    currentModalItem = itemKey;
    currentModalRawItems = items;

    const modal = document.getElementById('item-modal');
    const nameEl = document.getElementById('modal-item-name');
    const descEl = document.getElementById('modal-item-desc');
    const priceEl = document.getElementById('modal-item-price');
    const iconEl = document.getElementById('modal-item-icon');
    const buyControls = document.getElementById('modal-buy-controls');
    const sellControls = document.getElementById('modal-sell-controls');
    const qtyInput = document.getElementById('buy-qty');

    nameEl.textContent = item.name + (items[0] && items[0].penalty ? ' (Damaged)' : '');
    descEl.textContent = item.description;
    iconEl.innerHTML = renderIcon(itemKey);
    const qtyGroup = modal.querySelector('.qty-input-group');
    qtyInput.value = 1;

    // Tool (pancing, penyiram) cukup satu
    if (qtyGroup) qtyGroup.style.display = item.type === 'tool' ? 'none' : 'flex';

    if (mode === 'buy') {
        buyControls.style.display = 'block';
        sellControls.style.display = 'none';
        priceEl.textContent = `Price: ${item.price} G`;
        updateModalTotalPrice();

        document.getElementById('btn-modal-buy').onclick = async () => {
            if (buyBusy) return;
            const n = item.type === 'tool' ? 1 : getQty();
            if (gold < item.price * n) {
                showMessage("Not enough Gold!");
                return;
            }
            buyBusy = true;
            try {
                if (await buyItem(itemKey, n)) {
                    updateStats(); renderShop(); closeItemModal();
                    showMessage(`Bought ${n}x ${item.name} !`);
                }
            } finally {
                buyBusy = false;
            }
        };
    } else {
        buyControls.style.display = 'none';

        const unitValue = items[0] ? sellValue(itemKey, items[0].penalty) : null;
        if (unitValue === null) {
            sellControls.style.display = 'none';
            priceEl.textContent = "This item cannot be sold.";
        } else {
            sellControls.style.display = 'block';
            priceEl.textContent = `Value: ${unitValue} G each`;

            document.getElementById('btn-modal-sell').onclick = () => {
                sellItem(items[0].id);
                closeItemModal();
            };
            document.getElementById('btn-modal-sell-all').onclick = () => {
                sellAllItems(items.map(i => i.id));
                closeItemModal();
            };
        }
    }
    modal.style.display = 'flex';
}

function closeItemModal() {
    document.getElementById('item-modal').style.display = 'none';
}

function changeQty(delta) {
    const input = document.getElementById('buy-qty');
    input.value = Math.min(99, Math.max(1, getQty() + delta));
    updateModalTotalPrice();
}

function updateModalTotalPrice() {
    const item = ITEMS[currentModalItem];
    if (!item) return;
    const n = item.type === 'tool' ? 1 : getQty();
    const total = (item.price || 0) * n;
    document.getElementById('btn-modal-buy').textContent = `BUY(Total: ${total} G)`;
}

document.getElementById('buy-qty').addEventListener('input', updateModalTotalPrice);
document.getElementById('buy-qty').addEventListener('change', () => {
    document.getElementById('buy-qty').value = getQty();
    updateModalTotalPrice();
});

/* --- CONFIRM MODAL --- */
function openConfirmModal(title, desc, onConfirm) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-desc').textContent = desc;
    document.getElementById('btn-confirm-yes').onclick = () => {
        onConfirm();
        closeConfirmModal();
    };
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

async function handleLogout(arg) {
    // Beritahu server supaya token benar-benar dicabut (kecuali dipanggil karena sesi sudah tidak valid)
    if (arg !== false && authToken && !isGuest) {
        try {
            await Promise.race([
                fetch('/api/backend', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout', token: authToken })
                }),
                new Promise(resolve => setTimeout(resolve, 2000))
            ]);
        } catch (e) { /* tetap logout di browser */ }
    }
    localStorage.removeItem('farm_token');
    localStorage.removeItem('farm_user');
    location.reload();
}



/* --- LEADERBOARD SYSTEM --- */
async function loadLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        const json = await res.json();
        if (json.success) {
            renderLeaderboard('gold', json.gold_leaderboard);
            renderLeaderboard('fish', json.fish_leaderboard);
        }
    } catch (e) { console.error("Leaderboard Error", e); }
}

function renderLeaderboard(type, data) {
    const container = document.getElementById(`lb-${type}-container`);
    if (!container) return;
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">No rankings yet!</div>';
        return;
    }

    data.forEach((player, idx) => {
        const row = document.createElement('div');
        row.className = 'lb-row';
        row.style.cursor = 'pointer';
        row.onclick = () => switchView('profile', player.username);
        const val = player.gold !== undefined ? `${player.gold} G` : `${player.fish_caught} Fish`;
        row.innerHTML = `
            <div class="lb-rank">#${idx + 1}</div>
            <div class="lb-username">${player.username}</div>
            <div class="lb-value">${val}</div>
        `;
        container.appendChild(row);
    });
}

function switchLeaderboardTab(target) {
    const btnGold = document.getElementById('btn-lb-gold');
    const btnFish = document.getElementById('btn-lb-fish');
    const contGold = document.getElementById('lb-gold-container');
    const contFish = document.getElementById('lb-fish-container');

    if (target === 'gold') {
        btnGold.classList.add('active');
        btnFish.classList.remove('active');
        contGold.style.display = 'block';
        contFish.style.display = 'none';
    } else {
        btnGold.classList.remove('active');
        btnFish.classList.add('active');
        contGold.style.display = 'none';
        contFish.style.display = 'block';
    }
}

// Event Listeners for Leaderboard Tabs
document.getElementById('btn-lb-gold').onclick = () => switchLeaderboardTab('gold');
document.getElementById('btn-lb-fish').onclick = () => switchLeaderboardTab('fish');

// Override switchView to load leaderboard
const originalSwitchView = switchView;
switchView = function (viewName) {
    if (viewName === 'leaderboard') {
        loadLeaderboard();
    }
    originalSwitchView(viewName);
};

/* --- PROFILE SYSTEM --- */
async function loadUserProfile(targetUsername = null) {
    try {
        const payload = targetUsername ? { username: targetUsername } : {};
        const json = await performAction('get_profile', payload);
        if (json && json.success) {
            renderUserProfile(json.profile);
        } else {
            showMessage("Profile Error: " + (json.message || "Unknown error"));
            switchView('farm');
        }
    } catch (e) {
        console.error("Profile Error", e);
    }
}

function renderUserProfile(profile) {
    document.getElementById('prof-username').textContent = profile.username;
    document.getElementById('prof-gold').textContent = `${profile.gold} G`;
    document.getElementById('prof-fish').textContent = profile.fish_caught;
    document.getElementById('prof-energy').textContent = `${profile.energy}/${profile.max_energy}`;
    document.getElementById('prof-title').textContent = profile.current_title || 'No Title';

    // Avatar
    const img = document.getElementById('prof-avatar-img');
    if (img) {
        img.src = profile.avatar ? profile.avatar + '?t=' + Date.now() : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }

    // Own Profile Specifics
    const isOwn = profile.username === authUser;

    // Hide upload button if not viewing own profile
    const uploadBtn = document.getElementById('prof-upload-btn');
    if (uploadBtn) {
        uploadBtn.style.display = isOwn ? 'block' : 'none';
    }

    // Title selection
    const titleSection = document.getElementById('prof-title-selection');
    if (titleSection) {
        titleSection.style.display = isOwn ? 'block' : 'none';
        if (isOwn) loadAvailableTitles();
    }

    // Update title too
    const title = document.querySelector('#profile-view .location-title');
    if (title) title.textContent = `${profile.username.toUpperCase()}'S PROFILE`;
}

// Override switchView again to handle profile loading
const finalSwitchView = switchView;
switchView = function (viewName, extra = null) {
    if (viewName === 'profile') {
        loadUserProfile(extra); // extra could be a username from chat/leaderboard
    }
    finalSwitchView(viewName);
};

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showMessage("File too large! Max 2MB.");
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('token', authToken);
    e.target.value = ''; // supaya file yang sama bisa dipilih lagi

    try {
        const res = await fetch('/api/upload-avatar', {
            method: 'POST',
            body: formData
        });
        const json = await res.json();
        if (json.success) {
            showMessage("Avatar updated!");
            // Refresh profile view
            loadUserProfile();
        } else {
            showMessage(json.message);
        }
    } catch (err) {
        console.error("Upload failed", err);
        showMessage("Upload failed");
    }
}

async function loadAvailableTitles() {
    const json = await performAction('get_titles');
    if (json && json.success) {
        renderTitleList(json.titles);
    }
}

function renderTitleList(titles) {
    const list = document.getElementById('title-list');
    if (!list) return;
    list.innerHTML = '';

    // None option
    const noneItem = document.createElement('div');
    noneItem.style.cssText = 'padding: 8px; font-size: 8px; border-bottom: 1px solid #ccc; cursor: pointer; text-align: center;';
    noneItem.innerHTML = '<strong>[NONE]</strong>';
    noneItem.onclick = () => equipTitle('');
    list.appendChild(noneItem);

    titles.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = `padding: 8px; font-size: 8px; border-bottom: 1px solid #ccc; text-align: center; ${t.owned ? 'cursor: pointer; background: #e8f5e9;' : 'opacity: 0.5; cursor: not-allowed;'}`;

        let req = '';
        if (t.req_gold > 0) req = `(Req: ${t.req_gold}G)`;
        if (t.req_fish > 0) req = `(Req: ${t.req_fish} Fish)`;

        item.innerHTML = `
            <strong>${t.name}</strong> ${t.owned ? ' (OWNED)' : req}<br>
            <span style="color: #666;">${t.desc}</span>
        `;

        if (t.owned) {
            item.onclick = () => equipTitle(t.name);
        }
        list.appendChild(item);
    });
}

async function equipTitle(titleName) {
    const res = await performAction('equip_title', { titleName });
    if (res.success) {
        showMessage("Title updated!");
        loadUserProfile();
    } else {
        showMessage(res.message);
    }
}

/* --- CHAT SYSTEM --- */
let lastChatId = 0;
let chatPollingInterval = null;

function initChat() {
    const btnToggle = document.getElementById('chat-toggle-btn');
    const btnClose = document.getElementById('btn-close-chat');
    const btnSend = document.getElementById('btn-send-chat');
    const chatInput = document.getElementById('chat-input');

    if (btnToggle) btnToggle.onclick = toggleChat;
    if (btnClose) btnClose.onclick = toggleChat;
    if (btnSend) btnSend.onclick = sendChat;
    if (chatInput) {
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendChat();
        };
    }

    // Start polling
    fetchChat();
    chatPollingInterval = setInterval(fetchChat, 15000);
}

function toggleChat(e) {
    if (e) e.stopPropagation();
    const chatBox = document.getElementById('chat-box');
    const unread = document.getElementById('chat-unread');

    if (chatBox.style.display === 'flex') {
        chatBox.style.display = 'none';
    } else {
        chatBox.style.display = 'flex';
        if (unread) unread.style.display = 'none'; // Clear unread on open
        // Scroll to bottom
        const msgContainer = document.getElementById('chat-messages');
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    if (!authToken) {
        showMessage("Login to chat!");
        return;
    }

    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send_message',
                token: authToken,
                message: message
            })
        });

        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (je) {
            console.error("Chat Server Error:", text);
            throw new Error("Chat server returned invalid data");
        }

        if (json.success) {
            input.value = '';
            fetchChat(); // Instant refresh
        } else {
            if (json.message === 'Invalid Session') { handleLogout(false); return; }
            showMessage(json.message);
        }
    } catch (e) {
        console.error("Chat Error Detail:", e);
        showMessage("Connection error! Chat failed. Check Console for details.");
    }
}

async function fetchChat() {
    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_messages',
                lastId: lastChatId
            })
        });
        const json = await res.json();
        if (json.success && json.messages) {
            const container = document.getElementById('chat-messages');
            const chatBox = document.getElementById('chat-box');
            const unread = document.getElementById('chat-unread');
            let hasNew = false;

            json.messages.forEach(msg => {
                if (msg.id > lastChatId) {
                    const msgEl = document.createElement('div');
                    const isOwn = msg.username === authUser;
                    msgEl.className = `chat-msg ${isOwn ? 'own-msg' : ''}`;
                    msgEl.innerHTML = `
                        <span class="user">${msg.username}:</span>
                        <span class="text">${msg.message}</span>
                        <span class="time">${msg.time}</span>
                    `;
                    // Click name to view profile
                    msgEl.querySelector('.user').onclick = () => switchView('profile', msg.username);

                    container.appendChild(msgEl);
                    lastChatId = msg.id;
                    hasNew = true;
                }
            });

            // Show unread dot if new messages and chat is closed
            if (hasNew && chatBox.style.display !== 'flex') {
                if (unread) unread.style.display = 'block';
            }
            // Auto scroll if new messages
            if (hasNew) {
                container.scrollTop = container.scrollHeight;
            }
        }
    } catch (e) {
        console.error("Fetch Chat Error", e);
    }
}

init();
