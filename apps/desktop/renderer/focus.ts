export function closePopupMenus(except?:Element):void{document.querySelectorAll<HTMLDetailsElement>('details.more-actions[open],details.appearance-menu[open]').forEach(menu=>{if(menu!==except&&!menu.contains(except||null))menu.open=false;});}
export function trapFocus(event:KeyboardEvent):void{if(event.key!=='Tab')return;const dialog=event.currentTarget as HTMLElement;const items=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'));if(!items.length)return;const first=items[0]!,last=items.at(-1)!;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}

/** Escape closes the top-most dialog by pressing its Cancel/Close button (the register drawer handles Escape itself). */
export function installEscapeToClose():void{
  // Focus the first field when a dialog opens (or the safest button, Cancel, when it has no fields) so typing and Enter work immediately.
  document.addEventListener('pointerdown',event=>{const target=event.target;if(target instanceof Element)closePopupMenus(target.closest('details.more-actions,details.appearance-menu')||undefined);},true);
  document.addEventListener('focusin',event=>{const target=event.target;if(target instanceof Element&&!target.closest('.modal-backdrop'))closePopupMenus(target.closest('details.more-actions,details.appearance-menu')||undefined);});
  document.addEventListener('toggle',event=>{const target=event.target;if(target instanceof HTMLDetailsElement&&target.open&&target.matches('.more-actions,.appearance-menu'))closePopupMenus(target);},true);
  document.addEventListener('click',event=>{const target=event.target;if(target instanceof Element&&target.closest('.more-menu button'))closePopupMenus();});
  let focusedDialog:Element|null=null;
  new MutationObserver(()=>{const dialog=document.querySelector('.modal-backdrop [role="dialog"]');if(!dialog){focusedDialog=null;return;}closePopupMenus();if(dialog===focusedDialog||dialog.contains(document.activeElement))return;focusedDialog=dialog;
    const target=dialog.querySelector<HTMLElement>('input:not([type=hidden]):not([type=checkbox]):not(:disabled),select:not(:disabled),textarea:not(:disabled)')||dialog.querySelector<HTMLElement>('button:not(:disabled)');target?.focus();if(target instanceof HTMLInputElement&&target.type!=='date')target.select();}).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.defaultPrevented&&event.target instanceof HTMLInputElement){const dialog=event.target.closest<HTMLElement>('.modal-backdrop [role="dialog"]');if(dialog&&dialog.tagName!=='FORM'&&!dialog.classList.contains('register-drawer')){const primary=dialog.querySelector<HTMLButtonElement>('button.primary:not(:disabled)');if(primary){event.preventDefault();primary.click();}}}
    if(event.key!=='Escape'||event.defaultPrevented)return;
    if(document.querySelector('details.more-actions[open],details.appearance-menu[open]')){closePopupMenus();event.preventDefault();return;}
    const dialogs=Array.from(document.querySelectorAll<HTMLElement>('.modal-backdrop [role="dialog"]'));const top=dialogs.at(-1);if(!top)return;
    const cancel=Array.from(top.querySelectorAll<HTMLButtonElement>('button')).find(b=>/^(cancel|close|discard|back)$/i.test((b.textContent||'').trim()));
    if(cancel){event.preventDefault();cancel.click();}
  });
}
