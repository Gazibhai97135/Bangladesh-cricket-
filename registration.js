// Firebase Configuration v9+
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, orderBy, limit, query, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAWsl0TEYExvQldRCeFg5XAALqq570fsWM",
    authDomain: "bangladesh-cricket-league.firebaseapp.com",
    projectId: "bangladesh-cricket-league",
    storageBucket: "bangladesh-cricket-league.firebasestorage.app",
    messagingSenderId: "985433318916",
    appId: "1:985433318916:web:ac062f7792870eeac0f751",
    measurementId: "G-FHM279E1NL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const playerForm = document.getElementById('playerRegistrationForm');
const uploadArea = document.getElementById('uploadArea');
const playerPhoto = document.getElementById('playerPhoto');
const preview = document.getElementById('preview');

// Photo Upload
uploadArea.addEventListener('click', () => playerPhoto.click());

playerPhoto.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" onclick="removePhoto()" class="remove-btn">
                    <i class="fas fa-times"></i>
                </button>
            `;
        };
        reader.readAsDataURL(file);
    }
});

function removePhoto() {
    playerPhoto.value = '';
    preview.innerHTML = `
        <div class="preview-placeholder">
            <i class="fas fa-user-circle"></i>
            <p>Photo preview will appear here</p>
        </div>
    `;
}

// Form Submission
playerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    // Generate player ID
    const playerId = await generatePlayerId();
    
    // Upload photo
    const photoURL = await uploadPhoto(playerPhoto.files[0], playerId);
    
    // Prepare player data
    const playerData = {
        id: playerId,
        fullName: document.getElementById('fullName').value,
        cricClubsID: document.getElementById('cricClubsID').value,
        birthplace: document.getElementById('birthplace').value,
        mobile: document.getElementById('mobile').value,
        email: document.getElementById('email').value,
        preferredRole: document.getElementById('preferredRole').value,
        battingStyle: document.getElementById('battingStyle').value,
        bowlingStyle: document.getElementById('bowlingStyle').value || 'N/A',
        bankName: document.getElementById('bankName').value,
        accountHolder: document.getElementById('accountHolder').value,
        bsb: document.getElementById('bsb').value,
        accountNumber: document.getElementById('accountNumber').value,
        photoURL: photoURL,
        status: 'pending',
        position: await getNextPosition(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    
    try {
        // Save to Firestore
        await setDoc(doc(db, 'players', playerId), playerData);
        
        // Show success message
        showSuccess(playerId);
        
        // Reset form
        playerForm.reset();
        removePhoto();
        
    } catch (error) {
        alert('Error submitting registration: ' + error.message);
        console.error('Submission error:', error);
    }
});

// Helper Functions
function validateForm() {
    const requiredFields = [
        'fullName', 'cricClubsID', 'birthplace', 'mobile', 'email',
        'preferredRole', 'battingStyle', 'bankName', 'accountHolder',
        'bsb', 'accountNumber'
    ];
    
    for (const field of requiredFields) {
        const input = document.getElementById(field);
        if (!input.value.trim()) {
            alert(`Please fill in ${field.replace(/([A-Z])/g, ' $1')}`);
            input.focus();
            return false;
        }
    }
    
    if (!playerPhoto.files[0]) {
        alert('Please upload a player photo');
        return false;
    }
    
    return true;
}

async function generatePlayerId() {
    try {
        // Get counter from Firestore
        const counterRef = doc(db, 'counters', 'playerId');
        const counterSnap = await getDoc(counterRef);
        
        let newCount = 1;
        if (counterSnap.exists()) {
            newCount = counterSnap.data().count + 1;
        }
        
        // Update counter
        await setDoc(counterRef, { count: newCount });
        
        // Generate ID
        return `BCL-${newCount.toString().padStart(6, '0')}`;
        
    } catch (error) {
        console.error('Error generating ID:', error);
        return `BCL-${Date.now().toString().slice(-6)}`;
    }
}

async function uploadPhoto(file, playerId) {
    try {
        const storageRef = ref(storage, `players/${playerId}/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

async function getNextPosition() {
    try {
        const playersRef = collection(db, 'players');
        const q = query(playersRef, orderBy('position', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return 1;
        
        const lastPlayer = snapshot.docs[0].data();
        return (lastPlayer.position || 0) + 1;
    } catch (error) {
        console.error('Error getting position:', error);
        return 1;
    }
}

function showSuccess(playerId) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'success-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Registration Successful! 🎉</h3>
            </div>
            <div class="modal-body">
                <p>Your registration has been submitted successfully.</p>
                <div class="player-id">
                    <h4>Your BCL Player ID:</h4>
                    <div class="id-number">${playerId}</div>
                </div>
                <p>Please save this ID for future reference.</p>
                <button onclick="copyToClipboard('${playerId}')" class="copy-btn">
                    <i class="fas fa-copy"></i> Copy ID
                </button>
                <button onclick="closeModal()" class="close-btn">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .success-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            text-align: center;
        }
        .player-id {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .id-number {
            font-size: 24px;
            font-weight: bold;
            color: #4361ee;
            margin: 10px 0;
        }
        .copy-btn, .close-btn {
            padding: 10px 20px;
            margin: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        }
        .copy-btn {
            background: #4361ee;
            color: white;
        }
        .close-btn {
            background: #6c757d;
            color: white;
        }
    `;
    document.head.appendChild(style);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('ID copied to clipboard!');
    });
}

function closeModal() {
    const modal = document.querySelector('.success-modal');
    if (modal) modal.remove();
}

// Status Check Function
async function checkStatus() {
    const playerId = document.getElementById('checkID').value.trim();
    if (!playerId) {
        alert('Please enter a BCL ID');
        return;
    }
    
    try {
        const playerDoc = await getDoc(doc(db, 'players', playerId));
        
        if (!playerDoc.exists()) {
            alert('Player not found');
            return;
        }
        
        const player = playerDoc.data();
        const status = player.status || 'pending';
        
        let statusText = 'Pending Review';
        let statusClass = 'pending';
        
        if (status === 'approved') {
            statusText = 'Approved ✅';
            statusClass = 'approved';
        } else if (status === 'declined') {
            statusText = 'Declined ❌';
            statusClass = 'declined';
        }
        
        // Show status
        const resultDiv = document.getElementById('statusResult');
        resultDiv.innerHTML = `
            <div class="status-card ${statusClass}">
                <h4>Status: ${statusText}</h4>
                <p><strong>Name:</strong> ${player.fullName}</p>
                <p><strong>ID:</strong> ${player.id}</p>
                <p><strong>Role:</strong> ${player.preferredRole}</p>
                <p><strong>Submitted:</strong> ${player.createdAt ? new Date(player.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
            </div>
        `;
        
    } catch (error) {
        alert('Error checking status: ' + error.message);
        console.error('Status check error:', error);
    }
}

// Make functions globally available for HTML onclick handlers
window.removePhoto = removePhoto;
window.copyToClipboard = copyToClipboard;
window.closeModal = closeModal;
window.checkStatus = checkStatus;
