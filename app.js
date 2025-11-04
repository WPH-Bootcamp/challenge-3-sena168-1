const readline = require('readline');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 10000; // 10 detik
const DAYS_IN_WEEK = 7;

// User Profile Object
const userProfile = {
    name: "Habit Tracker User",
    joinDate: new Date(),
    totalHabits: 0,
    completedHabits: 0,
    
    updateStats: function(habits) {
        this.totalHabits = habits.length;
        this.completedHabits = habits.filter(h => h.isCompletedThisWeek()).length;
    },
    
    getDaysJoined: function() {
        const today = new Date();
        const joinDate = new Date(this.joinDate);
        const diffTime = Math.abs(today - joinDate);
        return Math.ceil(diffTime / (1000 * 60 * 24));
    }
};

// Habit Class
class Habit {
    constructor(name, targetFrequency) {
        this.id = Date.now() + Math.random(); // Simple ID generation
        this.name = name;
        this.targetFrequency = targetFrequency;
        this.completions = []; // Array of completion dates
        this.createdAt = new Date();
    }
    
    markComplete() {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day
        this.completions.push(today);
    }
    
    getThisWeekCompletions() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        return this.completions.filter(date => date >= oneWeekAgo);
    }
    
    isCompletedThisWeek() {
        return this.getThisWeekCompletions().length >= this.targetFrequency;
    }
    
    getProgressPercentage() {
        const completions = this.getThisWeekCompletions().length;
        return Math.min(100, Math.round((completions / this.targetFrequency) * 100));
    }
    
    getStatus() {
        return this.isCompletedThisWeek() ? 'Selesai' : 'Aktif';
    }
    
    getCompletionCount() {
        return this.getThisWeekCompletions().length;
    }
}

// Habit Tracker Class
class HabitTracker {
    constructor() {
        this.habits = [];
        this.reminderInterval = null;
        this.loadFromFile();
    }
    
    // CRUD Operations
    addHabit(name, frequency) {
        const habit = new Habit(name, frequency);
        this.habits.push(habit);
        this.saveToFile();
        return habit;
    }
    
    completeHabit(index) {
        if (index >= 0 && index < this.habits.length) {
            this.habits[index].markComplete();
            this.saveToFile();
            return true;
        }
        return false;
    }
    
    deleteHabit(index) {
        if (index >= 0 && index < this.habits.length) {
            this.habits.splice(index, 1);
            this.saveToFile();
            return true;
        }
        return false;
    }
    
    // Display Methods
    displayProfile() {
        // Update stats before displaying
        userProfile.updateStats(this.habits);
        console.log('='.repeat(50));
        console.log('PROFIL PENGGUNA');
        console.log('='.repeat(50));
        console.log(`Nama: ${userProfile.name}`);
        console.log(`Hari Bergabung: ${userProfile.getDaysJoined()} hari yang lalu`);
        console.log(`Total Kebiasaan: ${userProfile.totalHabits}`);
        console.log(`Kebiasaan Selesai Minggu Ini: ${userProfile.completedHabits}`);
        console.log('='.repeat(50));
    }
    
    displayHabits(filter = null) {
        console.log('='.repeat(50));
        if (filter === 'active') {
            console.log('KEBIASAAN AKTIF');
            const activeHabits = this.habits.filter(h => !h.isCompletedThisWeek());
            this.displayHabitList(activeHabits);
        } else if (filter === 'completed') {
            console.log('KEBIASAAN SELESAI');
            const completedHabits = this.habits.filter(h => h.isCompletedThisWeek());
            this.displayHabitList(completedHabits);
        } else {
            console.log('SEMUA KEBIASAAN');
            this.displayHabitList(this.habits);
        }
        console.log('='.repeat(50));
    }
    
    displayHabitList(habits) {
        if (habits.length === 0) {
            console.log('Belum ada kebiasaan.');
            return;
        }
        
        habits.forEach((habit, index) => {
            const status = habit.getStatus();
            const completionCount = habit.getCompletionCount();
            const progress = habit.getProgressPercentage();
            const progressBar = this.createProgressBar(progress);
            
            console.log(`${index + 1}. [${status}] ${habit.name}`);
            console.log(`   Target: ${habit.targetFrequency}x/minggu`);
            console.log(`   Progress: ${completionCount}/${habit.targetFrequency} (${progress}%)`);
            console.log(`   Progress Bar: ${progressBar} ${progress}%`);
            console.log('');
        });
    }
    
