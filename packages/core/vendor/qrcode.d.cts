declare function qrcode(typeNumber:number,errorCorrectionLevel:string):{addData(data:string):void;make():void;createDataURL(cellSize?:number,margin?:number):string};
declare namespace qrcode { let stringToBytes:(data:string)=>number[]; const stringToBytesFuncs:Record<string,(data:string)=>number[]>; }
export = qrcode;
