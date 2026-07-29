(function() {
    const GAME_ID = window.HUB_GAME_ID || document.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Inject CSS for the overlay
    const style = document.createElement('style');
    style.innerHTML = `
        #hub-guard-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255,255,255,0.98); z-index: 999999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: 'Outfit', sans-serif; text-align: center;
        }
        #hub-guard-overlay h2 { font-size: 2.5rem; color: #1f2937; margin-bottom: 1rem; }
        #hub-guard-overlay p { font-size: 1.2rem; color: #6b7280; max-width: 500px; line-height: 1.5; }
        #hub-guard-overlay .emoji { font-size: 4rem; margin-bottom: 1rem; }
    `;
    document.head.appendChild(style);

    // Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'hub-guard-overlay';
    overlay.style.display = 'none'; // Hidden by default until checked
    
    const contentWip = `
        <div class="emoji">🚧</div>
        <h2>Stiamo lavorando!</h2>
        <p>Questo gioco è temporaneamente in fase di manutenzione o aggiornamento da parte del Prof. Memmo.</p>
        <p><strong>Riprova più tardi!</strong></p>
    `;
    overlay.innerHTML = contentWip;
    document.documentElement.appendChild(overlay);

    // Initialize Hub Firebase if not already initialized
    const checkStatus = () => {
        let app = null;
        if (firebase.apps.length > 0) {
            app = firebase.apps.find(a => a.name === "HubGuardApp");
        }
        
        if (!app) {
            app = firebase.initializeApp({
                apiKey: "AIzaSyD-n2m-kYEuzGXPMKclZTggf4Y5Zm8_cdM",
                projectId: "prof-memmo-hub"
            }, "HubGuardApp");
        }
        
        const db = app.firestore();
        db.collection('games_status').doc(GAME_ID).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (!data.isActive) {
                    // Check if current user is admin in the primary app
                    const currentUser = firebase.auth().currentUser;
                    if (currentUser && currentUser.email === 'prof.memmo@gmail.com') {
                        overlay.style.display = 'none';
                        console.log("Admin bypass for inactive game.");
                    } else {
                        overlay.style.display = 'flex';
                    }
                } else {
                    overlay.style.display = 'none';
                }
            }
        });
    };

    // Load Firebase scripts if they don't exist
    if (typeof firebase === 'undefined') {
        const script1 = document.createElement('script');
        script1.src = "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js";
        const script2 = document.createElement('script');
        script2.src = "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js";
        const script3 = document.createElement('script');
        script3.src = "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js";
        
        script1.onload = () => {
            script2.onload = () => {
                script3.onload = () => checkStatus();
                document.head.appendChild(script3);
            };
            document.head.appendChild(script2);
        };
        document.head.appendChild(script1);
    } else {
        // Firebase is loaded, but we must wait for Auth to initialize
        setTimeout(checkStatus, 1500); // Small delay to let primary auth resolve
    }
})();
