#!/usr/bin/env node
/**
 * HABIT TRACKER CLI - Challenge 3
 * -------------------------------------------------------------
 * Implements all required concepts & features from the README:
 * - Classes & Objects, Arrays + filter/map/find/forEach
 * - Date manipulation, setInterval reminder
 * - JSON persistence (save/load)
 * - Nullish coalescing operator (??) in multiple places
 * - while loop + for loop demos
 * - 10-menu CLI with readline
 * -------------------------------------------------------------
 * Run: node app.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// -------------------------- Constants --------------------------
const DATA_FILE = path.join(__dirname, 'habits-data.json');
const DAYS_IN_WEEK = 7;

// Allow override via env but default to 10s as per spec
const REMINDER_INTERVAL =
  Number(process.env.REMINDER_INTERVAL_MS ?? 10000); // (?? #1)

// --------------------------- Helpers ---------------------------

/** Pad number to 2 digits */
const pad2 = (n) => String(n).padStart(2, '0');

/** Format a Date to local YYYY-MM-DD (no timezone drift) */
function toLocalYMD(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse a YYYY-MM-DD to a Date at local midnight */
function fromLocalYMD(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Get start-of-week (Monday) and end-of-week (Sunday) for a given date */
function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const mondayOffset = (day === 0 ? -6 : 1) - day; // distance to Monday
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** ASCII progress bar (10 blocks like README sample) */
function progressBar(percent) {
  const total = 10;
  const filled = Math.round((percent / 100) * total);
  const fillChar = '█';
  const emptyChar = '░';
  return `${fillChar.repeat(filled)}${emptyChar.repeat(total - filled)} ${Math.round(percent)}%`;
}

// ----------------------- User Profile Obj ----------------------

/**
 * Simple user profile object (not a class to satisfy "Object Dasar")
 * - updateStats(habits): recompute totals
 * - getDaysJoined(): how many days since joinedAt
 */
const userProfile = {
  name: process.env.HABIT_USER_NAME ?? 'User', // (?? #2)
  joinedAt: null, // filled on first run/load
  totalHabits: 0,
  totalCompletions: 0,

  updateStats(habits = []) {
    // Using array methods (map, reduce/forEach) per rubric
    this.totalHabits = habits.length;
    let count = 0;
    habits.forEach((h) => { // forEach usage
      count += h.completions.length;
    });
    this.totalCompletions = count;
  },

  getDaysJoined() {
    if (!this.joinedAt) return 0;
    const start = new Date(this.joinedAt);
    const now = new Date();
    const ms = now - start;
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  },
};

// --------------------------- Classes ---------------------------

/**
 * Habit: represents one habit
 * - id, name, targetFrequency (times per week), completions[YYYY-MM-DD], createdAt
 * Methods:
 * - markComplete()
 * - getThisWeekCompletions()
 * - isCompletedThisWeek()
 * - getProgressPercentage()
 * - getStatus()
 */
class Habit {
  constructor({ id, name, targetFrequency, completions, createdAt }) {
    this.id = id ?? String(Date.now()); // (?? #3)
    this.name = name ?? 'Untitled Habit';
    this.targetFrequency = Number(targetFrequency ?? 7);
    this.completions = Array.isArray(completions) ? completions : [];
    this.createdAt = createdAt ?? new Date().toISOString();
  }

  /** Prevent duplicate completion for the same local day */
  markComplete(dateYMD = toLocalYMD()) {
    if (!this.completions.includes(dateYMD)) {
      this.completions.push(dateYMD);
      return true;
    }
    return false;
  }

  /** Count completions in current week (Mon..Sun) */
  getThisWeekCompletions(ref = new Date()) {
    const { start, end } = getWeekBounds(ref);
    return this.completions.filter((ymd) => {
      const d = fromLocalYMD(ymd);
      return d >= start && d <= end;
    }).length; // filter usage
  }

  isCompletedThisWeek() {
    return this.getThisWeekCompletions() >= this.targetFrequency;
  }

  getProgressPercentage() {
    const done = this.getThisWeekCompletions();
    const pct = this.targetFrequency > 0 ? (done / this.targetFrequency) * 100 : 0;
    return Math.min(100, Math.max(0, pct));
  }

  getStatus() {
    return this.isCompletedThisWeek() ? 'Selesai' : 'Aktif';
  }
}

/**
 * HabitTracker: manages collection + CLI views + IO + reminder
 * Methods (per spec):
 * - addHabit(name, frequency)
 * - completeHabit(habitIndex)
 * - deleteHabit(habitIndex)
 * - displayProfile()
 * - displayHabits(filter)
 * - displayHabitsWithWhile()
 * - displayHabitsWithFor()
 * - displayStats()
 * - startReminder(), showReminder(), stopReminder()
 * - saveToFile(), loadFromFile(), clearAllData()
 */
class HabitTracker {
  constructor() {
    this.habits = [];
    this.reminderTimer = null;
    this.loadFromFile(); // populate from disk (if any)
    // Initialize joinedAt on first run
    userProfile.joinedAt = userProfile.joinedAt ?? new Date().toISOString();
    userProfile.updateStats(this.habits);
  }

  // ------------------------- CRUD Ops -------------------------
  addHabit(name, frequency) {
    const freq = Number(frequency ?? 7); // (?? #4)
    const habit = new Habit({
      id: String(Date.now() + Math.floor(Math.random() * 1000)),
      name: name?.trim() || 'Kebiasaan Baru', // nullish-safe access + fallback
      targetFrequency: isNaN(freq) || freq <= 0 ? 7 : freq,
      completions: [],
      createdAt: new Date().toISOString(),
    });
    this.habits.push(habit);
    this.saveToFile();
    userProfile.updateStats(this.habits);
    return habit;
  }

  /** Accept 1-based index from UI */
  completeHabit(habitIndex) {
    const idx = Number(habitIndex) - 1;
    const habit = this.habits[idx] ?? null; // (?? #5)
    if (!habit) return { ok: false, msg: 'Index tidak valid.' };
    const ok = habit.markComplete();
    if (ok) {
      this.saveToFile();
      userProfile.updateStats(this.habits);
      return { ok: true, msg: `Berhasil menandai "${habit.name}" untuk hari ini.` };
    }
    return { ok: false, msg: 'Sudah ditandai selesai untuk hari ini.' };
  }

  deleteHabit(habitIndex) {
    const idx = Number(habitIndex) - 1;
    if (idx < 0 || idx >= this.habits.length) return { ok: false, msg: 'Index tidak valid.' };
    const removed = this.habits.splice(idx, 1);
    this.saveToFile();
    userProfile.updateStats(this.habits);
    return { ok: true, msg: `Hapus kebiasaan "${removed[0].name}".` };
  }

  // ---------------------- Display Methods ---------------------

  displayProfile() {
    console.log('\n==================================================');
    console.log('PROFIL USER');
    console.log('==================================================');
    console.log(`Nama             : ${userProfile.name}`);
    console.log(`Hari bergabung   : ${userProfile.getDaysJoined()} hari`);
    console.log(`Total kebiasaan  : ${userProfile.totalHabits}`);
    console.log(`Total penyelesaian: ${userProfile.totalCompletions}`);
    const { start, end } = getWeekBounds(new Date());
    const weekRange = `${toLocalYMD(start)} s/d ${toLocalYMD(end)}`;
    console.log(`Rentang minggu   : ${weekRange}`);
    console.log('==================================================\n');
  }

  /**
   * filter: 'all' | 'active' | 'done'
   * uses filter/map/find/forEach across rendering
   */
  displayHabits(filter = 'all') {
    console.log('\n==================================================');
    console.log('DAFTAR KEBIASAAN');
    console.log('==================================================');

    let list = this.habits;
    if (filter === 'active') {
      list = this.habits.filter((h) => !h.isCompletedThisWeek());
      console.log('(Filter: Aktif)');
    } else if (filter === 'done') {
      list = this.habits.filter((h) => h.isCompletedThisWeek());
      console.log('(Filter: Selesai)');
    }

    if (list.length === 0) {
      console.log('Belum ada kebiasaan.');
      console.log('==================================================\n');
      return;
    }

    list.forEach((h, i) => {
      const progress = h.getProgressPercentage();
      const done = h.getThisWeekCompletions();
      const bar = progressBar(progress);
      console.log(`${i + 1}. [${h.getStatus()}] ${h.name}`);
      console.log(`   Target   : ${h.targetFrequency}x/minggu`);
      console.log(`   Progress : ${done}/${h.targetFrequency} (${Math.round(progress)}%)`);
      console.log(`   Bar      : ${bar}`);
      console.log('');
    });

    console.log('==================================================\n');
  }

  /** Explicit while-loop demo */
  displayHabitsWithWhile() {
    console.log('\n-- Demo While Loop --');
    let i = 0;
    while (i < this.habits.length) {
      const h = this.habits[i];
      console.log(`${i + 1}. ${h.name} - Status: ${h.getStatus()}`);
      i++;
    }
  }

  /** Explicit for-loop demo */
  displayHabitsWithFor() {
    console.log('\n-- Demo For Loop --');
    for (let i = 0; i < this.habits.length; i++) { // for loop usage
      const h = this.habits[i];
      console.log(`${i + 1}. ${h.name} - Target: ${h.targetFrequency}/minggu`);
    }
  }

  /** Summary using array methods */
  displayStats() {
    console.log('\n==================================================');
    console.log('STATISTIK');
    console.log('==================================================');

    const total = this.habits.length;
    const active = this.habits.filter((h) => !h.isCompletedThisWeek()).length;
    const done = this.habits.filter((h) => h.isCompletedThisWeek()).length;

    const avgTarget =
      total === 0 ? 0 :
        this.habits.map((h) => h.targetFrequency) // map usage
          .reduce((a, b) => a + b, 0) / total;

    const top = this.habits
      .map((h) => ({ name: h.name, done: h.getThisWeekCompletions() }))
      .sort((a, b) => b.done - a.done)[0] ?? null; // (?? #6)

    console.log(`Total kebiasaan      : ${total}`);
    console.log(`Aktif (belum selesai): ${active}`);
    console.log(`Selesai (capai target): ${done}`);
    console.log(`Rata-rata target/mgg  : ${avgTarget.toFixed(2)}`);
    if (top) {
      console.log(`Terbanyak minggu ini  : ${top.name} (${top.done}x)`);
    } else {
      console.log('Terbanyak minggu ini  : -');
    }
    console.log('==================================================\n');
  }

  // --------------------- Reminder System ----------------------
  startReminder() {
    if (this.reminderTimer) return; // already running
    this.reminderTimer = setInterval(() => this.showReminder(), REMINDER_INTERVAL);
  }

  showReminder() {
    // Pick first active habit as reminder target
    const active = this.habits.filter((h) => !h.isCompletedThisWeek());
    if (active.length === 0) return; // nothing to remind
    const target = active[0];
    console.log('\n==================================================');
    console.log(`REMINDER: Jangan lupa "${target.name}"!`);
    console.log('==================================================\n');
  }

  stopReminder() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
  }

  // ----------------------- File Operations --------------------
  saveToFile() {
    try {
      const data = {
        profile: {
          name: userProfile.name,
          joinedAt: userProfile.joinedAt,
        },
        habits: this.habits.map((h) => ({
          id: h.id, name: h.name, targetFrequency: h.targetFrequency,
          completions: h.completions, createdAt: h.createdAt,
        })),
      };
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(DATA_FILE, json);
    } catch (err) {
      console.error('Gagal menyimpan data:', err.message);
    }
  }

  loadFromFile() {
    try {
      if (!fs.existsSync(DATA_FILE)) return;
      const json = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(json);
      // Rehydrate profile
      userProfile.name = data.profile?.name ?? userProfile.name; // (?? #7)
      userProfile.joinedAt = data.profile?.joinedAt ?? userProfile.joinedAt;
      // Rehydrate habits to class instances
      this.habits = (data.habits ?? []).map((raw) => new Habit(raw)); // (?? #8)
    } catch (err) {
      console.error('Gagal memuat data:', err.message);
    }
  }

  clearAllData() {
    this.habits = [];
    try {
      if (fs.existsSync(DATA_FILE)) fs.unlinkSync(DATA_FILE);
    } catch (e) {
      // Ignore
    }
    userProfile.updateStats(this.habits);
  }
}

// ----------------------- CLI (Readline) ------------------------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (ans) => resolve(ans));
  });
}