    createProgressBar(percentage) {
        const totalBlocks = 10;
        const filledBlocks = Math.round((percentage / 100) * totalBlocks);
        const emptyBlocks = totalBlocks - filledBlocks;
        
        const filled = '█'.repeat(filledBlocks);
        const empty = '░'.repeat(emptyBlocks);
        
        return filled + empty;
    }
    
    displayHabitsWithWhile() {
        console.log('='.repeat(50));
        console.log('KEBIASAAN (Menggunakan While Loop)');
        console.log('='.repeat(50));
        
        let i = 0;
        while (i < this.habits.length) {
            const habit = this.habits[i];
            console.log(`${i + 1}. ${habit.name} - Status: ${habit.getStatus()}`);
            i++;
        }
    }
    
    displayHabitsWithFor() {
        console.log('='.repeat(50));
        console.log('KEBIASAAN (Menggunakan For Loop)');
        console.log('='.repeat(50));
        
        for (let i = 0; i < this.habits.length; i++) {
            const habit = this.habits[i];
            console.log(`${i + 1}. ${habit.name} - Target: ${habit.targetFrequency}/minggu`);
        }
    }
    
    displayStats() {
        console.log('='.repeat(50));
        console.log('STATISTIK');
        console.log('='.repeat(50));
        
        // Using array methods as required
        const totalHabits = this.habits.length;
        const completedThisWeek = this.habits.filter(h => h.isCompletedThisWeek()).length;
        const activeHabits = this.habits.filter(h => !h.isCompletedThisWeek()).length;
        
        // Calculate average completion rate
        const completionRates = this.habits.map(h => h.getProgressPercentage());
        const avgCompletionRate = completionRates.length > 0 ? 
            completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length : 0;
        
        // Find most frequently completed habit
        let mostFrequentHabit = null;
        if (this.habits.length > 0) {
            mostFrequentHabit = this.habits.reduce((prev, current) => 
                (prev.getCompletionCount() > current.getCompletionCount()) ? prev : current
            );
        }
        
        console.log(`Total Kebiasaan: ${totalHabits}`);
        console.log(`Kebiasaan Selesai Minggu Ini: ${completedThisWeek}`);
        console.log(`Kebiasaan Aktif: ${activeHabits}`);
        console.log(`Rata-rata Progress: ${avgCompletionRate.toFixed(1)}%`);
        if (mostFrequentHabit) {
            console.log(`Kebiasaan Paling Rajin: ${mostFrequentHabit.name} (${mostFrequentHabit.getCompletionCount()}x minggu ini)`);
        }
        
        // Use forEach to display all habit names
        console.log('\nDaftar Semua Kebiasaan:');
        this.habits.forEach((habit, index) => {
            console.log(`  ${index + 1}. ${habit.name}`);
        });
        
        console.log('='.repeat(50));
    }
    
    // Reminder System
    startReminder() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }
        
        this.reminderInterval = setInterval(() => {
            this.showReminder();
        }, REMINDER_INTERVAL);
        
        console.log("Pengingat diaktifkan! Akan muncul setiap 10 detik.");
    }
    
    showReminder() {
        const activeHabits = this.habits.filter(h => !h.isCompletedThisWeek());
        if (activeHabits.length > 0) {
            console.log('\n' + '='.repeat(50));
            console.log('REMINDER: Jangan lupa kebiasaanmu!');
            activeHabits.forEach(habit => {
                if (habit && habit.name) {
                    console.log(`- ${habit.name}`);
                }
            });
            console.log('='.repeat(50));
        }
    }
    
    stopReminder() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
            console.log("Pengingat dinonaktifkan.");
        }
    }
    
    // File Operations
    saveToFile() {
        try {
            // Update user stats before saving
            userProfile.updateStats(this.habits);
            
            const dataToSave = {
                userProfile: {
                    name: userProfile.name,
                    joinDate: userProfile.joinDate,
                    totalHabits: userProfile.totalHabits,
                    completedHabits: userProfile.completedHabits
                },
                habits: this.habits.map(habit => ({
                    id: habit.id,
                    name: habit.name,
                    targetFrequency: habit.targetFrequency,
                    completions: habit.completions.map(date => date.toISOString()),
                    createdAt: habit.createdAt.toISOString()
                }))
            };
            
            fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error("Error saving data:", error.message);
        }
    }
    
    loadFromFile() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const fileData = fs.readFileSync(DATA_FILE, 'utf8');
                const data = JSON.parse(fileData);
                
                // Restore user profile
                if (data.userProfile) {
                    userProfile.name = data.userProfile.name;
                    userProfile.joinDate = new Date(data.userProfile.joinDate);
                    userProfile.totalHabits = data.userProfile.totalHabits ?? 0;
                    userProfile.completedHabits = data.userProfile.completedHabits ?? 0;
                }
                
                // Restore habits
                if (data.habits) {
                    this.habits = data.habits.map(habitData => {
                        const habit = new Habit(habitData.name, habitData.targetFrequency);
                        habit.id = habitData.id;
                        habit.completions = habitData.completions.map(dateStr => new Date(dateStr));
                        habit.createdAt = new Date(habitData.createdAt);
                        return habit;
                    });
                }
            }
        } catch (error) {
            console.error("Error loading data:", error.message);
            // If there's an error loading, start with empty data
            this.habits = [];
        }
    }
    
    clearAllData() {
        this.habits = [];
        this.saveToFile();
        console.log("Semua data telah dihapus.");
    }
}

