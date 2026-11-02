import {h,Component} from 'preact';
import {previewField} from '../../../packages/core/preview-fields.ts';

function key(n:Node){if(!(n instanceof Element))return '';return n.getAttribute('data-line-id')||n.getAttribute('data-edit')||n.getAttribute('data-business-field')||n.getAttribute('data-region')||(n.tagName==='IMG'?n.getAttribute('alt')||'':'');}
function same(a:Node,b:Node){return a.nodeType===b.nodeType&&(!(a instanceof Element)||b instanceof Element&&a.tagName===b.tagName);}
function morph(parent:Element,next:Element){
 const desired=[...next.childNodes];for(let i=0;i<desired.length;i++){const n=desired[i]!;let old=parent.childNodes[i];const k=key(n);if(k&&old&&key(old)!==k){const found=[...parent.childNodes].slice(i+1).find(x=>key(x)===k&&same(x,n));if(found){parent.insertBefore(found,old);old=found;}else{parent.insertBefore(n.cloneNode(true),old);continue;}}
  if(!old){parent.append(n.cloneNode(true));continue;}if(!same(old,n)||!k&&key(old)){parent.insertBefore(n.cloneNode(true),old);continue;}if(old instanceof Element&&n instanceof Element){for(const a of [...old.attributes])if(!n.hasAttribute(a.name)&&!['tabindex','role','aria-label','aria-describedby'].includes(a.name))old.removeAttribute(a.name);for(const a of [...n.attributes])if(old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);morph(old,n);}else if(old.nodeValue!==n.nodeValue)old.nodeValue=n.nodeValue;
 }while(parent.childNodes.length>desired.length)parent.lastChild!.remove();
}
interface Props {html:string;css:string;editing:boolean;onCompliance:()=>void}
export class StableInvoice extends Component<Props>{
 host:HTMLDivElement|null=null;lastHtml='';lastCss='';tip:HTMLDivElement|null=null;tipTarget:HTMLElement|null=null;tipId='case-tip-'+crypto.randomUUID();
 componentDidMount(){this.updateContent();document.addEventListener('pointerdown',this.dismiss);document.addEventListener('keydown',this.escape);}
 componentDidUpdate(){this.updateContent();}
 componentWillUnmount(){this.hide();document.removeEventListener('pointerdown',this.dismiss);document.removeEventListener('keydown',this.escape);}
 escape=(e:KeyboardEvent)=>{if(e.key==='Escape')this.hide();};
 dismiss=(e:PointerEvent)=>{if(this.tipTarget&&!this.tipTarget.contains(e.target as Node)&&!this.tip?.contains(e.target as Node))this.hide();};
 hide(){this.tip?.remove();this.tip=null;this.tipTarget?.removeAttribute('aria-describedby');this.tipTarget=null;}
 show(target:HTMLElement){const text=target.dataset.caseTooltip;if(!text)return;if(this.tipTarget===target&&this.tip){this.tip.textContent=text;return;}this.hide();this.tipTarget=target;this.tip=document.createElement('div');this.tip.className='case-tooltip';this.tip.id=this.tipId;this.tip.role='tooltip';this.tip.textContent=text;document.body.append(this.tip);target.setAttribute('aria-describedby',this.tipId);const r=target.getBoundingClientRect();this.tip.style.left=Math.max(8,Math.min(r.left,window.innerWidth-300))+'px';this.tip.style.top=Math.max(8,Math.min(r.bottom+8,window.innerHeight-this.tip.offsetHeight-8))+'px';}
 updateContent(){if(!this.host)return;const style=this.host.querySelector('style')!;if(this.lastCss!==this.props.css){style.textContent=this.props.css;this.lastCss=this.props.css;}const surface=this.host.querySelector('.invoice-surface')!;if(this.lastHtml!==this.props.html){const next=document.createElement('div');next.innerHTML=this.props.html;morph(surface,next);this.lastHtml=this.props.html;if(this.tipTarget&&!this.tipTarget.isConnected)this.hide();else if(this.tipTarget)this.show(this.tipTarget);}
  for(const node of surface.querySelectorAll<HTMLElement>('[data-edit],[data-business-field]')){node.tabIndex=this.props.editing?0:-1;if(this.props.editing){node.role='button';node.setAttribute('aria-label','Edit '+(previewField(node.dataset.edit||node.dataset.businessField||'',node.dataset.businessField?'business':'draft')?.label||'field'));}else{node.removeAttribute('role');node.removeAttribute('aria-label');}}
 }
 render(){return h('div',{class:this.props.editing?'editable-preview':'issued-preview',ref:(el:HTMLDivElement|null)=>{this.host=el;},onPointerOver:(e:PointerEvent)=>{const target=(e.target as Element).closest<HTMLElement>('[data-case-tooltip]');if(target)this.show(target);},onPointerOut:(e:PointerEvent)=>{if(this.tipTarget&&!this.tipTarget.contains(e.relatedTarget as Node))this.hide();},onFocusIn:(e:FocusEvent)=>{const target=(e.target as Element).closest<HTMLElement>('[data-case-tooltip]');if(target)this.show(target);},onFocusOut:(e:FocusEvent)=>{if(this.tipTarget&&!this.tipTarget.contains(e.relatedTarget as Node))this.hide();},onClick:(e:MouseEvent)=>{const target=(e.target as Element);if(target.closest('[data-open-compliance]')){e.preventDefault();e.stopPropagation();this.props.onCompliance();}else{const cell=target.closest<HTMLElement>('[data-case-tooltip]');if(cell&&!this.props.editing)this.show(cell);}}},h('style',null),h('div',{class:'invoice-surface'}));}
}
