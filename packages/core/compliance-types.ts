export interface PresentationContext {demo?:{reference:string;qrPayload:string;irn:string;ackNo:string;ewayNumber:string;registrationDate?:string};
 irp?:{status:string;irn?:string;ackNo?:string;ackDate?:string;qr?:string;fingerprint?:string;message?:string};
 eway?:{status:string;number?:string;generated?:string;validUntil?:string;mode?:string;transporter?:string;vehicle?:string};
 originalTemplate?:string;
}
