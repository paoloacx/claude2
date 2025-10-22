// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAb-MLu8atl5hruOPLDhgftjkjc_1M2038",
    authDomain: "breadcrumbs-8b59e.firebaseapp.com",
    projectId: "breadcrumbs-8b59e",
    storageBucket: "breadcrumbs-8b59e.firebasestorage.app",
    messagingSenderId: "912286191427",
    appId: "1:912286191427:web:e78b665df6a6ff6d8529f6",
    measurementId: "G-GZYTDYNSRB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let isOfflineMode = false;

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showMainApp();
        updateSyncStatus('online');
        loadDataFromFirebase();
        loadSettingsFromFirebase();
    }
});

// Sign in with Google
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log('Signed in with Google:', result.user.email);
        })
        .catch((error) => {
            console.error('Google sign-in error:', error);
            alert('Sign in error: ' + error.message);
        });
}

// Sign out
function signOutUser() {
    if (confirm('Sign out?')) {
        auth.signOut().then(() => {
            location.reload();
        });
    }
}

// Continue offline
function continueOffline() {
    isOfflineMode = true;
    showMainApp();
    updateSyncStatus('offline');
    loadData();
    loadSettings();
}

// Show main app
function showMainApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    if (currentUser) {
        const email = currentUser.email;
        const shortEmail = email.length > 20 ? email.substring(0, 17) + '...' : email;
        document.getElementById('user-email-short').textContent = '👤 ' + shortEmail;
        document.getElementById('user-avatar').style.display = 'block';
    }
}

// Toggle user menu
function toggleUserMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('logout-menu');
    menu.classList.toggle('show');
}

// Close user menu on outside click
document.addEventListener('click', (e) => {
    const menu = document.getElementById('logout-menu');
    if (menu && !e.target.closest('.user-avatar')) {
        menu.classList.remove('show');
    }
});

// Update sync status
function updateSyncStatus(status) {
    const statusEl = document.getElementById('sync-status');
    if (status === 'online') {
        statusEl.textContent = '● Online';
        statusEl.style.color = '#00ff00';
        statusEl.style.borderColor = '#00ff00';
    } else if (status === 'syncing') {
        statusEl.textContent = '↻ Syncing...';
        statusEl.style.color = '#ffff00';
        statusEl.style.borderColor = '#ffff00';
    } else {
        statusEl.textContent = '● Offline';
        statusEl.style.color = '#ff0000';
        statusEl.style.borderColor = '#ff0000';
    }
}

// Load data from Firebase
async function loadDataFromFirebase() {
    if (!currentUser) return;
    
    updateSyncStatus('syncing');
    
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('entries').orderBy('timestamp', 'desc').get();
        
        entries = [];
        snapshot.forEach((doc) => {
            entries.push({ id: doc.id, ...doc.data() });
        });
        
        renderTimeline();
        updateSyncStatus('online');
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        updateSyncStatus('offline');
        loadData();
    }
}

// Save data to Firebase
async function saveDataToFirebase() {
    if (!currentUser || isOfflineMode) {
        saveData();
        return;
    }
    
    updateSyncStatus('syncing');
    
    try {
        const batch = db.batch();
        
        entries.forEach((entry) => {
            const docRef = db.collection('users').doc(currentUser.uid).collection('entries').doc(String(entry.id));
            batch.set(docRef, entry);
        });
        
        await batch.commit();
        updateSyncStatus('online');
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        updateSyncStatus('offline');
        saveData();
    }
}

// Load settings from Firebase
async function loadSettingsFromFirebase() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('settings').doc('app-settings').get();
        
        if (doc.exists) {
            const data = doc.data();
            if (data.timeDurations) timeDurations = data.timeDurations;
            if (data.timeActivities) timeActivities = data.timeActivities;
            if (data.trackItems) trackItems = data.trackItems;
            if (data.moods) moods = data.moods;
            
            updateTimerOptions();
            updateTrackOptions();
        }
    } catch (error) {
        console.error('Error loading settings from Firebase:', error);
        loadSettings();
    }
}

// Save settings to Firebase
async function saveSettingsToFirebase() {
    if (!currentUser || isOfflineMode) {
        saveSettingsToStorage();
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).collection('settings').doc('app-settings').set({
            timeDurations: timeDurations,
            timeActivities: timeActivities,
            trackItems: trackItems,
            moods: moods,
            updatedAt: new Date().toISOString()
        });
        
        console.log('Settings saved to Firebase');
    } catch (error) {
        console.error('Error saving settings to Firebase:', error);
        saveSettingsToStorage();
    }
}

// Delete entry from Firebase
async function deleteEntryFromFirebase(entryId) {
    if (!currentUser || isOfflineMode) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).collection('entries').doc(String(entryId)).delete();
        console.log('Entry deleted from Firebase');
    } catch (error) {
        console.error('Error deleting from Firebase:', error);
    }
}
