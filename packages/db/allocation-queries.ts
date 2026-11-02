function alias(value:string):string {
 if(!/^[a-z][a-z0-9_]*$/.test(value))throw Error('Invalid internal SQL alias.');
 return value;
}
export function activeCustomerAllocation(name='a'):string {
 const a=alias(name);
 return `NOT EXISTS(SELECT 1 FROM allocation_reversals ar WHERE ar.allocation_id=${a}.id)
 AND NOT EXISTS(SELECT 1 FROM payment_events pe WHERE pe.payment_id=${a}.payment_id)`;
}
export function activeSupplierAllocation(name='a'):string {
 const a=alias(name);
 return `NOT EXISTS(SELECT 1 FROM supplier_allocation_reversals ar WHERE ar.allocation_id=${a}.id)
 AND NOT EXISTS(SELECT 1 FROM payment_events pe WHERE pe.payment_id=${a}.payment_id)`;
}
// The cutoff is bound as a parameter twice; it is never interpolated from renderer input.
export function customerAllocationAt(name='a'):string {
 const a=alias(name);
 return `EXISTS(SELECT 1 FROM allocation_history ah WHERE ah.direction='customer' AND ah.allocation_id=${a}.id AND ah.effective_date<=?)
 AND NOT EXISTS(SELECT 1 FROM allocation_reversals ar WHERE ar.allocation_id=${a}.id AND ar.effective_date<=?)
 AND NOT EXISTS(SELECT 1 FROM payment_events pe WHERE pe.payment_id=${a}.payment_id)`;
}
export function supplierAllocationAt(name='a'):string {
 const a=alias(name);
 return `EXISTS(SELECT 1 FROM allocation_history ah WHERE ah.direction='supplier' AND ah.allocation_id=${a}.id AND ah.effective_date<=?)
 AND NOT EXISTS(SELECT 1 FROM supplier_allocation_reversals ar WHERE ar.allocation_id=${a}.id AND ar.effective_date<=?)
 AND NOT EXISTS(SELECT 1 FROM payment_events pe WHERE pe.payment_id=${a}.payment_id)`;
}
