export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface SignatureArea {
  signatureId: string;
  userId: string;
  userName: string;
  pageNumber: number;
  area: Rectangle;
  color: string;
}

export interface ApiPayload {
  documentType: string;
  priority: string;
  pdfFile: File | null;
  signatures: SignatureArea[];
}