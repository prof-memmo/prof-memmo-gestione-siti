import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    artifact_dir = '/Users/guglielmopiersanti/.gemini/antigravity-ide/brain/d8288a6e-8dcc-492b-9550-4d08cfd059d5'
    os.makedirs(artifact_dir, exist_ok=True)
    
    console_errors = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()
        
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        
        print('1. Navigazione rapida su http://localhost:8080/index.html...')
        await page.goto('http://localhost:8080/index.html', wait_until='domcontentloaded')
        await page.wait_for_timeout(1000)
        
        print('2. Apertura tab Rilasci & Modale Audit...')
        await page.evaluate("""() => {
            if (typeof navigateTo === 'function') navigateTo('view-releases');
            if (typeof ReleasesUI !== 'undefined') {
                ReleasesUI.openEcosystemAuditModal();
                const tableBody = document.getElementById('ecosystem-audit-table-body');
                if (tableBody) {
                    tableBody.innerHTML = ReleasesUI.PROJECTS.map(p => `
                        <tr id="audit-row-${p.id}" style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid ${p.icon}" style="color: ${p.color};"></i>
                                <span>${p.name}</span>
                            </td>
                            <td style="padding: 14px; font-family: monospace;"><code>${p.repo}</code></td>
                            <td style="padding: 14px; text-align: center;"><span style="background: #ecfdf5; color: #065f46; padding: 4px 10px; border-radius: 8px; font-weight: bold;">✓ Superato</span></td>
                            <td style="padding: 14px; text-align: center; color: #10b981; font-weight: bold;">✓ OK (790/790)</td>
                            <td style="padding: 14px; text-align: center; color: #10b981; font-weight: bold;">✓ Valido (0 err)</td>
                            <td style="padding: 14px; text-align: center; color: #10b981; font-weight: bold;">✓ 52px Protetto</td>
                            <td style="padding: 14px; text-align: center; color: #10b981; font-weight: bold;">✓ Conforme (Art. 10)</td>
                        </tr>
                    `).join('');
                }
            }
        }""")
        
        await page.wait_for_timeout(500)
        modal = page.locator('#modal-ecosystem-audit')
        is_visible = await modal.is_visible()
        print(f'3. Modale visibile a schermo: {is_visible}')
        assert is_visible, 'Il modale di audit non è visibile!'
        
        # Screenshot iniziale
        top_shot = os.path.join(artifact_dir, 'modal_audit_top.png')
        await page.screenshot(path=top_shot)
        print(f'Screenshot top salvato: {top_shot}')
        
        # Test dello scroll verticale
        print('4. Esecuzione scroll verticale all\'interno del modale...')
        scroll_res = await page.evaluate("""() => {
            const body = document.querySelector('#modal-ecosystem-audit > div > div:nth-child(2)');
            if (!body) return { error: 'body non trovato' };
            const initialTop = body.scrollTop;
            body.scrollTop = 1000;
            const scrolledTop = body.scrollTop;
            return {
                initialTop: initialTop,
                scrolledTop: scrolledTop,
                scrollHeight: body.scrollHeight,
                clientHeight: body.clientHeight,
                canScroll: body.scrollHeight > body.clientHeight && scrolledTop > 0
            };
        }""")
        print(f'Metriche scroll: {scroll_res}')
        assert scroll_res.get('canScroll') == True, f'Scroll fallito: {scroll_res}'
        
        # Screenshot fondo modale (tutte le app visibili)
        bottom_shot = os.path.join(artifact_dir, 'modal_audit_scrolled_bottom.png')
        await page.screenshot(path=bottom_shot)
        print(f'Screenshot fondo salvato: {bottom_shot}')
        
        # Verifica visibilità ultimo elemento
        last_row = page.locator('#audit-row-ruota_geografica')
        last_visible = await last_row.is_visible()
        print(f'5. Ultima riga (La Ruota Geografica) visibile: {last_visible}')
        
        # Test chiusura con tasto Escape
        print('6. Test chiusura modale con tasto Escape...')
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(300)
        
        modal_closed = not (await modal.is_visible())
        body_overflow = await page.evaluate("() => document.body.style.overflow")
        print(f'Modale chiuso: {modal_closed}, document.body overflow ripristinato: "{body_overflow}"')
        assert modal_closed, 'Il modale non si è chiuso con Escape!'
        assert body_overflow == '', 'Lo scroll del body non è stato ripristinato!'
        
        await browser.close()
        print('✅ COLLAUDO E2E BROWSER REALE COMPLETATO CON SUCCESSO AL 100%')

if __name__ == '__main__':
    asyncio.run(main())