// CLI Interface Functions
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

function displayMenu() {
    console.log('='.repeat(52));
    console.log('HABIT TRACKER - MENU UTAMA');
    console.log('='.repeat(52));
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
    console.log('='.repeat(52));
}

async function handleMenu(tracker) {
    displayMenu();
    const choice = await askQuestion('Pilih menu (0-9): ');
    
    switch (choice) {
        case '1':
            tracker.displayProfile();
            break;
        case '2':
            tracker.displayHabits();
            break;
        case '3':
            tracker.displayHabits('active');
            break;
        case '4':
            tracker.displayHabits('completed');
            break;
        case '5':
            const name = await askQuestion('Nama kebiasaan: ');
            const frequency = await askQuestion('Target per minggu (angka): ');
            const freqNum = parseInt(frequency);
            if (!isNaN(freqNum) && freqNum > 0) {
                tracker.addHabit(name, freqNum);
                console.log('Kebiasaan berhasil ditambahkan!');
            } else {
                console.log('Target tidak valid. Harus angka positif.');
            }
            break;
        case '6':
            tracker.displayHabits();
            if (tracker.habits.length > 0) {
                const index = await askQuestion('Nomor kebiasaan yang selesai (1-' + tracker.habits.length + '): ');
                const habitIndex = parseInt(index) - 1;
                if (tracker.completeHabit(habitIndex)) {
                    console.log('Kebiasaan ditandai selesai untuk hari ini!');
                } else {
                    console.log('Nomor kebiasaan tidak valid.');
                }
            } else {
                console.log('Tidak ada kebiasaan untuk ditandai selesai.');
            }
            break;
        case '7':
            tracker.displayHabits();
            if (tracker.habits.length > 0) {
                const index = await askQuestion('Nomor kebiasaan yang akan dihapus (1-' + tracker.habits.length + '): ');
                const habitIndex = parseInt(index) - 1;
                if (tracker.deleteHabit(habitIndex)) {
                    console.log('Kebiasaan berhasil dihapus!');
                } else {
                    console.log('Nomor kebiasaan tidak valid.');
                }
            } else {
                console.log('Tidak ada kebiasaan untuk dihapus.');
            }
            break;
        case '8':
            tracker.displayStats();
            break;
        case '9':
            console.log('Demo While Loop:');
            tracker.displayHabitsWithWhile();
            console.log('\nDemo For Loop:');
            tracker.displayHabitsWithFor();
            break;
        case '0':
            console.log('Terima kasih telah menggunakan Habit Tracker!');
            tracker.stopReminder();
            rl.close();
            return;
        default:
            console.log('Pilihan tidak valid. Silakan pilih 0-9.');
    }
    
    // Continue the loop
    await handleMenu(tracker);
}

// Main Function
async function main() {
    console.log('='.repeat(52));
    console.log('SELAMAT DATANG DI HABIT TRACKER CLI');
    console.log('='.repeat(52));
    
    const tracker = new HabitTracker();
    
    // Start the reminder system
    tracker.startReminder();
    
    // Start the menu system
    await handleMenu(tracker);
}

// Run the application
main().catch(console.error);