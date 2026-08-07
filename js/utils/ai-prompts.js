// --- LOGICA GENERATORE AI ---
function generaPrompt() {
    const tipo = document.getElementById('ai-tipo-post').value;
    const gioco = document.getElementById('ai-gioco').selectedOptions[0].text;
    const argomento = document.getElementById('ai-argomento').value.trim();
    
    let base = `Agisci come un Social Media Manager esperto nel settore educativo (EdTech) e ludico.\nIl progetto è "${gioco}". `;
    if (argomento) {
        base += `L'argomento specifico del post di oggi è: "${argomento}".\n`;
    } else {
        base += `Devi inventare tu un argomento didattico interessante collegato al gioco.\n`;
    }
    
    let specifico = "";
    if (tipo === 'reel') {
        specifico = `Genera uno script per un video Reel/TikTok di 60 secondi.\nStruttura richiesta: HOOK (primi 3 sec per catturare attenzione), CORPO (spiegazione dinamica), CALL TO ACTION finale.\nFornisci sia il testo da dire a voce sia le indicazioni su cosa mostrare a video. Tono entusiasta e professionale.`;
    } else if (tipo === 'carosello') {
        specifico = `Genera il testo per un Carosello di Instagram (massimo 8 slide).\nStruttura: Slide 1 (Titolo a effetto), Slide 2-7 (Contenuto didattico spezzettato e facile da leggere), Slide 8 (Call to Action e salvataggio post).\nScrivi per ogni slide il TESTO VISIVO (quello che c'è nell'immagine) e scrivi a parte una breve CAPTION generale per il post con gli hashtag appropriati.`;
    } else if (tipo === 'adv') {
        specifico = `Genera 3 varianti di COPY PUBBLICITARIO (Facebook/Instagram Ads) per vendere il prodotto/gioco ai docenti.\nVariante 1: Focalizzata sul risparmio di tempo per il docente.\nVariante 2: Focalizzata sul coinvolgimento (engagement) degli studenti.\nVariante 3: Focalizzata sui risultati didattici.\nIncludi emoji e call to action chiare.`;
    } else if (tipo === 'canva') {
        specifico = `Genera un prompt testuale dettagliato da inserire in un'Intelligenza Artificiale Generativa (come Midjourney o il generatore immagini di Canva) per creare l'immagine di copertina perfetta per questo argomento.\nDescrivi lo stile visivo (es. vettoriale, flat design, epico, illustrato), i colori dominanti, i soggetti principali e l'atmosfera.`;
    }
    
    document.getElementById('ai-risultato').value = base + "\n\n" + specifico;
}

function copiaPrompt() {
    const text = document.getElementById('ai-risultato');
    text.select();
    document.execCommand("copy");
    alert("Prompt copiato! Ora apri ChatGPT o Canva e incollalo.");
}
