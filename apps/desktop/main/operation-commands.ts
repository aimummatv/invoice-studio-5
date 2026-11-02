import {Recovery} from '../../../packages/db/recovery.ts';
import {StockReview} from '../../../packages/db/stock-review.ts';
import {MasterProposals} from '../../../packages/db/master-proposals.ts';
import type {Operations} from '../../../packages/db/operations.ts';
import {Insights} from '../../../packages/db/insights.ts';
import type {PurchaseLine} from '../../../packages/core/model.ts';
type Input=Record<string,unknown>;
export const HIGH_RISK_OPERATIONS=new Set(['explainDiagnostic','approveStockIssue','approveStockPurchase','decideMasterProposal','requestGstAmendment','adjustment','supplierPayment','stockAdjustment','purchaseReturn','decideApproval','savePermissions','updateUser','unlockPeriod','closeAction','saveFiling','review2B','reconcileCommit','replaceCustomerAllocations','allocateSupplierAdvance','replaceSupplierAllocations']);
export function operation(o:Operations,token:string,action:string,input:Input):unknown{
 // This switch is the allowlist. Renderer input never selects a method or SQL table dynamically.
 switch(action){
 case 'reviewDraft':return o.reviewDraft(token,input.draft as Parameters<Operations['reviewDraft']>[1]);
 case 'copyDraft':return o.copyDraft(token,String(input.id),Number(input.version));
 case 'rememberCustomer':return o.rememberCustomer(token,input as Parameters<Operations['rememberCustomer']>[1]);
  case 'saveSettingsBundle':return o.saveSettingsBundle(token,input as Parameters<Operations['saveSettingsBundle']>[1]);
  case 'savePaymentSettings':return o.savePaymentSettings(token,input.profile as Parameters<Operations['savePaymentSettings']>[1],Number(input.revision),input.value);
  case 'savePrintPreset':return o.savePrintPreset(token,String(input.name),input.appearance as Parameters<Operations['savePrintPreset']>[2]);
  case 'saveDocumentMetadata':return o.saveDocumentMetadata(token,String(input.documentId),Number(input.expectedRevision),input.values as Parameters<Operations['saveDocumentMetadata']>[3],String(input.reason));
  case 'explainDiagnostic':return new Recovery(o.s).explain(token,String(input.kind),String(input.id),String(input.reason));
  case 'approveStockIssue':return new StockReview(o.s).approveIssue(token,String(input.draftId),String(input.reason),input.options as Parameters<StockReview['approveIssue']>[3]);
  case 'previewStockPurchase':return new StockReview(o.s).previewPurchase(token,input.purchase as Parameters<StockReview['previewPurchase']>[1]);
  case 'approveStockPurchase':return new StockReview(o.s).approvePurchase(token,input.purchase as Parameters<StockReview['approvePurchase']>[1],String(input.reason));
  case 'decideMasterProposal':return new MasterProposals(o.s).decide(token,String(input.id),input.decision as 'accepted'|'rejected',String(input.reason));
  case 'allocateCustomerAdvance':return o.payments.allocateCustomerAdvance(token,input as unknown as Parameters<Operations['payments']['allocateCustomerAdvance']>[1]);
  case 'replaceCustomerAllocations':return o.payments.replaceCustomerAllocations(token,input as unknown as Parameters<Operations['payments']['replaceCustomerAllocations']>[1]);
  case 'allocateSupplierAdvance':return o.payments.allocateSupplierAdvance(token,input as unknown as Parameters<Operations['payments']['allocateSupplierAdvance']>[1]);
  case 'replaceSupplierAllocations':return o.payments.replaceSupplierAllocations(token,input as unknown as Parameters<Operations['payments']['replaceSupplierAllocations']>[1]);
  case 'reconcilePreview':return o.reconcilePreview(token,input.rows as Parameters<Operations['reconcilePreview']>[1]);
  case 'reconcileCommit':return o.reconcileCommit(token,String(input.id),input.rows as number[]);
  case 'saveSetting':return o.saveSetting(token,String(input.key),Number(input.revision),input.value);
  case 'requestApproval':return o.requestApproval(token,String(input.draftId));
  case 'decideApproval':return o.decideApproval(token,String(input.requestId),input.decision as 'approved'|'rejected',String(input.reason));
  case 'savePermissions':return o.savePermissions(token,input.role as 'Staff'|'Viewer',input.values as Record<string,boolean>);
  case 'updateUser':return o.updateUser(token,String(input.userId),input.user as Parameters<Operations['updateUser']>[2]);
  case 'unlockPeriod':return o.unlockPeriod(token,String(input.period),String(input.reason),String(input.reviewReference));
  case 'priceChanges':return new Insights(o.s).priceChanges(token,{supplierId:String(input.supplierId||''),lines:(input.lines||[]) as PurchaseLine[]});
  case 'whatsappReminder':return new Insights(o.s).whatsappReminder(token,String(input.partyId));
  case 'saveScan':return new Insights(o.s).saveScan(token,input as Parameters<Insights['saveScan']>[1]);
  case 'globalSearch':return new Insights(o.s).globalSearch(token,String(input.query||''));
  case 'reviewScan':return new Insights(o.s).reviewScan(token,input as Parameters<Insights['reviewScan']>[1]);
  case 'searchScans':return new Insights(o.s).searchScans(token,String(input.query||''));
  case 'scanDetail':return new Insights(o.s).scanDetail(token,String(input.id));
  case 'duplicate':return o.duplicate(token,String(input.id));
  case 'correction':return o.correction(token,String(input.id),input.type as 'CREDIT_NOTE'|'DEBIT_NOTE',String(input.reason));
  case 'convertChallan':return o.convertChallan(token,String(input.id));
  case 'adjustment':return o.adjustment(token,input as unknown as Parameters<Operations['adjustment']>[1]);
  case 'supplierPayment':return o.supplierPayment(token,input as unknown as Parameters<Operations['supplierPayment']>[1]);
  case 'stockAdjustment':return o.stockAdjustment(token,input as unknown as Parameters<Operations['stockAdjustment']>[1]);
  case 'purchaseReturn':return o.purchaseReturn(token,input as unknown as Parameters<Operations['purchaseReturn']>[1]);
  case 'closeAction':return o.closeAction(token,String(input.id),input.action as 'return'|'reopen',String(input.reason));
  case 'saveTaxRule':return o.saveTaxRule(token,input as unknown as Parameters<Operations['saveTaxRule']>[1]);
  case 'requestGstAmendment':return o.requestGstAmendment(token,input as unknown as Parameters<Operations['requestGstAmendment']>[1]);
  case 'gst':return o.gst(token,String(input.period));
  case 'saveFiling':return o.saveFiling(token,input as unknown as Parameters<Operations['saveFiling']>[1]);
  case 'import2B':return o.import2B(token,String(input.period),input.rows as Parameters<Operations['import2B']>[2],input.policy as Parameters<Operations['import2B']>[3]);
  case 'review2B':return o.review2B(token,String(input.importId),input.decisions,String(input.reason));
  default:throw Error('Operation is not allowlisted.');
 }
}
