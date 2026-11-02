export function syntheticGstin(state:string,index:number){const prefix=state+'ABCDE'+String(1000+index)+'F1Z',chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';let total=0,factor=2;for(let i=13;i>=0;i--){const n=chars.indexOf(prefix[i]!)*factor;total+=Math.floor(n/36)+n%36;factor=factor===2?1:2;}return prefix+chars[(36-total%36)%36];}
export const syntheticPartnerDocument=[...['07','09','19','27'].map((state,i)=>`${i+1}. Example Customer ${i+1}
Company Name: Example Customer ${i+1}
GSTIN: ${syntheticGstin(state,i+1)}
Mobile Number: 900000000${i+1}
Billing Address:
${i+1}, Example Street,, Fictional District,
Example City ${110001+i}
State: Example state
State Code: ${state}
`),`Example Business
Account Holder: EXAMPLE BUSINESS
Account Number: 00000000000001
IFSC Code: TEST0BRANCH0
Bank Name: Example Bank
Branch: Example Branch
Account Type: Current A/c
Legal Business Name: Example Business
GSTIN: ${syntheticGstin('07',0)}
PAN: ABCDE1000F
FSSAI Registration: 00000000000000
Business Type: Partnership
GST Registration Date: 28/04/2026
PAN Formation Date: 17/02/2026
FSSAI Fee Paid Upto: 15-05-2029
Registered Address: 10 Example Lane,, Example City - 110001
`].join('\n');
