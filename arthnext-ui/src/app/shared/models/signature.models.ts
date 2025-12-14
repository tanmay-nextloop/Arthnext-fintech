// signature.models.ts
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
  pageNumber: number | 'all'; // Support 'all' for all pages
  area: Rectangle;
  color: string;
  isAllPages?: boolean; // Flag to indicate if this applies to all pages
}

export interface ApiPayload {
  documentType: string;
  priority: string;
  pdfFile: File | null;
  signatures: SignatureArea[];
}

export interface SignerPayload {
  aadhaar: string;
  name: string;
  coordinates: { [page: string]: Rectangle };
  pages: (number | 'all')[];
}