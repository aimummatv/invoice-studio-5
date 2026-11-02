import test from 'node:test';
import assert from 'node:assert/strict';
import {previewField} from '../core/preview-fields.ts';

test('preview registry validates draft edits and excludes computed and unsafe fields',()=>{
 assert.equal(previewField('lines.0.quantity')!.validate('abc')!==null,true);
 assert.equal(previewField('lines.0.quantity')!.validate('0')!==null,true);
 assert.equal(previewField('lines.0.quantity')!.validate('18'),null);
 assert.equal(previewField('reverseCharge')!.validate('true'),null);
 assert.notEqual(previewField('reverseCharge')!.validate('yes'),null);
 assert.equal(previewField('placeOfSupply')!.validate('07'),null);
 assert.notEqual(previewField('placeOfSupply')!.validate('invalid'),null);
 for(const path of ['totals.total','number','__proto__.name','lines.0.total','customerId'])assert.equal(previewField(path),null);
});

test('company preview fields explicitly route to business settings rather than draft overrides',()=>{
 for(const key of ['logoData','brandName','name','address','gstin','pan','phone','bankName','upi','paymentTerms'])assert.equal(previewField(key,'business')!.scope,'business');
 assert.equal(previewField('gstin'),null);assert.equal(previewField('address')!.scope,'draft');assert.equal(previewField('shipTo')!.type,'textarea');
 assert.deepEqual(previewField('treatment')!.options,['domestic','exportLUT','exportTax','SEZLUT','SEZTax']);
});