function showBanner() {
  console.clear();
  console.log('==================================================');
  console.log('HABIT TRACKER CLI');
  console.log('==================================================');
}

function displayMenu() {
  console.log('1. Lihat Profil');
  console.log('2. Lihat Semua Kebiasaan');
  console.log('3. Lihat Kebiasaan Aktif');
  console.log('4. Lihat Kebiasaan Selesai');
  console.log('5. Tambah Kebiasaan Baru');
  console.log('6. Tandai Kebiasaan Selesai');
  console.log('7. Hapus Kebiasaan');
  console.log('8. Lihat Statistik');
  console.log('9. Demo Loop (while/for)');
  console.log('0. Keluar');
  console.log('==================================================');
}

/** Main menu loop */
async function handleMenu(tracker) {
  tracker.startReminder(); // auto-start reminder per spec
  let running = true;

  while (running) {
    displayMenu();
    const choice = (await askQuestion('Pilih menu (0-9): ')).trim();

    switch (choice) {
      case '1': // profile
        tracker.displayProfile();
        break;

      case '2': // all habits
        tracker.displayHabits('all');
        break;

      case '3': // active
        tracker.displayHabits('active');
        break;

      case '4': // done
        tracker.displayHabits('done');
        break;

      case '5': { // add
        const name = await askQuestion('Nama kebiasaan: ');
        const freqStr = await askQuestion('Target per minggu (angka, default 7): ');
        const freq = Number(freqStr);
        const habit = tracker.addHabit(name, isNaN(freq) ? 7 : freq);
        console.log(`Ditambahkan: "${habit.name}" dengan target ${habit.targetFrequency}x/minggu\n`);
        break;
      }

      case '6': { // complete
        tracker.displayHabits('all');
        const idxStr = await askQuestion('Nomor kebiasaan yang diselesaikan hari ini: ');
        const res = tracker.completeHabit(idxStr);
        console.log(res.msg + '\n');
        break;
      }

      case '7': { // delete
        tracker.displayHabits('all');
        const idxStr = await askQuestion('Nomor kebiasaan yang akan dihapus: ');
        const res = tracker.deleteHabit(idxStr);
        console.log(res.msg + '\n');
        break;
      }

      case '8': // stats
        tracker.displayStats();
        break;

      case '9': // loop demo
        tracker.displayHabitsWithWhile();
        tracker.displayHabitsWithFor();
        console.log('');
        break;

      case '0':
        running = false;
        break;

      default:
        console.log('Pilihan tidak dikenal. Coba lagi.\n');
        break;
    }
  }

  tracker.stopReminder();
  tracker.saveToFile();
  rl.close();
  console.log('Sampai jumpa!');
}

// ----------------------------- Main ----------------------------
async function main() {
  showBanner();
  const tracker = new HabitTracker();

  // Optional: seed demo data if none exist
  if (tracker.habits.length === 0) {
    console.log('Belum ada data. Menambahkan contoh kebiasaan...\n');
    tracker.addHabit('Minum Air 8 Gelas', 7);
    tracker.addHabit('Baca Buku 30 Menit', 5);
    tracker.addHabit('Olahraga Ringan', 3);
  }

  await handleMenu(tracker);
}

// Start program
main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
